import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { adminDb } from '../lib/firebase/admin';
import { prisma } from '../lib/prisma';

export async function seedAgentMessages() {
  console.log('🚀 Starting Real-Space Cross-Agent Messaging Seeder...');

  const fixturePath = path.resolve(process.cwd(), 'src/test/fixtures/agent-crew-seed.json');
  if (!fs.existsSync(fixturePath)) {
    throw new Error('agent-crew-seed.json fixture not found. Please run seedAgentCrew first.');
  }

  const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const agentsMap = new Map<string, any>();
  for (const agent of fixtureData.agents) {
    agentsMap.set(agent.handle, agent);
  }

  const marcus = agentsMap.get('marcus_chen');
  const dana = agentsMap.get('dana_rodriguez');
  const whitmore = agentsMap.get('whitmore');
  const atlas = agentsMap.get('robert_kim');
  const eleanor = agentsMap.get('eleanor_vance');

  if (!marcus || !dana || !whitmore || !atlas || !eleanor) {
    console.warn('⚠️ Warning: One or more agent fixtures missing in agent-crew-seed.json');
    throw new Error('Missing agent fixture references in agent-crew-seed.json');
  }

  // Ensure User records exist in Prisma for foreign key constraints
  const agentsList = [marcus, dana, whitmore, atlas, eleanor];
  for (const ag of agentsList) {
    await prisma.user.upsert({
      where: { id: ag.uid },
      update: {
        email: ag.email,
        name: ag.name,
        syntheticAgent: true,
        agentPersona: ag.persona,
      },
      create: {
        id: ag.uid,
        email: ag.email,
        name: ag.name,
        syntheticAgent: true,
        agentPersona: ag.persona,
      },
    });
  }

  // Helper for project IDs
  const getProjectId = (agent: any, titleContains: string): string | null => {
    if (!agent || !agent.projects) return null;
    const proj = agent.projects.find((p: any) =>
      p.title.toLowerCase().includes(titleContains.toLowerCase())
    );
    return proj ? proj.id : null;
  };

  const akronProjectId = getProjectId(marcus, 'Akron') || 'proj_marcus_chen_2';
  const planoProjectId = getProjectId(atlas, 'Plano') || 'proj_robert_kim_1';
  const tampaProjectId = getProjectId(eleanor, 'Tampa') || 'proj_eleanor_vance_1';

  // Ensure attached Project records exist in Prisma
  const projectsToEnsure = [
    { id: akronProjectId, title: 'Akron Double-Close', userId: marcus.uid },
    { id: planoProjectId, title: 'Plano Retail Strip', userId: atlas.uid },
    { id: tampaProjectId, title: 'Tampa 100-Unit', userId: eleanor.uid },
  ];

  for (const prj of projectsToEnsure) {
    await prisma.project.upsert({
      where: { id: prj.id },
      update: {
        title: prj.title,
        userId: prj.userId,
        syntheticAgent: true,
      },
      create: {
        id: prj.id,
        title: prj.title,
        userId: prj.userId,
        syntheticAgent: true,
      },
    });
  }

  // Clean up previous synthetic messages in Prisma and Firestore for fresh seed
  await prisma.message.deleteMany({ where: { syntheticAgent: true } });

  const now = Date.now();

  const rawMessages = [
    {
      id: 'msg_seed_1',
      threadId: 'thread-marcus-whitmore-akron',
      sender: marcus,
      recipient: whitmore,
      subject: 'Akron Assignment Ready',
      body: "We'll take the Akron assignment. Send the contract to j.whitmore@email.com. Closing in 10 days.",
      attachmentProjectId: akronProjectId,
      createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: 'msg_seed_2',
      threadId: 'thread-marcus-dana-phoenix',
      sender: marcus,
      recipient: dana,
      subject: 'Phoenix Lead Incoming',
      body: 'Dana — got a Phoenix-area lead coming next month. Want first look? I wholesale, you flip. Should be a $300k ARV SFR.',
      attachmentProjectId: null,
      createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: 'msg_seed_3',
      threadId: 'thread-dana-atlas-gc',
      sender: dana,
      recipient: atlas,
      subject: 'GC Referral Needed',
      body: 'Robert — need a commercial-grade GC referral in Dallas. Doing a 4-plex there next quarter. Someone who knows multi-family rehabs.',
      attachmentProjectId: null,
      createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: 'msg_seed_4',
      threadId: 'thread-dana-marcus-reply',
      sender: dana,
      recipient: marcus,
      subject: 'Re: Phoenix Lead',
      body: 'Send me that Phoenix lead when you get it. My rehab crew is hungry. We can close in 14 days.',
      attachmentProjectId: null,
      createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: 'msg_seed_5',
      threadId: 'thread-whitmore-eleanor-lp',
      sender: whitmore,
      recipient: eleanor,
      subject: 'LP Interest — Tampa',
      body: "We're looking to go passive on our next deal. What's your minimum LP check for the Tampa project? We can do $250k.",
      attachmentProjectId: null,
      createdAt: new Date(now - 3 * 24 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: 'msg_seed_6',
      threadId: 'thread-whitmore-marcus-akron',
      sender: whitmore,
      recipient: marcus,
      subject: 'Re: Akron Assignment',
      body: "We'll take the Akron assignment. Contract sent. Let's schedule the title review.",
      attachmentProjectId: akronProjectId,
      createdAt: new Date(now - 9 * 24 * 60 * 60 * 1000),
      read: true,
    },
    {
      id: 'msg_seed_7',
      threadId: 'thread-atlas-dallas-jv',
      sender: atlas,
      recipient: dana,
      subject: 'Dallas 6-Plex JV',
      body: "We have a distressed 6-plex in Dallas that needs a full gut. Your rehab expertise + our capital = 60/40 split? Let's talk.",
      attachmentProjectId: null,
      createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: 'msg_seed_8',
      threadId: 'thread-atlas-eleanor-plano',
      sender: atlas,
      recipient: eleanor,
      subject: 'Plano Strip Syndication',
      body: "Our Plano strip could be a value-add play. Ever syndicate retail? Let's talk. We could push rents 15% with minimal capex.",
      attachmentProjectId: planoProjectId,
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: 'msg_seed_9',
      threadId: 'thread-eleanor-whitmore-tampa',
      sender: eleanor,
      recipient: whitmore,
      subject: 'Tampa 70% Subscribed',
      body: 'Whitmores — Tampa deal is 70% subscribed. If you want in, I need a soft commit this week. $250k minimum, 8% pref, 18.4% projected IRR.',
      attachmentProjectId: tampaProjectId,
      createdAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: 'msg_seed_10',
      threadId: 'thread-eleanor-marcus-ohio',
      sender: eleanor,
      recipient: marcus,
      subject: 'Ohio Off-Market Leads',
      body: "Marcus, any off-market 50+ unit leads in Ohio? We pay $10k finder's fee at closing. Need C-class value-add in Cleveland or Columbus.",
      attachmentProjectId: null,
      createdAt: new Date(now - 8 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: 'msg_seed_11',
      threadId: 'thread-eleanor-atlas-dallas',
      sender: eleanor,
      recipient: atlas,
      subject: 'Re: Dallas 6-Plex',
      body: "Robert, let's partner on that Dallas 6-plex. We bring the LP capital, you bring the commercial lease expertise. 50/50 on promote?",
      attachmentProjectId: null,
      createdAt: new Date(now - 12 * 60 * 60 * 1000),
      read: false,
    },
  ];

  const seededMessages = [];

  for (const m of rawMessages) {
    const docData = {
      id: m.id,
      threadId: m.threadId,
      subject: m.subject,
      content: m.body,
      body: m.body,
      senderId: m.sender.uid,
      senderHandle: m.sender.handle,
      senderEmail: m.sender.email,
      senderName: m.sender.name,
      senderPersona: m.sender.persona,
      recipientId: m.recipient.uid,
      recipientHandle: m.recipient.handle,
      recipientEmail: m.recipient.email,
      recipientName: m.recipient.name,
      recipientPersona: m.recipient.persona,
      attachmentProjectId: m.attachmentProjectId,
      projectId: m.attachmentProjectId,
      syntheticAgent: true,
      createdAt: m.createdAt.toISOString(),
      read: m.read,
    };

    // 1. Write to Firestore `messages`
    await adminDb.collection('messages').doc(m.id).set(docData, { merge: true });

    // 2. Write to Firestore `inboxItems`
    const inboxId = `inb_${m.id}`;
    await adminDb.collection('inboxItems').doc(inboxId).set(
      {
        id: inboxId,
        recipientUid: m.recipient.uid,
        recipientHandle: m.recipient.handle,
        organizationId: 'org_paperworking_seed',
        type: 'message',
        category: 'message',
        title: m.subject,
        body: m.body,
        senderUid: m.sender.uid,
        senderName: m.sender.name,
        senderEmail: m.sender.email,
        attachmentProjectId: m.attachmentProjectId,
        projectId: m.attachmentProjectId,
        threadId: m.threadId,
        read: m.read,
        syntheticAgent: true,
        createdAt: m.createdAt.toISOString(),
      },
      { merge: true }
    );

    // 3. Upsert to Prisma `Message` using real user IDs and threadId
    await prisma.message.upsert({
      where: { id: m.id },
      update: {
        threadId: m.threadId,
        senderId: m.sender.uid,
        recipientId: m.recipient.uid,
        subject: m.subject,
        body: m.body,
        attachmentProjectId: m.attachmentProjectId,
        read: m.read,
        syntheticAgent: true,
        createdAt: m.createdAt,
      },
      create: {
        id: m.id,
        threadId: m.threadId,
        senderId: m.sender.uid,
        recipientId: m.recipient.uid,
        subject: m.subject,
        body: m.body,
        attachmentProjectId: m.attachmentProjectId,
        read: m.read,
        syntheticAgent: true,
        createdAt: m.createdAt,
      },
    });

    seededMessages.push(docData);
    console.log(
      `   ✉️ Message Seeded: ${m.id} [${m.sender.name} ➔ ${m.recipient.name}] — "${m.subject}" (${m.read ? 'READ' : 'UNREAD'})`
    );
  }

  console.log(`🎉 Seeded 11 messages across 10 threads`);
  return seededMessages;
}

if (require.main === module) {
  seedAgentMessages()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Failed to seed agent messages:', err);
      process.exit(1);
    });
}
