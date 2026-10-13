import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';
import { FIRESTORE_WRITE_TIMEOUT_MS, withFirestoreTimeout } from './project-store';
import type { ProjectStack } from './types';

const STACKS_COLLECTION = 'projectStacks';

declare global {
  // eslint-disable-next-line no-var
  var __pw_project_stacks_by_org: Map<string, ProjectStack[]> | undefined;
}

/** Fallback when Firestore is unavailable; keyed by organization so orgs never share a list. */
const memoryStacksByOrg: Map<string, ProjectStack[]> =
  globalThis.__pw_project_stacks_by_org ?? (globalThis.__pw_project_stacks_by_org = new Map());

function memoryList(organizationId: string): ProjectStack[] {
  return memoryStacksByOrg.get(organizationId) ?? [];
}

export async function listStacksForOrg(organizationId: string): Promise<ProjectStack[]> {
  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      const snap = await withFirestoreTimeout(
        db.collection(STACKS_COLLECTION).where('organizationId', '==', organizationId).get(),
        `list ${STACKS_COLLECTION}`,
      );
      const stacks = snap.docs.map((d) => ({ ...(d.data() as ProjectStack), id: d.id }));
      memoryStacksByOrg.set(organizationId, stacks);
      return stacks;
    } catch (err: any) {
      console.warn('[stack-store] Firestore list failed, using in-memory stacks:', err?.message || err);
    }
  }
  return memoryList(organizationId);
}

export async function createStackForOrg(organizationId: string, stack: ProjectStack): Promise<ProjectStack> {
  const record: ProjectStack = { ...stack, organizationId };
  memoryStacksByOrg.set(organizationId, [...memoryList(organizationId), record]);

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      await withFirestoreTimeout(
        db.collection(STACKS_COLLECTION).doc(record.id).set(record),
        `write ${STACKS_COLLECTION}/${record.id}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.error(`[stack-store] Failed to write stack ${record.id} to Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to create project stack (${err?.message || 'timeout'})`);
      }
    }
  }
  return record;
}

export async function deleteStackForOrg(organizationId: string, stackId: string): Promise<boolean> {
  const current = memoryList(organizationId);
  const exists = current.some((s) => s.id === stackId);
  if (!exists) return false;

  memoryStacksByOrg.set(
    organizationId,
    current.filter((s) => s.id !== stackId),
  );

  if (shouldAttemptFirestore()) {
    try {
      const db = getAdminFirestore();
      await withFirestoreTimeout(
        db.collection(STACKS_COLLECTION).doc(stackId).delete(),
        `delete ${STACKS_COLLECTION}/${stackId}`,
        FIRESTORE_WRITE_TIMEOUT_MS,
      );
    } catch (err: any) {
      console.error(`[stack-store] Failed to delete stack ${stackId} from Firestore:`, err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Database persistence failure: unable to delete project stack (${err?.message || 'timeout'})`);
      }
    }
  }
  return true;
}
