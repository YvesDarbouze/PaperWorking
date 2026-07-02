import { adminDb as db } from '../src/lib/firebase/admin';

// We replicate the schema manually to avoid compilation issues if imports are tricky
interface MetricSnapshot {
  id: string; // YYYY-MM-DD
  organizationId: string;
  date: Date;
  totalDocuments: number;
  pendingSignatures: number;
  teamEfficiencyScore: number;
  storageUsageBytes: number;
  createdAt: Date;
}

async function backfill() {
  console.log('Starting historical backfill for metricSnapshots...');

  const orgsSnapshot = await db.collection('organizations').get();
  let totalSnapshotsWritten = 0;

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id;
    if (orgId === 'org_placeholder') continue;

    console.log(`Processing organization: ${orgId}`);

    const projectsSnapshot = await db.collection('projects')
      .where('organizationId', '==', orgId)
      .get();

    // Collect all document timestamps
    const documentTimestamps: number[] = [];

    for (const projectDoc of projectsSnapshot.docs) {
      const project = projectDoc.data();

      if (project.roleLinkedDocuments && Array.isArray(project.roleLinkedDocuments)) {
        for (const doc of project.roleLinkedDocuments) {
          if (doc.uploadedAt) {
            documentTimestamps.push(doc.uploadedAt.toDate ? doc.uploadedAt.toDate().getTime() : new Date(doc.uploadedAt).getTime());
          }
        }
      }

      if (project.purchaseReadinessChecklist && Array.isArray(project.purchaseReadinessChecklist)) {
        for (const item of project.purchaseReadinessChecklist) {
          if (item.documentUrl && item.completedAt) {
            documentTimestamps.push(item.completedAt.toDate ? item.completedAt.toDate().getTime() : new Date(item.completedAt).getTime());
          }
        }
      }

      if (project.settlementDocuments && Array.isArray(project.settlementDocuments)) {
        for (const doc of project.settlementDocuments) {
          if (doc.uploadedAt) {
            documentTimestamps.push(doc.uploadedAt.toDate ? doc.uploadedAt.toDate().getTime() : new Date(doc.uploadedAt).getTime());
          }
        }
      }
    }

    if (documentTimestamps.length === 0) {
      console.log(`No documents found with valid timestamps for org ${orgId}. Skipping backfill.`);
      continue;
    }

    // Sort timestamps ascending
    documentTimestamps.sort((a, b) => a - b);

    // Find min date
    const minTimestamp = documentTimestamps[0];
    const startDate = new Date(minTimestamp);
    startDate.setUTCHours(0, 0, 0, 0);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Generate daily snapshots from startDate to yesterday
    let currentTimestamp = startDate.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    let previousTotalDocs = 0;
    let docIndex = 0;

    while (currentTimestamp < today.getTime()) {
      const currentDate = new Date(currentTimestamp);
      const endOfDayTimestamp = currentTimestamp + oneDayMs - 1;

      // Count docs up to the end of this day
      while (docIndex < documentTimestamps.length && documentTimestamps[docIndex] <= endOfDayTimestamp) {
        previousTotalDocs++;
        docIndex++;
      }

      const dateKey = currentDate.toISOString().split('T')[0];

      const snapshot: MetricSnapshot = {
        id: dateKey,
        organizationId: orgId,
        date: currentDate,
        totalDocuments: previousTotalDocs,
        pendingSignatures: 0, // Cannot be accurately reconstructed
        teamEfficiencyScore: 0, // Cannot be accurately reconstructed
        storageUsageBytes: 0, // Cannot be accurately reconstructed
        createdAt: new Date()
      };

      await db.collection('organizations')
        .doc(orgId)
        .collection('metricSnapshots')
        .doc(dateKey)
        .set(snapshot, { merge: true });

      totalSnapshotsWritten++;
      currentTimestamp += oneDayMs;
    }
  }

  console.log(`\nBackfill complete. Wrote ${totalSnapshotsWritten} snapshot documents.`);
  console.log('NOTE: Pending Signatures, Team Efficiency, and Storage Usage were left forward-only (set to 0 for historical dates) as they cannot be accurately reconstructed from available timestamps.');
}

backfill()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Failed to backfill:', err);
    process.exit(1);
  });
