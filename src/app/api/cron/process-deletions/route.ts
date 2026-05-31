import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase/admin';
import admin from 'firebase-admin';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, { apiVersion: '2026-04-22.dahlia' as any });
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.WORKER_SECRET;

  if (secret) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const deletedUserIds: string[] = [];
  const errors: any[] = [];

  try {
    // 1. Fetch expired deletion requests (scheduledAt <= now)
    const now = new Date();
    const requestsSnap = await adminDb
      .collection('accountDeletionRequests')
      .where('scheduledAt', '<=', now)
      .get();

    for (const docSnap of requestsSnap.docs) {
      const uid = docSnap.id;
      try {
        // A. Cancel active Stripe subscription if present
        const userDoc = await adminDb.collection('users').doc(uid).get();
        const userData = userDoc.exists ? userDoc.data() : null;
        const stripeSubscriptionId = userData?.stripeSubscriptionId;

        if (stripeSubscriptionId) {
          try {
            const stripe = getStripe();
            await stripe.subscriptions.cancel(stripeSubscriptionId);
            console.log(`[Cron Deletion] Stripe subscription cancelled: ${stripeSubscriptionId} for user ${uid}`);
          } catch (stripeErr: any) {
            console.error(`[Cron Deletion] Stripe subscription cancel failed for user ${uid}:`, stripeErr.message);
          }
        }

        // 2. Query all projects owned by the user
        const projectsSnap = await adminDb
          .collection('projects')
          .where('ownerUid', '==', uid)
          .get();

        const bucket = adminStorage.bucket();

        for (const projectDoc of projectsSnap.docs) {
          const projectId = projectDoc.id;

          // A. Fetch all activity logs of the project to archive
          const activitySnap = await adminDb
            .collection('projects')
            .doc(projectId)
            .collection('activityLog')
            .get();

          const logs = activitySnap.docs.map(l => ({ id: l.id, ...l.data() }));

          if (logs.length > 0) {
            // Write to archivedAuditLogs with a 7-year retention lease
            await adminDb.collection('archivedAuditLogs').add({
              projectId,
              ownerUid: uid,
              archivedAt: new Date(),
              expiresAt: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
              logs,
            });
          }

          // B. Delete activityLog subcollection documents
          for (const lDoc of activitySnap.docs) {
            await lDoc.ref.delete();
          }

          // C. Delete ledgerItems subcollection documents
          const ledgerSnap = await adminDb
            .collection('projects')
            .doc(projectId)
            .collection('ledgerItems')
            .get();

          for (const lItem of ledgerSnap.docs) {
            await lItem.ref.delete();
          }

          // D. Delete files from Firebase Storage
          try {
            const [files] = await bucket.getFiles({ prefix: `projects/${projectId}/` });
            for (const file of files) {
              await file.delete();
            }
          } catch (storageErr: any) {
            console.warn(`[Cron Deletion] Storage files delete skipped for project ${projectId}:`, storageErr.message);
          }

          // E. Delete project document
          await projectDoc.ref.delete();
        }

        // 3. Delete user document in users/{uid}
        await adminDb.collection('users').doc(uid).delete();

        // 4. Delete the user from Firebase Authentication
        try {
          await admin.auth().deleteUser(uid);
        } catch (authErr: any) {
          if (authErr.code !== 'auth/user-not-found') {
            throw authErr;
          }
        }

        // 5. Delete the accountDeletionRequest document
        await docSnap.ref.delete();

        deletedUserIds.push(uid);
      } catch (err: any) {
        errors.push({ userId: uid, error: err.message });
        console.error(`[Cron Deletion] Failed to delete user ${uid}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: deletedUserIds.length,
      deletedUserIds,
      errors,
    });
  } catch (error: any) {
    console.error('❌ [CRON DELETION PROCESSOR] Uncaught error:', error);
    return NextResponse.json({ error: 'cron_failed', detail: error.message }, { status: 500 });
  }
}
