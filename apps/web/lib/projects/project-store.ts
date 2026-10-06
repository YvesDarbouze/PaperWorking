/**
 * Authoritative Server-side Project Persistence Store.
 *
 * Implements persistent Google Cloud Firestore storage for REIL Project Workspaces
 * under the `projects/{projectId}` collection, with automatic fallback and seed bootstrapping
 * for offline and testing environments.
 */

import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import type { ProjectWorkspace, ProjectSummary } from './types';
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
    memoryProjectsCache.set(p.id, p);
    if (p.project_id) memoryProjectsCache.set(p.project_id, p);
  }
}

/**
 * Normalizes a raw Firestore or seed document to a complete ProjectWorkspace.
 */
function normalizeWorkspace(docId: string, data: Record<string, unknown>): ProjectWorkspace {
  const purchasePrice = Number(data.purchasePrice ?? data.purchase_price ?? 485000);
  const rehabCosts = Number(data.rehab_costs ?? data.rehabCost ?? 65000);

  return {
    id: docId,
    project_id: (data.project_id as string) || docId,
    organizationId: (data.organizationId as string) || 'org-1',
    propertyName: (data.propertyName as string) || (data.name as string) || (data.property_address as string) || 'Project Workspace',
    property_address: (data.property_address as string) || (data.address as string) || 'Austin, TX',
    address: (data.address as string) || (data.property_address as string) || 'Austin, TX',
    city: (data.city as string) || 'Austin',
    state: (data.state as string) || 'TX',
    zip: (data.zip as string) || '78702',
    currentPhase: (data.currentPhase as any) || (data.phase as any) || 'acquisition',
    phase: (data.phase as any) || (data.currentPhase as any) || 'acquisition',
    status: (data.status as string) || 'Active',
    phase_completion_pct: Number(data.phase_completion_pct ?? data.phaseCompletionPct ?? 35),
    phaseCompletionPct: Number(data.phaseCompletionPct ?? data.phase_completion_pct ?? 35),
    purchasePrice,
    purchase_price: purchasePrice,
    rehab_costs: rehabCosts,
    exit_strategy: (data.exit_strategy as string) || (data.exitStrategy as string) || 'Fix & Flip',
    dispositionType: (data.dispositionType as any) || 'SALE',
    entity_type: (data.entity_type as string) || 'LLC',
    storage_used_bytes: Number(data.storage_used_bytes ?? 2480000),
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
    ...data,
  } as ProjectWorkspace;
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
      const docSnap = await db.collection('projects').doc(projectId).get();

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

      const snap = await queryRef.get();
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
      await db
        .collection('projects')
        .doc(workspace.id)
        .set({
          ...workspace,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
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
      await db
        .collection('projects')
        .doc(projectId)
        .set(
          {
            ...patch,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
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
