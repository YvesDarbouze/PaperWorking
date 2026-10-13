/**
 * Authoritative Server-side Project Persistence Store.
 *
 * Implements persistent Google Cloud Firestore storage for REIL Project Workspaces
 * under the `projects/{projectId}` collection, with automatic fallback and seed bootstrapping
 * for offline and testing environments.
 */

import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import type {
  ProjectWorkspace,
  ProjectSummary,
  AcquisitionTask,
  ProjectTaskList,
  LegacyProjectTaskGroup,
} from './types';
import {
  SEED_PROJECTS,
  getSeedProjectById,
  seedProjectsForApiList,
  addSeedProject,
  updateSeedProject,
  deleteSeedProject,
} from './seed-data';

// Server-side in-memory cache keyed across hot-reloads via globalThis
declare global {
  // eslint-disable-next-line no-var
  var __pw_projects_cache: Map<string, ProjectWorkspace> | undefined;
}

const memoryProjectsCache: Map<string, ProjectWorkspace> =
  globalThis.__pw_projects_cache ?? (globalThis.__pw_projects_cache = new Map<string, ProjectWorkspace>());

// Initialize memory cache from seed if empty
if (memoryProjectsCache.size === 0) {
  for (const p of SEED_PROJECTS) {
    const normalized = normalizeWorkspace(p.id, p as unknown as Record<string, unknown>);
    memoryProjectsCache.set(p.id, normalized);
    if (p.project_id) memoryProjectsCache.set(p.project_id, normalized);
  }
}

// An unreachable Firestore (e.g. emulator configured but not running) makes the
// client retry indefinitely. Calls are bounded so callers reach the existing
// cache/seed fallback instead of hanging the request.
export const FIRESTORE_READ_TIMEOUT_MS = Number(process.env.FIRESTORE_READ_TIMEOUT_MS ?? 800);
export const FIRESTORE_WRITE_TIMEOUT_MS = Number(process.env.FIRESTORE_WRITE_TIMEOUT_MS ?? 1500);

