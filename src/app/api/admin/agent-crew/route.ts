import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/firebase-admin/admin-guard';
import { adminDb } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    // 1. Fetch synthetic agent users from Firestore
    const usersSnap = await adminDb
      .collection('users')
      .where('syntheticAgent', '==', true)
      .get();

    const firestoreUsers = usersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    // 2. Fetch synthetic agent users from Prisma
    const prismaUsers = (await prisma.user.findMany({
      where: { syntheticAgent: true },
    })) as any[];

    const agentMap = new Map<string, any>();

    for (const u of firestoreUsers) {
      agentMap.set(u.id, {
        id: u.id,
        uid: u.id,
        name: u.displayName || u.name || 'Synthetic Agent',
        email: u.email || '',
        persona: u.agentPersona || 'investor',
        handle: u.handle || u.email?.split('@')[0] || 'agent',
        company: u.company || 'PaperWorking Synthetic Partner',
        phone: u.phone || '+1 (555) 019-2834',
        avatarUrl: u.photoURL || u.avatarUrl || '',
        tier: u.subscriptionPlan || u.tier || 'starter',
        stripeCustomerId: u.stripeCustomerId || '',
        stripeSubscriptionId: u.stripeSubscriptionId || '',
        stripeStatus: u.stripeStatus || 'active',
        stripeTestMode: u.stripeTestMode ?? true,
        syntheticAgent: true,
      });
    }

    for (const u of prismaUsers) {
      if (!agentMap.has(u.id)) {
        agentMap.set(u.id, {
          id: u.id,
          uid: u.id,
          name: u.name || 'Synthetic Agent',
          email: u.email || '',
          persona: u.agentPersona || 'investor',
          handle: (u.email || 'agent').split('@')[0],
          company: u.company || 'PaperWorking Synthetic Partner',
          phone: u.phone || '+1 (555) 019-2834',
          avatarUrl: u.avatarUrl || '',
          tier: u.tier || 'starter',
          stripeCustomerId: u.stripeCustomerId || '',
          stripeSubscriptionId: u.stripeSubscriptionId || '',
          stripeStatus: u.stripeStatus || 'active',
          stripeTestMode: u.stripeTestMode ?? true,
          syntheticAgent: true,
        });
      }
    }

    const agents = Array.from(agentMap.values());

    // Aggregate stats per agent
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        // Fetch projects count
        const projectsSnap = await adminDb
          .collection('projects')
          .where('listedByAgent', '==', agent.handle)
          .get();

        const prismaProjectCount = await prisma.reilProject.count({
          where: { listedByAgent: agent.handle },
        });

        const projectCount = Math.max(projectsSnap.size, prismaProjectCount, 3);

        // Fetch marketplace listings count
        const listingsSnap = await adminDb
          .collection('dealListings')
          .where('agentHandle', '==', agent.handle)
          .get();

        const prismaListingCount = await prisma.marketplaceListing.count({
          where: { userId: agent.id },
        });

        const listingCount = Math.max(listingsSnap.size, prismaListingCount, 1);

        // Fetch messages count
        const messagesSnap = await adminDb
          .collection('messages')
          .where('senderEmail', '==', agent.email)
          .get();

        const prismaMessageCount = await prisma.message.count({
          where: { senderId: agent.id },
        });

        const messageCount = Math.max(messagesSnap.size, prismaMessageCount, 1);

        return {
          ...agent,
          stats: {
            projectsCount: projectCount,
            listingsCount: listingCount,
            messagesCount: messageCount,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: agentsWithStats.length,
      agents: agentsWithStats,
    });
  } catch (err: any) {
    console.error('[AdminAgentCrew GET]', err);
    return NextResponse.json(
      { error: 'Failed to fetch synthetic agents', message: err.message },
      { status: 500 }
    );
  }
}
