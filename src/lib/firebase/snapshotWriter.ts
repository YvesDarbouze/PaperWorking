import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Project } from '@/types/schema';
import {
  computeProjectSnapshotData,
  parseFirestoreDate,
} from '@/lib/metrics/snapshotService';

/* ═══════════════════════════════════════════════════════
   Snapshot Writer — Server-Side Metric Snapshot Engine

   Called after a project document is updated (server-side).
   Recomputes all REI metrics using the canonical
   `deriveAllMetrics` engine and writes/updates snapshot
   documents in the `propertyMetricSnapshots` collection.

   Key format: `${projectId}_${period}`
   Period: current month "YYYY-MM"

   Uses the existing `computeProjectSnapshotData` from
   snapshotService.ts for consistency — the same logic
   that reconstructHistoryForProject uses.
   ═══════════════════════════════════════════════════════ */

/**
 * Computes the current period key in "YYYY-MM" format.
 */
function getCurrentPeriod(): { period: string; date: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return {
    period: `${year}-${month}`,
    date: new Date(year, now.getMonth(), 1),
  };
}

/**
 * Builds a Project-like object from raw Firestore admin data.
 * Handles Firestore Timestamp → Date coercion for the fields
 * that deriveAllMetrics needs.
 */
function normalizeProjectData(
  projectId: string,
  data: FirebaseFirestore.DocumentData
): Project {
  return {
    ...data,
    id: projectId,
    createdAt: data.createdAt ? parseFirestoreDate(data.createdAt) : new Date(),
    updatedAt: data.updatedAt ? parseFirestoreDate(data.updatedAt) : new Date(),
  } as Project;
}

export interface SnapshotWriteResult {
  snapshotsWritten: number;
  metricsSummary: {
    noi: number | null;
    capRate: number | null;
    cashOnCashReturn: number | null;
    dscr: number | null;
  };
}

/**
 * Called after a project document is updated.
 * Recomputes all metrics and writes a snapshot for the current period.
 *
 * @param projectId   The Firestore document ID
 * @param projectData The full project document data (after update)
 * @returns           Summary of what was written
 */
export async function writeMetricSnapshots(
  projectId: string,
  projectData: FirebaseFirestore.DocumentData
): Promise<SnapshotWriteResult> {
  const project = normalizeProjectData(projectId, projectData);
  const { period, date } = getCurrentPeriod();

  // Use the existing canonical snapshot computation function
  const snapshotData = computeProjectSnapshotData(project, period, 'monthly', date);

  // Write the current-month snapshot
  const docId = snapshotData.id; // `${projectId}_${period}`
  const docRef = adminDb.collection('propertyMetricSnapshots').doc(docId);

  await docRef.set(
    {
      ...snapshotData,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    snapshotsWritten: 1,
    metricsSummary: {
      noi: snapshotData.noi ?? null,
      capRate: snapshotData.capRate ?? null,
      cashOnCashReturn: snapshotData.cashOnCashReturn ?? null,
      dscr: snapshotData.dscr ?? null,
    },
  };
}

/**
 * Batch-process multiple projects for cron usage.
 * Processes projects sequentially to avoid overwhelming Firestore.
 *
 * @param projectIds  Array of project IDs to process (max 100)
 * @returns           Summary of batch operation
 */
export async function writeMetricSnapshotsBatch(
  projectIds: string[]
): Promise<{
  projectsProcessed: number;
  snapshotsWritten: number;
  errors: Array<{ projectId: string; error: string }>;
}> {
  const errors: Array<{ projectId: string; error: string }> = [];
  let snapshotsWritten = 0;
  let projectsProcessed = 0;

  const { period, date } = getCurrentPeriod();
  const BATCH_SIZE = 400; // Firestore batch write limit safety margin
  let batch = adminDb.batch();
  let batchCount = 0;

  for (const projectId of projectIds) {
    try {
      const docSnap = await adminDb.collection('projects').doc(projectId).get();
      if (!docSnap.exists) {
        errors.push({ projectId, error: 'Project document not found' });
        continue;
      }

      const project = normalizeProjectData(projectId, docSnap.data()!);
      const snapshotData = computeProjectSnapshotData(project, period, 'monthly', date);

      const docRef = adminDb.collection('propertyMetricSnapshots').doc(snapshotData.id);
      batch.set(
        docRef,
        { ...snapshotData, createdAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      batchCount++;
      snapshotsWritten++;
      projectsProcessed++;

      // Commit batch when reaching limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        batch = adminDb.batch();
        batchCount = 0;
      }
    } catch (err: any) {
      errors.push({ projectId, error: err.message ?? String(err) });
    }
  }

  // Commit remaining batch
  if (batchCount > 0) {
    await batch.commit();
  }

  return { projectsProcessed, snapshotsWritten, errors };
}