export function withFirestoreTimeout<T>(
  promise: Promise<T>,
  label: string,
  timeoutMs: number = FIRESTORE_READ_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Firestore ${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Normalizes a raw Firestore or seed document to a complete ProjectWorkspace.
 */
function normalizeWorkspace(docId: string, data: Record<string, unknown>): ProjectWorkspace {
  const purchasePrice = Number(data.purchasePrice ?? data.purchase_price ?? 485000);
  const rehabCosts = Number(data.rehab_costs ?? data.rehabCost ?? 65000);

  const rawTasks = (data.tasks as any[]) || [];
  const totalTasks = rawTasks.length;
  const completedTasks = rawTasks.filter((t) => t.status === 'complete').length;
  const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const phaseCompletion = Number(
    data.phase_completion_pct ?? data.phaseCompletionPct ?? (totalTasks > 0 ? computedProgress : 0)
  );

  const workspace = {
    id: docId,
    project_id: (data.project_id as string) || docId,
    organizationId: (data.organizationId as string) || 'org-1',
    propertyName: (data.propertyName as string) || (data.name as string) || (data.property_address as string) || 'Project Workspace',
    property_address: (data.property_address as string) || (data.address as string) || '',
    address: (data.address as string) || (data.property_address as string) || '',
    city: (data.city as string) || '',
    state: (data.state as string) || '',
    zip: (data.zip as string) || '',
    currentPhase: (data.currentPhase as any) || (data.phase as any) || 'acquisition',
    phase: (data.phase as any) || (data.currentPhase as any) || 'acquisition',
    status: (data.status as string) || 'Active',
    phase_completion_pct: phaseCompletion,
    phaseCompletionPct: phaseCompletion,
    purchasePrice,
    purchase_price: purchasePrice,
    rehab_costs: rehabCosts,
    exit_strategy: (data.exit_strategy as string) || (data.exitStrategy as string) || 'Fix & Flip',
    dispositionType: (data.dispositionType as any) || 'SALE',
    entity_type: (data.entity_type as string) || 'LLC',
    storage_used_bytes: Number(data.storage_used_bytes ?? 0),
    storageQuotaBytes: Number(data.storageQuotaBytes ?? 536870912),
    ianaTimezone: (data.ianaTimezone as string) || 'America/Chicago',
    dealId: (data.dealId as string) || null,
    dealSlug: (data.dealSlug as string) || null,
    dealAddress: (data.dealAddress as string) || null,
    todos: (data.todos as any[]) || [],
    tasks: (data.tasks as any[]) || [],
    documents: (data.documents as any[]) || [],
    acquisition: (data.acquisition as any) || null,
    funding: (data.funding as any) || null,
    hold: (data.hold as any) || null,
    exit: (data.exit as any) || null,
    underwriting: (data.underwriting as any) || null,
    messageTopics: [],
    campfireMessages: [],
    checkInQuestions: [],
    taskLists: [],
    cardColumns: [],
    hillChartItems: [],
    scheduleEvents: [],
    vendorAccess: [],
    activity: [],
    publicShareLinks: [],
    ...data,
  } as ProjectWorkspace & { taskGroups?: unknown };

  const migrated = migrateLegacyTaskGroups(docId, workspace, data.taskGroups);
  workspace.tasks = migrated.tasks;
  workspace.taskLists = migrated.taskLists;
  delete (workspace as unknown as Record<string, unknown>).taskGroups;

  return workspace;
}

/**
 * Converts the pre-unification `taskGroups` store into `taskLists` + `tasks`.
 * Idempotent: lists and tasks whose ids already exist are skipped, so it is
 * safe to run on every read until the legacy field is removed from storage.
 */
export function migrateLegacyTaskGroups(
  projectId: string,
  workspace: Pick<ProjectWorkspace, 'tasks' | 'taskLists' | 'currentPhase'>,
  legacyGroups: unknown,
): { tasks: AcquisitionTask[]; taskLists: ProjectTaskList[] } {
  const tasks: AcquisitionTask[] = Array.isArray(workspace.tasks) ? [...workspace.tasks] : [];
  const taskLists: ProjectTaskList[] = Array.isArray(workspace.taskLists) ? [...workspace.taskLists] : [];
  if (!Array.isArray(legacyGroups) || legacyGroups.length === 0) return { tasks, taskLists };

  const taskIds = new Set(tasks.map((t) => t.id));
  const listIds = new Set(taskLists.map((l) => l.id));

  for (const group of legacyGroups as LegacyProjectTaskGroup[]) {
    if (!group || typeof group.id !== 'string') continue;
    const phase = group.phase ?? workspace.currentPhase ?? 'acquisition';
    if (!listIds.has(group.id)) {
      taskLists.push({ id: group.id, title: group.title || 'To-do list', phase });
      listIds.add(group.id);
    }
    for (const legacy of group.tasks ?? []) {
      if (!legacy || typeof legacy.id !== 'string' || taskIds.has(legacy.id)) continue;
      const assigneeUid = legacy.assignee?.uid ?? legacy.assignee?.id;
      tasks.push({
        id: legacy.id,
        projectId,
        title: legacy.title,
        listId: group.id,
        ...(legacy.dueDate ? { dueDate: legacy.dueDate } : {}),
        status: legacy.completed ? 'complete' : 'pending',
        isAutoGenerated: false,
        ...(assigneeUid ? { assigneeUid, assigneeName: legacy.assignee?.name } : {}),
        ...(legacy.notes ? { notes: legacy.notes } : {}),
        vendorVisible: Boolean(legacy.vendorVisible),
        subtasks: (legacy.subtasks ?? []).map((s) => ({ id: s.id, title: s.title, completed: Boolean(s.completed) })),
        phase,
      });
      taskIds.add(legacy.id);
    }
  }
  return { tasks, taskLists };
}

/**
 * Retrieves a single project by ID.
 * Queries Firestore first; if missing in Firestore, checks seed data and bootstraps to Firestore.
 */
export async function getProjectFromStore(projectId: string): Promise<ProjectWorkspace | null> {
  if (!projectId) return null;

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const docSnap = await withFirestoreTimeout(db.collection('projects').doc(projectId).get(), `read projects/${projectId}`);

      if (docSnap.exists) {
        const workspace = normalizeWorkspace(docSnap.id, docSnap.data() as Record<string, unknown>);
        memoryProjectsCache.set(projectId, workspace);
        return workspace;
      }

      // If document does not exist yet in Firestore, check local seed data to bootstrap
      const seed = getSeedProjectById(projectId);
      if (seed) {
        const workspace = normalizeWorkspace(projectId, seed as unknown as Record<string, unknown>);
        // Asynchronously bootstrap to Firestore so future reads are backed by Firestore
        db.collection('projects')
          .doc(projectId)
          .set(
            {
              ...workspace,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          )
          .catch((err) => {
            console.warn(`[project-store] Non-fatal seed bootstrap warning for ${projectId}:`, err?.message || err);
          });

        memoryProjectsCache.set(projectId, workspace);
        return workspace;
      }
    } catch (err: any) {
      console.warn(`[project-store] Firestore read failed for ${projectId}, falling back to cache:`, err?.message || err);
    }
  }

  // Fallback to cache / seed data
  if (memoryProjectsCache.has(projectId)) {
    return memoryProjectsCache.get(projectId)!;
  }
  const seed = getSeedProjectById(projectId);
  if (seed) {
    const ws = normalizeWorkspace(projectId, seed as unknown as Record<string, unknown>);
    memoryProjectsCache.set(projectId, ws);
    return ws;
  }

  return null;
}

/**
 * Lists projects for a given organization with optional search query filter.
 */
export async function listProjectsFromStore(
  organizationId: string = 'org-1',
  query?: string,
): Promise<ProjectWorkspace[]> {
  const filterQuery = (list: ProjectWorkspace[]): ProjectWorkspace[] => {
    if (!query || !query.trim()) return list;
    const q = query.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.propertyName?.toLowerCase().includes(q) ||
        p.address?.toLowerCase().includes(q) ||
        p.property_address?.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q),
    );
  };

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      let queryRef: FirebaseFirestore.Query = db.collection('projects');
      if (organizationId) {
        queryRef = queryRef.where('organizationId', '==', organizationId);
      }

      const snap = await withFirestoreTimeout(queryRef.get(), 'list projects');
      if (!snap.empty) {
        const projects = snap.docs.map((d) => normalizeWorkspace(d.id, d.data()));
        for (const p of projects) {
          memoryProjectsCache.set(p.id, p);
        }
        return filterQuery(projects);
      }

      // If Firestore is empty for this org, bootstrap seed projects for org-1
      if (organizationId === 'org-1' || !organizationId) {
        const seedList = seedProjectsForApiList();
        const batch = db.batch();
        for (const s of seedList) {
          const docId = String(s.id);
          const ws = normalizeWorkspace(docId, s as unknown as Record<string, unknown>);
          const docRef = db.collection('projects').doc(docId);
          batch.set(docRef, { ...ws, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
          memoryProjectsCache.set(docId, ws);
        }
        batch.commit().catch((err) => {
          console.warn('[project-store] Non-fatal batch seed commit warning:', err?.message || err);
        });
        return filterQuery(seedList.map((s) => normalizeWorkspace(String(s.id), s as any)));
      }
    } catch (err: any) {
      console.warn('[project-store] Firestore list failed, falling back to cache:', err?.message || err);
    }
  }

  // Fallback to cache / seed data
  const allCached = Array.from(memoryProjectsCache.values());
  const orgFiltered = allCached.filter((p) => (p.organizationId || 'org-1') === organizationId);
  return filterQuery(orgFiltered);
}

