import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { deepDiff } from '@/lib/utils/deepDiff';
import { writeActivityLog } from './activityLogWriter';
import { writeMetricSnapshots } from './snapshotWriter';

/* ═══════════════════════════════════════════════════════
   Project Write Wrapper — Tracked Updates

   Wraps a Firestore project update with automatic:
     1. Before/after diffing
     2. Activity log append (audit trail)
     3. Metric snapshot recomputation

   Use this wrapper instead of raw Firestore writes when
   you need audit + snapshot side effects. For high-
   frequency writes where the overhead isn't wanted (e.g.
   real-time field edits in the UI), use the underlying
   Firestore write directly and batch the snapshot/log
   via the nightly cron.

   IMPORTANT: This runs server-side only (uses firebase-admin).
   ═══════════════════════════════════════════════════════ */

export interface ProjectWriteResult {
  success: boolean;
  changesDetected: number;
  snapshotWritten: boolean;
}

/**
 * Wraps a project update with automatic snapshot and audit log writes.
 *
 * Flow:
 *   1. Read current project document (before state)
 *   2. Apply updates to Firestore
 *   3. Diff before/after to get changed fields
 *   4. Call writeActivityLog with the changes
 *   5. Call writeMetricSnapshots with the updated project
 *
 * @param projectId  The Firestore project document ID
 * @param userId     The UID of the user making the change
 * @param updates    Partial update payload (same shape as updateDoc)
 * @param source     How the change originated
 * @returns          Summary of what happened
 */
export async function updateProjectWithTracking(
  projectId: string,
  userId: string,
  updates: Record<string, any>,
  source: 'manual' | 'vendor' | 'system' = 'manual'
): Promise<ProjectWriteResult> {
  const projectRef = adminDb.collection('projects').doc(projectId);

  // 1. Read the current state (before)
  const beforeSnap = await projectRef.get();
  if (!beforeSnap.exists) {
    throw new Error(`Project ${projectId} not found`);
  }
  const beforeData = beforeSnap.data()!;

  // 2. Apply the update to Firestore
  await projectRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 3. Compute the "after" state by merging locally
  //    (avoids a second read — the only difference is our updates + updatedAt)
  const afterData = mergeUpdates(beforeData, updates);

  // 4. Diff before/after
  const changes = deepDiff(beforeData, afterData);

  // 5. Write activity log (non-blocking — errors are logged but don't fail the update)
  const logPromise = writeActivityLog(projectId, userId, changes, source).catch(
    (err) => {
      console.error(`[ProjectWriteWrapper] Activity log write failed for ${projectId}:`, err?.message);
    }
  );

  // 5b. Write timeline edit activity
  let timelinePromise = Promise.resolve();
  if (changes.length > 0) {
    const { trackDealActivity } = require('@/lib/invitations/activityTimeline');
    const fieldsChanged = changes.map((c: any) => c.fieldPath).join(', ');
    timelinePromise = trackDealActivity(
      projectId,
      projectId,
      userId,
      'edit',
      { editSummary: `Updated fields: ${fieldsChanged}` }
    ).catch((err: any) => {
      console.error(`[ProjectWriteWrapper] Timeline edit write failed for ${projectId}:`, err?.message);
    });
  }

  // 6. Write metric snapshots (non-blocking)
  let snapshotWritten = false;
  const snapshotPromise = writeMetricSnapshots(projectId, afterData)
    .then(() => {
      snapshotWritten = true;
    })
    .catch((err) => {
      console.error(`[ProjectWriteWrapper] Snapshot write failed for ${projectId}:`, err?.message);
    });

  // Wait for side effects to complete
  await Promise.all([logPromise, snapshotPromise, timelinePromise]);

  return {
    success: true,
    changesDetected: changes.length,
    snapshotWritten,
  };
}

/**
 * Merges flat and dot-notation updates into an existing data object.
 * Handles Firestore dot-notation paths like 'financials.purchasePrice'.
 */
function mergeUpdates(
  existing: Record<string, any>,
  updates: Record<string, any>
): Record<string, any> {
  // Deep clone existing to avoid mutation
  const result = JSON.parse(JSON.stringify(existing));

  for (const [key, value] of Object.entries(updates)) {
    // Skip FieldValue sentinels (like serverTimestamp) — they resolve server-side
    if (value && typeof value === 'object' && '_methodName' in value) continue;

    if (key.includes('.')) {
      // Dot-notation path: 'financials.purchasePrice' → nested set
      const parts = key.split('.');
      let current = result;
      for (let i = 0; i < parts.length - 1; i++) {
        if (current[parts[i]] === undefined || typeof current[parts[i]] !== 'object') {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    } else {
      // Simple key
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && typeof result[key] === 'object' && result[key] !== null) {
        // Merge objects (Firestore updateDoc merges top-level objects)
        result[key] = { ...result[key], ...value };
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}
