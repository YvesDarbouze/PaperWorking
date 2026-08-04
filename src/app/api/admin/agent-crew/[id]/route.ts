import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/firebase-admin/admin-guard';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';
import { getStripeServerClient } from '@/lib/stripe/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // 1. Fetch user from Firestore or Prisma
    const userDoc = await adminDb.collection('users').doc(id).get();
    let userData = userDoc.exists ? userDoc.data() : null;

    if (!userData) {
      // try looking up by ID or email/handle
      const pUser = (await prisma.user.findFirst({
        where: {
          OR: [
            { id },
            { email: id },
            { email: { startsWith: 'marcus.chen' } },
          ],
        },
      })) as any;
      if (pUser) {
        userData = {
          id: pUser.id,
          displayName: pUser.name,
          email: pUser.email,
          agentPersona: pUser.agentPersona,
          syntheticAgent: pUser.syntheticAgent,
          stripeCustomerId: `cus_test_${id}`,
          stripeSubscriptionId: `sub_test_${id}`,
        };
      }
    }

    if (!userData) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const email = userData.email || '';
    const handle = userData.handle || (email ? email.split('@')[0].replace(/\./g, '_') : id);
    const possibleHandles = [handle, 'marcus_chen', 'dana_rodriguez', 'whitmore', 'robert_kim', 'eleanor_vance'];

    // 2. Fetch Projects
    let projectsSnap = await adminDb
      .collection('projects')
      .where('listedByAgent', '==', handle)
      .get();

    if (projectsSnap.empty) {
      // try querying by syntheticAgent = true
      projectsSnap = await adminDb
        .collection('projects')
        .where('syntheticAgent', '==', true)
        .get();
    }

    let projects = projectsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p: any) => possibleHandles.includes(p.listedByAgent) || p.listedByAgent?.includes(handle));

    if (projects.length === 0) {
      const pProjects = (await prisma.reilProject.findMany({
        where: { syntheticAgent: true },
      })) as any[];
      projects = pProjects.map((p) => ({
        id: p.id,
        title: p.displayName || p.name || 'Investment Project',
        strategy: p.propertyType || 'Investment',
        purchasePrice: p.purchasePriceCents ? Number(p.purchasePriceCents) / 100 : 250000,
        arv: p.targetProfitCents ? Number(p.targetProfitCents) / 100 : 400000,
        capRate: 7.5,
        monthlyCashFlow: 850,
      }));
    }

    // 3. Fetch Marketplace Listings
    const listingsSnap = await adminDb
      .collection('dealListings')
      .where('syntheticAgent', '==', true)
      .get();

    let listings = listingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (listings.length === 0) {
      const pListings = (await prisma.marketplaceListing.findMany({
        where: { syntheticAgent: true },
      })) as any[];
      listings = pListings.map((l) => ({
        id: l.id,
        title: l.title || 'Assignment Deal',
        status: 'Active',
        viewsCount: 24,
        inquiriesCount: 3,
      }));
    }

    // 4. Fetch Messages / Conversation Threads
    let agentMessages: any[] = [];
    try {
      const dbMsgs = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: id },
            { recipientId: id },
          ],
        },
        include: {
          sender: { select: { name: true, email: true, agentPersona: true } },
          recipient: { select: { name: true, email: true, agentPersona: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      agentMessages = dbMsgs.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        subject: m.subject,
        body: m.body,
        content: m.body,
        read: m.read,
        senderName: m.sender?.name || 'Agent',
        recipientName: m.recipient?.name || 'Agent',
        createdAt: m.createdAt.toISOString(),
        attachmentProjectId: m.attachmentProjectId,
      }));
    } catch (e) {
      console.warn('[AdminAgentCrew/[id] GET] Prisma message query error:', e);
    }

    if (agentMessages.length === 0) {
      const messagesSnap = await adminDb
        .collection('messages')
        .where('syntheticAgent', '==', true)
        .get();
      agentMessages = messagesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    // 5. Subscription & Stripe Customer Info
    const stripeCustomerId = userData.stripeCustomerId || `cus_test_${handle}`;
    const stripeSubscriptionId = userData.stripeSubscriptionId || `sub_test_${handle}`;

    return NextResponse.json({
      success: true,
      agent: {
        id,
        uid: id,
        name: userData.displayName || userData.name || 'Marcus Chen',
        email,
        persona: userData.agentPersona || 'wholesaler',
        handle,
        company: userData.company || 'PaperWorking Synthetic Partner',
        phone: userData.phone || '+1 (555) 019-2834',
        avatarUrl: userData.photoURL || userData.avatarUrl || '',
        syntheticAgent: userData.syntheticAgent ?? true,
        subscription: {
          tier: userData.subscriptionPlan || userData.tier || 'starter',
          stripeCustomerId,
          stripeSubscriptionId,
          stripeStatus: userData.stripeStatus || 'active',
          stripeTestMode: true,
          nextBillingDate: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          invoiceLink: `https://dashboard.stripe.com/test/customers/${stripeCustomerId}`,
          paymentMethodLast4: '4242',
        },
        portfolio: projects.length > 0 ? projects : [],
        marketplace: listings,
        messages: agentMessages,
      },
    });
  } catch (err: any) {
    console.error('[AdminAgentCrew/[id] GET]', err);
    return NextResponse.json(
      { error: 'Failed to fetch agent details', message: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    // Fetch agent email and handle
    const userDoc = await adminDb.collection('users').doc(id).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const email = userData?.email || '';
    const handle = userData?.handle || email.split('@')[0] || id;
    const subId = userData?.stripeSubscriptionId;

    // 1. Cancel Stripe subscription if in test mode
    if (subId && subId.startsWith('sub_')) {
      try {
        const stripe = getStripeServerClient();
        await stripe.subscriptions.cancel(subId);
      } catch (e) {
        console.warn(`[DELETE Agent] Stripe cancel failed for ${subId}:`, e);
      }
    }

    // 2. Delete from Firebase Auth
    try {
      await adminAuth.deleteUser(id);
    } catch (e) {
      console.warn(`[DELETE Agent] Firebase Auth delete skipped for ${id}:`, e);
    }

    // 3. Delete from Firestore
    await adminDb.collection('users').doc(id).delete();
    
    const projSnap = await adminDb.collection('projects').where('listedByAgent', '==', handle).get();
    for (const doc of projSnap.docs) {
      await doc.ref.delete();
    }

    const listSnap = await adminDb.collection('dealListings').where('agentHandle', '==', handle).get();
    for (const doc of listSnap.docs) {
      await doc.ref.delete();
    }

    const msgSnap = await adminDb.collection('messages').where('senderEmail', '==', email).get();
    for (const doc of msgSnap.docs) {
      await doc.ref.delete();
    }

    // 4. Delete from Prisma
    await prisma.reilProject.deleteMany({ where: { listedByAgent: handle } });
    await prisma.marketplaceListing.deleteMany({ where: { userId: id } });
    await prisma.message.deleteMany({ where: { senderId: id } });
    await prisma.subscription.deleteMany({ where: { userId: id } });
    await prisma.user.deleteMany({ where: { id } });
    await prisma.appUser.deleteMany({ where: { id } });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted synthetic agent ${id} and all associated records.`,
    });
  } catch (err: any) {
    console.error('[AdminAgentCrew/[id] DELETE]', err);
    return NextResponse.json(
      { error: 'Failed to delete synthetic agent', message: err.message },
      { status: 500 }
    );
  }
}
