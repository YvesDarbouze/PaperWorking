import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Project, Organization, MetricSnapshot } from '@/types/schema';
import { FieldValue } from 'firebase-admin/firestore';

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

        for (const projectDoc of projectsSnapshot.docs) {
          const project = projectDoc.data() as Project;

          // 1. Documents & Storage
          if (project.roleLinkedDocuments && Array.isArray(project.roleLinkedDocuments)) {
            totalDocuments += project.roleLinkedDocuments.length;
            storageUsageBytes += project.roleLinkedDocuments.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
          }

          // closingRoom documents removed as it doesn't match schema

          if (project.purchaseReadinessChecklist && Array.isArray(project.purchaseReadinessChecklist)) {
            const docs = project.purchaseReadinessChecklist.filter(item => item.documentUrl);
            totalDocuments += docs.length;
            storageUsageBytes += docs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);
          }

          if (project.settlementDocuments && Array.isArray(project.settlementDocuments)) {
            totalDocuments += project.settlementDocuments.length;
            storageUsageBytes += project.settlementDocuments.reduce((sum: number, doc: any) => sum + (doc.fileSize || 0), 0);
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
