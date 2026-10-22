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

const NESTED_ARRAY_MARKER = '__pw_matrix';

/**
 * Firestore rejects nested arrays, undefined values, and non-finite numbers.
 * Encodes nested arrays as `{ __pw_matrix: true, rows: [{ cells: [...] }, ...] }`
 * so the document write always succeeds; fromFirestoreSafe decodes on read.
 */
export function toFirestoreSafe<T>(value: T): T {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return null as unknown as T;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .filter((item) => item !== undefined)
      .map((item) => toFirestoreSafe(item));
    if (cleaned.some((item) => Array.isArray(item))) {
      return {
        [NESTED_ARRAY_MARKER]: true,
        rows: cleaned.map((row) => (Array.isArray(row) ? { cells: row } : { value: row })),
      } as unknown as T;
    }
    return cleaned as unknown as T;
  }
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = toFirestoreSafe(v);
      }
    }
    return out as T;
  }
  return value;
}

/** Reverses toFirestoreSafe so readers receive the original nested-array shapes. */
export function fromFirestoreSafe<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => fromFirestoreSafe(item)) as unknown as T;
  }
  const obj = value as Record<string, unknown>;
  if (obj[NESTED_ARRAY_MARKER] === true && Array.isArray(obj.rows)) {
    return (obj.rows as unknown[]).map((row) => {
      const r = row as { cells?: unknown; value?: unknown };
      if (Array.isArray(r?.cells)) return fromFirestoreSafe(r.cells);
      return fromFirestoreSafe(r?.value);
    }) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = fromFirestoreSafe(v);
  }
  return out as T;
}

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