/**
 * Creates and persists a new Project in Firestore and memory cache.
 */
export async function createProjectInStore(
  payload: Partial<ProjectWorkspace> & { id: string; organizationId?: string; property_address: string },
): Promise<ProjectWorkspace> {
  const workspace = normalizeWorkspace(payload.id, payload as Record<string, unknown>);

  memoryProjectsCache.set(workspace.id, workspace);
  addSeedProject(workspace);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      await withFirestoreTimeout(
        db
          .collection('projects')
          .doc(workspace.id)
          .set({
            ...workspace,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          }),
        `write projects/${workspace.id}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.error(`[project-store] Failed to write project ${workspace.id} to Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to create project in Firestore (${err?.message || 'timeout'})`);
      }
    }
  }

  return workspace;
}

/**
 * Updates an existing project in Firestore and memory cache.
 */
export async function updateProjectInStore(
  projectId: string,
  patch: Partial<ProjectWorkspace>,
): Promise<ProjectWorkspace | null> {
  const existing = await getProjectFromStore(projectId);
  if (!existing) return null;

  const merged = normalizeWorkspace(projectId, {
    ...existing,
    ...patch,
  });

  memoryProjectsCache.set(projectId, merged);
  updateSeedProject(projectId, patch);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const { FieldValue } = await import('firebase-admin/firestore');
      const touchesTodos = 'tasks' in patch || 'taskLists' in patch;
      await withFirestoreTimeout(
        db
          .collection('projects')
          .doc(projectId)
          .set(
            {
              ...patch,
              ...(touchesTodos
                ? { tasks: merged.tasks, taskLists: merged.taskLists, taskGroups: FieldValue.delete() }
                : {}),
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          ),
        `write projects/${projectId}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.error(`[project-store] Failed to update project ${projectId} in Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to update project in Firestore (${err?.message || 'timeout'})`);
      }
    }
  }

  return merged;
}

/**
 * Deletes a project from Firestore and memory cache.
 */
export async function deleteProjectInStore(projectId: string): Promise<boolean> {
  memoryProjectsCache.delete(projectId);
  deleteSeedProject(projectId);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      await db.collection('projects').doc(projectId).delete();
      return true;
    } catch (err: any) {
      console.error(`[project-store] Failed to delete project ${projectId} in Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to delete project in Firestore (${err?.message || 'timeout'})`);
      }
      return false;
    }
  }

  return true;
}

/**
 * Counts total projects for an organization.
 */
export async function countProjectsInStore(organizationId: string = 'org-1'): Promise<number> {
  const projects = await listProjectsFromStore(organizationId);
  return projects.length;
}

/**
 * Returns all active projects across all organizations (for background sweep/cron tasks).
 */
export async function getAllProjectsAcrossStore(): Promise<ProjectWorkspace[]> {
  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const snap = await withFirestoreTimeout(db.collection('projects').get(), 'get all projects');
      if (!snap.empty) {
        return snap.docs.map((d) => normalizeWorkspace(d.id, d.data()));
      }
    } catch (err: any) {
      console.warn('[project-store] Firestore scan failed, falling back to cache:', err?.message || err);
    }
  }
  return Array.from(memoryProjectsCache.values());
}
