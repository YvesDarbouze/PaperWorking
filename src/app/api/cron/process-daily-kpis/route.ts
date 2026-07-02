import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import { Project, Organization, MetricSnapshot } from '@/types/schema';
import { FieldValue } from 'firebase-admin/firestore';
import { saveActiveSnapshotsForProjectAdmin } from '@/lib/metrics/snapshotService.admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/process-daily-kpis
 *
 * Runs daily via Vercel Cron.
 * Aggregates document counts, signatures, efficiency, and storage usage 
 * for each organization and writes a snapshot.
 * Protected by Vercel CRON_SECRET or WORKER_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const today = new Date();
    // Use ISO string for the date key: 'YYYY-MM-DD'
    const dateKey = today.toISOString().split('T')[0];

    const orgsSnapshot = await adminDb.collection('organizations').get();
    const processedOrgs: string[] = [];
    const errors: any[] = [];

    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      const org = orgDoc.data() as Organization;

      // Skip invalid or placeholder orgs
      if (orgId === 'org_placeholder' || !orgId) continue;

      try {
        const projectsSnapshot = await adminDb.collection('projects')
          .where('organizationId', '==', orgId)
          .get();

        let totalDocuments = 0;
        let pendingSignatures = 0;
        let storageUsageBytes = 0;
        
        let totalActionItems = 0;
        let completedActionItems = 0;

        const bucket = adminStorage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

        for (const projectDoc of projectsSnapshot.docs) {
          const project = { ...projectDoc.data(), id: projectDoc.id } as Project;

          // Compute and save active financial snapshots for the project
          try {
            await saveActiveSnapshotsForProjectAdmin(project);
          } catch (snapshotErr: any) {
            console.error(`Failed to save active snapshots for project ${projectDoc.id}:`, snapshotErr);
          }

          // 1. Storage Usage (Real bytes from Cloud Storage)
          try {
            const [files] = await bucket.getFiles({ prefix: `projects/${projectDoc.id}/` });
            const projectStorageBytes = files.reduce((sum, file) => sum + parseInt(file.metadata.size?.toString() || '0', 10), 0);
            storageUsageBytes += projectStorageBytes;
          } catch (storageErr) {
            console.error(`Failed to fetch storage for project ${projectDoc.id}:`, storageErr);
          }

          // 2. Total Documents
          if (project.roleLinkedDocuments && Array.isArray(project.roleLinkedDocuments)) {
            totalDocuments += project.roleLinkedDocuments.length;
          }

          if (project.purchaseReadinessChecklist && Array.isArray(project.purchaseReadinessChecklist)) {
            const docs = project.purchaseReadinessChecklist.filter(item => item.documentUrl);
            totalDocuments += docs.length;
          }

          if (project.settlementDocuments && Array.isArray(project.settlementDocuments)) {
            totalDocuments += project.settlementDocuments.length;
          }

          // 2. Pending Signatures (LOIs that are Drafted, Sent, or Viewed)
          if (project.loiDocuments && Array.isArray(project.loiDocuments)) {
            const pending = project.loiDocuments.filter(
              loi => loi.status === 'Drafted' || loi.status === 'Sent' || loi.status === 'Viewed'
            );
            pendingSignatures += pending.length;
          }

          // 3. Team Efficiency (Action Items / ProjectTodoList)
          if (project.actionItems && Array.isArray(project.actionItems)) {
            totalActionItems += project.actionItems.length;
            completedActionItems += project.actionItems.filter(item => item.completed).length;
          }
        }

        // Calculate Team Efficiency Score (0-100)
        let teamEfficiencyScore = 0;
        if (totalActionItems > 0) {
          teamEfficiencyScore = Math.round((completedActionItems / totalActionItems) * 100);
        }

        const snapshotData: MetricSnapshot = {
          id: dateKey,
          organizationId: orgId,
          date: today,
          totalDocuments,
          pendingSignatures,
          teamEfficiencyScore,
          storageUsageBytes,
          createdAt: new Date()
        };

        // Write the snapshot document
        await adminDb.collection('organizations')
          .doc(orgId)
          .collection('metricSnapshots')
          .doc(dateKey)
          .set(snapshotData);

        processedOrgs.push(orgId);
      } catch (err: any) {
        errors.push({ orgId, error: err.message });
      }
    }

    return NextResponse.json({ 
      ok: true, 
      processedCount: processedOrgs.length,
      processed: processedOrgs,
      errors 
    });
  } catch (error: any) {
    console.error('❌ [CRON KPI PROCESSOR] Uncaught error:', error);
    return NextResponse.json({ error: 'cron_failed', detail: error.message }, { status: 500 });
  }
}
