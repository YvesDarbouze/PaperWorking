import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/firebase-admin/admin-guard';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';
import { getStripeServerClient } from '@/lib/stripe/client';

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    let usersDeleted = 0;
    let projectsDeleted = 0;
    let listingsDeleted = 0;
    let messagesDeleted = 0;
    let subscriptionsCanceled = 0;

    // 1. Fetch synthetic users from Firestore
    const usersSnap = await adminDb
      .collection('users')
      .where('syntheticAgent', '==', true)
      .get();

    const stripe = getStripeServerClient();

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const subId = data.stripeSubscriptionId;

      // Cancel Stripe test mode subscription via stripe.subscriptions.cancel()
      if (subId && typeof subId === 'string' && subId.startsWith('sub_')) {
        try {
          await stripe.subscriptions.cancel(subId);
          subscriptionsCanceled++;
        } catch (e) {
          console.warn(`[PurgeAll] Stripe cancel failed for ${subId}:`, e);
        }
      }

      // Delete Firebase Auth user
      try {
        await adminAuth.deleteUser(doc.id);
      } catch (e) {
        // user might not exist in Auth
      }

      // Delete user document
      await doc.ref.delete();
      usersDeleted++;
    }

    // 2. Delete synthetic projects from Firestore
    const projSnap = await adminDb
      .collection('projects')
      .where('syntheticAgent', '==', true)
      .get();

    for (const doc of projSnap.docs) {
      await doc.ref.delete();
      projectsDeleted++;
    }

    // 3. Delete synthetic listings from Firestore
    const listSnap = await adminDb
      .collection('dealListings')
      .where('syntheticAgent', '==', true)
      .get();

    for (const doc of listSnap.docs) {
      await doc.ref.delete();
      listingsDeleted++;
    }

    // 4. Delete synthetic messages from Firestore
    const msgSnap = await adminDb
      .collection('messages')
      .where('syntheticAgent', '==', true)
      .get();

    for (const doc of msgSnap.docs) {
      await doc.ref.delete();
      messagesDeleted++;
    }

    // Delete inboxItems synthetic entries
    const inboxSnap = await adminDb
      .collection('inboxItems')
      .where('syntheticAgent', '==', true)
      .get();
    for (const doc of inboxSnap.docs) {
      await doc.ref.delete();
    }

    // 5. Cascade delete in Prisma in correct order: Subscriptions → Messages → Listings → Projects → Users
    const prismaSubscriptions = await prisma.subscription.deleteMany({
      where: { syntheticAgent: true },
    });
    if (subscriptionsCanceled === 0) {
      subscriptionsCanceled = prismaSubscriptions.count;
    }

    const prismaMessages = await prisma.message.deleteMany({
      where: { syntheticAgent: true },
    });

    const prismaListings = await prisma.marketplaceListing.deleteMany({
      where: { syntheticAgent: true },
    });

    const prismaProjects = await prisma.reilProject.deleteMany({
      where: { syntheticAgent: true },
    });

    const prismaSqlProjects = await prisma.project.deleteMany({
      where: { syntheticAgent: true },
    });

    const prismaUsers = await prisma.user.deleteMany({
      where: { syntheticAgent: true },
    });

    const prismaAppUsers = await prisma.appUser.deleteMany({
      where: { syntheticAgent: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Purged all synthetic agent data successfully.',
      usersDeleted,
      projectsDeleted,
      listingsDeleted,
      messagesDeleted,
      subscriptionsCanceled,
    });
  } catch (err: any) {
    console.error('[AdminAgentCrew/purge-all DELETE]', err);
    return NextResponse.json(
      { error: 'Failed to purge synthetic agent data', message: err.message },
      { status: 500 }
    );
  }
}