function resolveFiniteNumber(candidates: unknown[], fallback: number): number {
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === '') continue;
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === 'string') {
      const cleaned = candidate.replace(/[$,\s]/g, '');
      if (cleaned !== '') {
        const parsed = Number(cleaned);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  return fallback;
}

export function isInternalMetadataValidationNoise(value: unknown): boolean {
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    return (
      upper.includes('UNEXPECTED_KEY') ||
      upper.includes('METADATA_UNKNOWN_JSON') ||
      upper.includes('STAGE WIRE VALIDATION') ||
      upper.includes('UNRECOGNIZED_KEYS')
    );
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (isInternalMetadataValidationNoise(k) || isInternalMetadataValidationNoise(v)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Normalizes a raw Firestore or seed document to a complete ProjectWorkspace.
 */
function normalizeWorkspace(docId: string, rawInputData: Record<string, unknown>): ProjectWorkspace {
  const decodedInput = fromFirestoreSafe(rawInputData) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(decodedInput || {})) {
    if (
      k.startsWith('__metadata') ||
      k.startsWith('UNEXPECTED_KEY') ||
      isInternalMetadataValidationNoise(k)
    ) {
      continue;
    }
    data[k] = v;
  }
  if (Array.isArray(data.contingencies)) {
    data.contingencies = (data.contingencies as Array<Record<string, unknown>>).filter(
      (c) =>
        !isInternalMetadataValidationNoise(c?.name) &&
        !isInternalMetadataValidationNoise(c?.label) &&
        !isInternalMetadataValidationNoise(c?.type) &&
        !isInternalMetadataValidationNoise(c?.id),
    );
  }
  if (
    data.deadRecord &&
    typeof data.deadRecord === 'object' &&
    isInternalMetadataValidationNoise(data.deadRecord)
  ) {
    delete data.deadRecord;
    data.isArchived = false;
    if (data.acquisitionStatus === 'dead') {
      data.acquisitionStatus = 'lead';
    }
  }
  if (isInternalMetadataValidationNoise(data.error)) {
    delete data.error;
  }
  if (isInternalMetadataValidationNoise(data.validationError)) {
    delete data.validationError;
  }

  const snapshotInputs = (data.underwritingSnapshot as any)?.inputs;
  const underwritingAcq = (data.underwriting as any)?.acquisition;
  const downstreamHoldBudget = (data.downstreamSeeding as any)?.hold?.budget?.allocatedTotal;

  const purchasePrice = resolveFiniteNumber(
    [
      data.purchasePrice,
      data.purchase_price,
      snapshotInputs?.purchasePrice,
      underwritingAcq?.purchasePrice,
    ],
    485000,
  );
  const rehabCosts = resolveFiniteNumber(
    [
      data.rehab_costs,
      data.rehabBudget,
      data.rehab_budget,
      data.rehabCost,
      snapshotInputs?.rehabBudget,
      downstreamHoldBudget,
      underwritingAcq?.rehabBudget,
    ],
    65000,
  );
  const explicitEstimatedArv = resolveFiniteNumber(
    [
      data.estimatedARV,
      data.estimated_arv,
      data.estimatedExitValue,
      snapshotInputs?.estimatedARV,
      (data.underwritingSnapshot as any)?.outputs?.estimatedExitValue,
      underwritingAcq?.estimatedARV,
      (data.underwriting as any)?.exit?.estimatedArv,
    ],
    0,
  );
  const resolvedEstimatedArv =
    explicitEstimatedArv > 0
      ? explicitEstimatedArv
      : purchasePrice > 0
        ? Math.round((purchasePrice + Math.max(0, rehabCosts)) * 1.3)
        : 650000;
  const normalizedSnapshot =
    data.underwritingSnapshot && typeof data.underwritingSnapshot === 'object'
      ? {
          ...(data.underwritingSnapshot as Record<string, unknown>),
          inputs: {
            ...(snapshotInputs && typeof snapshotInputs === 'object' ? snapshotInputs : {}),
            purchasePrice: resolveFiniteNumber([snapshotInputs?.purchasePrice], purchasePrice),
            rehabBudget: resolveFiniteNumber([snapshotInputs?.rehabBudget], rehabCosts),
            estimatedARV:
              resolveFiniteNumber([snapshotInputs?.estimatedARV], 0) > 0
                ? resolveFiniteNumber([snapshotInputs?.estimatedARV], resolvedEstimatedArv)
                : resolvedEstimatedArv,
          },
        }
      : undefined;

  const rawTasks = (data.tasks as any[]) || [];
  const totalTasks = rawTasks.length;
  const completedTasks = rawTasks.filter((t) => t.status === 'complete').length;
  const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const phaseCompletion = resolveFiniteNumber(
    [data.phase_completion_pct, data.phaseCompletionPct],
    totalTasks > 0 ? computedProgress : 0,
  );

  const workspace = {
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
    rehabBudget: rehabCosts,
    estimatedARV: resolvedEstimatedArv,
    estimatedExitValue:
      explicitEstimatedArv > 0
        ? explicitEstimatedArv
        : data.estimatedExitValue === null
          ? resolvedEstimatedArv
          : resolvedEstimatedArv,
    ...(normalizedSnapshot ? { underwritingSnapshot: normalizedSnapshot } : {}),
    exit_strategy: (data.exit_strategy as string) || (data.exitStrategy as string) || 'Fix & Flip',
    dispositionType: (data.dispositionType as any) || 'SALE',
    entity_type: (data.entity_type as string) || 'LLC',
    storage_used_bytes: resolveFiniteNumber([data.storage_used_bytes], 0),
    storageQuotaBytes: resolveFiniteNumber([data.storageQuotaBytes], 536870912),
    ianaTimezone: (data.ianaTimezone as string) || 'America/Chicago',
    dealId: (data.dealId as string) || null,
    dealSlug: (data.dealSlug as string) || null,
    dealAddress: (data.dealAddress as string) || null,
    todos: Array.isArray(data.todos) ? (data.todos as any[]) : [],
    tasks: Array.isArray(data.tasks) ? (data.tasks as any[]) : [],
    documents: Array.isArray(data.documents) ? (data.documents as any[]) : [],
    acquisition: (data.acquisition as any) || null,
    funding: (data.funding as any) || null,
    hold: (data.hold as any) || null,
    exit: (data.exit as any) || null,
    underwriting: (data.underwriting as any) || null,
  } as ProjectWorkspace & { taskGroups?: unknown; rehabBudget?: number };

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
        const cached = memoryProjectsCache.get(projectId);
        const rawData = docSnap.data() as Record<string, unknown>;
        const mergedRaw: Record<string, unknown> = cached ? { ...cached, ...rawData } : { ...rawData };
        if (!mergedRaw.underwritingSnapshot && cached?.underwritingSnapshot) {
          mergedRaw.underwritingSnapshot = cached.underwritingSnapshot;
        }
        const workspace = normalizeWorkspace(docSnap.id, mergedRaw);
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
            toFirestoreSafe({
              ...workspace,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
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
    const sanitized = list.filter(
      (p) =>
        !isInternalMetadataValidationNoise(p.id) &&
        !isInternalMetadataValidationNoise(p.propertyName) &&
        !isInternalMetadataValidationNoise(p.address) &&
        !isInternalMetadataValidationNoise(p.property_address),
    );
    if (!query || !query.trim()) return sanitized;
    const q = query.trim().toLowerCase();
    return sanitized.filter(
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
      const firestorePayload = toFirestoreSafe({
        ...workspace,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await withFirestoreTimeout(
        db
          .collection('projects')
          .doc(workspace.id)
          .set(firestorePayload),
        `write projects/${workspace.id}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.warn(`[project-store] Firestore write failed for ${workspace.id}, falling back to cache:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `Database persistence failure: unable to write project ${workspace.id} (${err?.message || 'unknown'}). Please retry.`,
        );
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
      const firestorePatch = toFirestoreSafe({
        ...patch,
        purchasePrice: merged.purchasePrice,
        purchase_price: merged.purchase_price,
        rehab_costs: merged.rehab_costs,
        rehabBudget: (merged as any).rehabBudget ?? merged.rehab_costs,
        estimatedExitValue: merged.estimatedExitValue ?? null,
        estimatedARV: (merged as any).estimatedARV ?? merged.estimatedExitValue ?? null,
        ...(merged.underwritingSnapshot ? { underwritingSnapshot: merged.underwritingSnapshot } : {}),
        ...(touchesTodos
          ? { tasks: merged.tasks, taskLists: merged.taskLists, taskGroups: FieldValue.delete() }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await withFirestoreTimeout(
        db
          .collection('projects')
          .doc(projectId)
          .set(
            firestorePatch,
            { merge: true },
          ),
        `write projects/${projectId}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.warn(`[project-store] Firestore update failed for ${projectId}, falling back to cache:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          `Database persistence failure: unable to update project ${projectId} (${err?.message || 'unknown'}). Please retry.`,
        );
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
      await withFirestoreTimeout(
        db.collection('projects').doc(projectId).delete(),
        `delete projects/${projectId}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
      return true;
    } catch (err: any) {
      console.warn(`[project-store] Firestore delete failed for ${projectId}, falling back to cache:`, err?.message || err);
      return true;
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
