import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { NotificationService } from '@/lib/services/notificationService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Cron authorization verification
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.WORKER_SECRET || 'mock_secret';

  const isTest = process.env.NODE_ENV === 'test';
  if (!isTest && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    projectsScanned: 0,
    remindersSent: 0,
    errors: [] as any[],
  };

  try {
    const projectsSnap = await adminDb
      .collection('projects')
      .where('status', 'in', ['Active', 'Under Contract', 'Renovating', 'Rented'])
      .get();

    results.projectsScanned = projectsSnap.size;

    for (const projectDoc of projectsSnap.docs) {
      const projectId = projectDoc.id;
      const project = projectDoc.data();
      const ownerUid = project.ownerUid;
      if (!ownerUid) continue;

      try {
        const packageColl = adminDb
          .collection('projects')
          .doc(projectId)
          .collection('lenderPackage');

        const itemsSnap = await packageColl.get();
        if (itemsSnap.empty) continue;

        for (const itemDoc of itemsSnap.docs) {
          const itemId = itemDoc.id;
          const item = itemDoc.data();

          if (item.status === 'Uploaded') continue;
          if (item.reminderCadence === 'none' || !item.reminderCadence) continue;

          // Check if it's time to remind based on lastRemindedAt
          const lastReminded = item.lastRemindedAt ? new Date(item.lastRemindedAt) : null;
          const cadence = item.reminderCadence;
          const now = new Date();

          let shouldRemind = false;
          if (!lastReminded) {
            shouldRemind = true;
          } else {
            const diffMs = now.getTime() - lastReminded.getTime();
            if (cadence === 'daily') {
              shouldRemind = diffMs >= 24 * 60 * 60 * 1000;
            } else if (cadence === 'weekly') {
              shouldRemind = diffMs >= 7 * 24 * 60 * 60 * 1000;
            }
          }

          if (shouldRemind) {
            // Dispatch notification via NotificationService
            await NotificationService.createNotification({
              recipientId: ownerUid,
              type: 'LENDER_CHECKLIST_REMINDER',
              actor: {
                uid: 'system',
                name: 'PaperWorking',
              },
              objectReference: {
                projectId,
                dealAddress: project.address || 'project property',
                documentName: item.name,
              },
              deepLinkUrl: `/dashboard/projects/${projectId}/phase-2?card=F3.2`,
            });

            // Update item in Firestore
            await itemDoc.ref.update({
              lastRemindedAt: now.toISOString(),
            });

            results.remindersSent++;
          }
        }
      } catch (err: any) {
        results.errors.push({ projectId, error: err.message });
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    console.error('[Lender Package Reminders Cron]', err.message);
    return NextResponse.json({ error: 'Failed to process reminders' }, { status: 500 });
  }
}
