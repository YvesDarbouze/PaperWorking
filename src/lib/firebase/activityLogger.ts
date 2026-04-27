import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/* ═══════════════════════════════════════════════════════
   Activity Logger — Firestore Event Writer

   Writes events to organizations/{orgId}/activity.
   Designed to be called inside existing mutation
   functions as part of a batch write.
   ═══════════════════════════════════════════════════════ */

export type ActivityType =
  | 'deal_created'
  | 'phase_change'
  | 'ledger_item'
  | 'member_joined'
  | 'deal_sold';

export interface LogActivityParams {
  organizationId: string;
  type: ActivityType;
  actorName: string;
  actorUid: string;
  description: string;
  projectName?: string;
  projectId?: string;
}

/**
 * Standalone activity log write (for simple mutations).
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const activityRef = collection(db, 'organizations', params.organizationId, 'activity');
    const newDoc = doc(activityRef);
    const batch = writeBatch(db);

    batch.set(newDoc, {
      type: params.type,
      actorName: params.actorName,
      actorUid: params.actorUid,
      description: params.description,
      projectName: params.projectName || null,
      projectId: params.projectId || null,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    // Non-fatal: activity logging should never block the primary mutation
    console.error('[logActivity] Failed to write activity event:', error);
  }
}

/**
 * Returns batch-compatible activity document data for use inside
 * existing writeBatch() calls. The caller adds it to their batch.
 *
 * Usage:
 *   const batch = writeBatch(db);
 *   batch.set(projectRef, projectData);
 *   addActivityToBatch(batch, { organizationId, ... });
 *   await batch.commit();
 */
export function addActivityToBatch(
  batch: ReturnType<typeof writeBatch>,
  params: LogActivityParams,
): void {
  const activityRef = collection(db, 'organizations', params.organizationId, 'activity');
  const newDoc = doc(activityRef);

  batch.set(newDoc, {
    type: params.type,
    actorName: params.actorName,
    actorUid: params.actorUid,
    description: params.description,
    projectName: params.projectName || null,
    projectId: params.projectId || null,
    createdAt: serverTimestamp(),
  });
}
