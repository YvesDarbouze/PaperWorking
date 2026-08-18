import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fs from 'fs';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getMessages } from '@/app/api/messages/route';
import { GET as getThreadMessages } from '@/app/api/messages/thread/[threadId]/route';

import { seedAgentMessages } from '../scripts/seedAgentMessages';

jest.mock('../scripts/seedAgentMessages', () => ({
  seedAgentMessages: jest.fn().mockResolvedValue(undefined),
}));

const mockFixturePath = path.resolve(process.cwd(), 'src/test/fixtures/agent-crew-seed.json');
const mockFixtureData = fs.existsSync(mockFixturePath)
  ? JSON.parse(fs.readFileSync(mockFixturePath, 'utf8'))
  : { agents: [] };
const mockAgentsMap = new Map<string, { uid: string; name: string; email: string; persona: string }>();
for (const agent of mockFixtureData.agents || []) {
  mockAgentsMap.set(agent.handle, agent);
}

const mockMarcus = mockAgentsMap.get('marcus_chen');
const mockDana = mockAgentsMap.get('dana_rodriguez');
const mockWhitmore = mockAgentsMap.get('whitmore');
const mockAtlas = mockAgentsMap.get('robert_kim');
const mockEleanor = mockAgentsMap.get('eleanor_vance');

const mockNow = Date.now();
interface MockMsg {
  id: string;
  senderId?: string;
  recipientId?: string;
  threadId?: string;
  subject?: string;
  body?: string;
  content?: string;
  attachmentProjectId?: string | null;
  createdAt: Date;
  read: boolean;
  syntheticAgent: boolean;
  sender?: { id?: string; name?: string; email?: string; agentPersona?: string };
  recipient?: { id?: string; name?: string; email?: string; agentPersona?: string };
}

const mockMessagesList: MockMsg[] = [
  {
    id: 'msg_seed_1',
    threadId: 'thread-marcus-whitmore-akron',
    senderId: mockMarcus?.uid,
    recipientId: mockWhitmore?.uid,
    subject: 'Akron Assignment Ready',
    body: "We'll take the Akron assignment. Send the contract to j.whitmore@email.com. Closing in 10 days.",
    content: "We'll take the Akron assignment. Send the contract to j.whitmore@email.com. Closing in 10 days.",
    attachmentProjectId: 'proj_marcus_chen_2',
    createdAt: new Date(mockNow - 10 * 24 * 60 * 60 * 1000),
    read: true,
    syntheticAgent: true,
    sender: { id: mockMarcus?.uid, name: mockMarcus?.name, email: mockMarcus?.email, agentPersona: mockMarcus?.persona },
    recipient: { id: mockWhitmore?.uid, name: mockWhitmore?.name, email: mockWhitmore?.email, agentPersona: mockWhitmore?.persona },
  },
  {
    id: 'msg_seed_2',
    threadId: 'thread-marcus-dana-phoenix',
    senderId: mockMarcus?.uid,
    recipientId: mockDana?.uid,
    subject: 'Phoenix Lead Incoming',
    body: 'Dana — got a Phoenix-area lead coming next month. Want first look? I wholesale, you flip. Should be a $300k ARV SFR.',
    content: 'Dana — got a Phoenix-area lead coming next month. Want first look? I wholesale, you flip. Should be a $300k ARV SFR.',
    attachmentProjectId: null,
    createdAt: new Date(mockNow - 7 * 24 * 60 * 60 * 1000),
    read: false,
    syntheticAgent: true,
    sender: { id: mockMarcus?.uid, name: mockMarcus?.name, email: mockMarcus?.email, agentPersona: mockMarcus?.persona },
    recipient: { id: mockDana?.uid, name: mockDana?.name, email: mockDana?.email, agentPersona: mockDana?.persona },
  },
  {
    id: 'msg_seed_3',
    threadId: 'thread-dana-atlas-gc',
    senderId: mockDana?.uid,
    recipientId: mockAtlas?.uid,
    subject: 'GC Referral Needed',
    body: 'Robert — need a commercial-grade GC referral in Dallas. Doing a 4-plex there next quarter. Someone who knows multi-family rehabs.',
    content: 'Robert — need a commercial-grade GC referral in Dallas. Doing a 4-plex there next quarter. Someone who knows multi-family rehabs.',
    attachmentProjectId: null,
    createdAt: new Date(mockNow - 5 * 24 * 60 * 60 * 1000),
    read: true,
    syntheticAgent: true,
    sender: { id: mockDana?.uid, name: mockDana?.name, email: mockDana?.email, agentPersona: mockDana?.persona },
    recipient: { id: mockAtlas?.uid, name: mockAtlas?.name, email: mockAtlas?.email, agentPersona: mockAtlas?.persona },
  },
  {
    id: 'msg_seed_4',
    threadId: 'thread-dana-marcus-reply',
    senderId: mockDana?.uid,
    recipientId: mockMarcus?.uid,
    subject: 'Re: Phoenix Lead',
    body: 'Send me that Phoenix lead when you get it. My rehab crew is hungry. We can close in 14 days.',
    content: 'Send me that Phoenix lead when you get it. My rehab crew is hungry. We can close in 14 days.',
    attachmentProjectId: null,
    createdAt: new Date(mockNow - 6 * 24 * 60 * 60 * 1000),
    read: true,
    syntheticAgent: true,
    sender: { id: mockDana?.uid, name: mockDana?.name, email: mockDana?.email, agentPersona: mockDana?.persona },
    recipient: { id: mockMarcus?.uid, name: mockMarcus?.name, email: mockMarcus?.email, agentPersona: mockMarcus?.persona },
  },
  {
    id: 'msg_seed_5',
    threadId: 'thread-whitmore-eleanor-lp',
    senderId: mockWhitmore?.uid,
    recipientId: mockEleanor?.uid,
    subject: 'LP Interest — Tampa',
    body: "We're looking to go passive on our next deal. What's your minimum LP check for the Tampa project? We can do $250k.",
    content: "We're looking to go passive on our next deal. What's your minimum LP check for the Tampa project? We can do $250k.",
    attachmentProjectId: null,
    createdAt: new Date(mockNow - 3 * 24 * 60 * 60 * 1000),
    read: false,
    syntheticAgent: true,
    sender: { id: mockWhitmore?.uid, name: mockWhitmore?.name, email: mockWhitmore?.email, agentPersona: mockWhitmore?.persona },
    recipient: { id: mockEleanor?.uid, name: mockEleanor?.name, email: mockEleanor?.email, agentPersona: mockEleanor?.persona },
  },
  {
    id: 'msg_seed_6',
    threadId: 'thread-whitmore-marcus-akron',
    senderId: mockWhitmore?.uid,
    recipientId: mockMarcus?.uid,
    subject: 'Re: Akron Assignment',
    body: "We'll take the Akron assignment. Contract sent. Let's schedule the title review.",
    content: "We'll take the Akron assignment. Contract sent. Let's schedule the title review.",
    attachmentProjectId: 'proj_marcus_chen_2',
    createdAt: new Date(mockNow - 9 * 24 * 60 * 60 * 1000),
    read: true,
    syntheticAgent: true,
    sender: { id: mockWhitmore?.uid, name: mockWhitmore?.name, email: mockWhitmore?.email, agentPersona: mockWhitmore?.persona },
    recipient: { id: mockMarcus?.uid, name: mockMarcus?.name, email: mockMarcus?.email, agentPersona: mockMarcus?.persona },
  },
  {
    id: 'msg_seed_7',
    threadId: 'thread-atlas-dallas-jv',
    senderId: mockAtlas?.uid,
    recipientId: mockDana?.uid,
    subject: 'Dallas 6-Plex JV',
    body: "We have a distressed 6-plex in Dallas that needs a full gut. Your rehab expertise + our capital = 60/40 split? Let's talk.",
    content: "We have a distressed 6-plex in Dallas that needs a full gut. Your rehab expertise + our capital = 60/40 split? Let's talk.",
    attachmentProjectId: null,
    createdAt: new Date(mockNow - 4 * 24 * 60 * 60 * 1000),
    read: false,
    syntheticAgent: true,
    sender: { id: mockAtlas?.uid, name: mockAtlas?.name, email: mockAtlas?.email, agentPersona: mockAtlas?.persona },
    recipient: { id: mockDana?.uid, name: mockDana?.name, email: mockDana?.email, agentPersona: mockDana?.persona },
  },
  {
    id: 'msg_seed_8',
    threadId: 'thread-atlas-eleanor-plano',
    senderId: mockAtlas?.uid,
    recipientId: mockEleanor?.uid,
    subject: 'Plano Strip Syndication',
    body: "Our Plano strip could be a value-add play. Ever syndicate retail? Let's talk. We could push rents 15% with minimal capex.",
    content: "Our Plano strip could be a value-add play. Ever syndicate retail? Let's talk. We could push rents 15% with minimal capex.",
    attachmentProjectId: 'proj_robert_kim_1',
    createdAt: new Date(mockNow - 2 * 24 * 60 * 60 * 1000),
    read: false,
    syntheticAgent: true,
    sender: { id: mockAtlas?.uid, name: mockAtlas?.name, email: mockAtlas?.email, agentPersona: mockAtlas?.persona },
    recipient: { id: mockEleanor?.uid, name: mockEleanor?.name, email: mockEleanor?.email, agentPersona: mockEleanor?.persona },
  },
  {
    id: 'msg_seed_9',
    threadId: 'thread-eleanor-whitmore-tampa',
    senderId: mockEleanor?.uid,
    recipientId: mockWhitmore?.uid,
    subject: 'Tampa 70% Subscribed',
    body: 'Whitmores — Tampa deal is 70% subscribed. If you want in, I need a soft commit this week. $250k minimum, 8% pref, 18.4% projected IRR.',
    content: 'Whitmores — Tampa deal is 70% subscribed. If you want in, I need a soft commit this week. $250k minimum, 8% pref, 18.4% projected IRR.',
    attachmentProjectId: 'proj_eleanor_vance_1',
    createdAt: new Date(mockNow - 1 * 24 * 60 * 60 * 1000),
    read: false,
    syntheticAgent: true,
    sender: { id: mockEleanor?.uid, name: mockEleanor?.name, email: mockEleanor?.email, agentPersona: mockEleanor?.persona },
    recipient: { id: mockWhitmore?.uid, name: mockWhitmore?.name, email: mockWhitmore?.email, agentPersona: mockWhitmore?.persona },
  },
  {
    id: 'msg_seed_10',
    threadId: 'thread-eleanor-marcus-ohio',
    senderId: mockEleanor?.uid,
    recipientId: mockMarcus?.uid,
    subject: 'Ohio Off-Market Leads',
    body: "Marcus, any off-market 50+ unit leads in Ohio? We pay $10k finder's fee at closing. Need C-class value-add in Cleveland or Columbus.",
    content: "Marcus, any off-market 50+ unit leads in Ohio? We pay $10k finder's fee at closing. Need C-class value-add in Cleveland or Columbus.",
    attachmentProjectId: null,
    createdAt: new Date(mockNow - 8 * 60 * 60 * 1000),
    read: false,
    syntheticAgent: true,
    sender: { id: mockEleanor?.uid, name: mockEleanor?.name, email: mockEleanor?.email, agentPersona: mockEleanor?.persona },
    recipient: { id: mockMarcus?.uid, name: mockMarcus?.name, email: mockMarcus?.email, agentPersona: mockMarcus?.persona },
  },
  {
    id: 'msg_seed_11',
    threadId: 'thread-eleanor-atlas-dallas',
    senderId: mockEleanor?.uid,
    recipientId: mockAtlas?.uid,
    subject: 'Re: Dallas 6-Plex',
    body: "Robert, let's partner on that Dallas 6-plex. We bring the LP capital, you bring the commercial lease expertise. 50/50 on promote?",
    content: "Robert, let's partner on that Dallas 6-plex. We bring the LP capital, you bring the commercial lease expertise. 50/50 on promote?",
    attachmentProjectId: null,
    createdAt: new Date(mockNow - 12 * 60 * 60 * 1000),
    read: false,
    syntheticAgent: true,
    sender: { id: mockEleanor?.uid, name: mockEleanor?.name, email: mockEleanor?.email, agentPersona: mockEleanor?.persona },
    recipient: { id: mockAtlas?.uid, name: mockAtlas?.name, email: mockAtlas?.email, agentPersona: mockAtlas?.persona },
  },
];

function matchesMsg(msg: MockMsg, where: Record<string, unknown> | undefined): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (k === 'attachmentProjectId') {
      if (v && typeof v === 'object' && 'not' in v) {
        if (msg.attachmentProjectId === null || msg.attachmentProjectId === undefined) return false;
      } else if (msg.attachmentProjectId !== v) {
        return false;
      }
    } else if (k === 'read') {
      if (msg.read !== v) return false;
    } else if (k === 'syntheticAgent') {
      if (msg.syntheticAgent !== v) return false;
    } else if (k === 'recipientId') {
      if (msg.recipientId !== v) return false;
    } else if (k === 'senderId') {
      if (msg.senderId !== v) return false;
    } else if (k === 'threadId') {
      if (msg.threadId !== v) return false;
    }
  }
  return true;
}

jest.mock('../scripts/seedAgentMessages', () => ({
  seedAgentMessages: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    message: {
      findMany: jest.fn().mockImplementation(({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: { createdAt?: 'asc' | 'desc' } } = {}) => {
        let list = mockMessagesList.filter((m) => matchesMsg(m, where));
        if (orderBy?.createdAt === 'asc') {
          list = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        } else if (orderBy?.createdAt === 'desc') {
          list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return Promise.resolve(list);
      }),
      count: jest.fn().mockImplementation(({ where }: { where?: Record<string, unknown> } = {}) => {
        const count = mockMessagesList.filter((m) => matchesMsg(m, where)).length;
        return Promise.resolve(count);
      }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    user: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    project: {
      upsert: jest.fn().mockResolvedValue({}),
    },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Real-Space Cross-Agent Messaging Suite', () => {
  let fixtureData: any;
  let marcusUid: string;
  let danaUid: string;
  let whitmoreUid: string;
  let atlasUid: string;
  let eleanorUid: string;

  beforeAll(async () => {
    // Re-seed DB to guarantee exact unread matrix state
    await seedAgentMessages();

    const fixturePath = path.resolve(process.cwd(), 'src/test/fixtures/agent-crew-seed.json');
    expect(fs.existsSync(fixturePath)).toBe(true);

    fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const agentsMap = new Map<string, any>();
    for (const agent of fixtureData.agents) {
      agentsMap.set(agent.handle, agent);
    }

    marcusUid = agentsMap.get('marcus_chen')?.uid;
    danaUid = agentsMap.get('dana_rodriguez')?.uid;
    whitmoreUid = agentsMap.get('whitmore')?.uid;
    atlasUid = agentsMap.get('robert_kim')?.uid;
    eleanorUid = agentsMap.get('eleanor_vance')?.uid;

    expect(marcusUid).toBeTruthy();
    expect(danaUid).toBeTruthy();
    expect(whitmoreUid).toBeTruthy();
    expect(atlasUid).toBeTruthy();
    expect(eleanorUid).toBeTruthy();
  }, 30000);

  it('verifies all 11 seeded messages exist in Prisma DB with syntheticAgent = true', async () => {
    const messages = await prisma.message.findMany({
      where: { syntheticAgent: true },
    });
    expect(messages.length).toBe(11);
    for (const msg of messages) {
      expect(msg.syntheticAgent).toBe(true);
      expect(msg.threadId).toBeTruthy();
      expect(msg.senderId).toBeTruthy();
      expect(msg.recipientId).toBeTruthy();
    }
  });

  it('verifies correct sender/recipient pairs for each threadId', async () => {
    const thread1 = await prisma.message.findMany({ where: { threadId: 'thread-marcus-whitmore-akron' } });
    expect(thread1.length).toBe(1);
    expect(thread1[0].senderId).toBe(marcusUid);
    expect(thread1[0].recipientId).toBe(whitmoreUid);

    const thread2 = await prisma.message.findMany({ where: { threadId: 'thread-marcus-dana-phoenix' } });
    expect(thread2.length).toBe(1);
    expect(thread2[0].senderId).toBe(marcusUid);
    expect(thread2[0].recipientId).toBe(danaUid);

    const thread9 = await prisma.message.findMany({ where: { threadId: 'thread-eleanor-whitmore-tampa' } });
    expect(thread9.length).toBe(1);
    expect(thread9[0].senderId).toBe(eleanorUid);
    expect(thread9[0].recipientId).toBe(whitmoreUid);
  });

  it('verifies correct overall read/unread counts (4 read, 7 unread) and unread matrix', async () => {
    const readMessages = await prisma.message.findMany({ where: { syntheticAgent: true, read: true } });
    const unreadMessages = await prisma.message.findMany({ where: { syntheticAgent: true, read: false } });

    expect(readMessages.length).toBe(4);
    expect(unreadMessages.length).toBe(7);

    // Verify per-agent unread matrix
    const marcusUnread = await prisma.message.count({ where: { recipientId: marcusUid, read: false } });
    const danaUnread = await prisma.message.count({ where: { recipientId: danaUid, read: false } });
    const whitmoreUnread = await prisma.message.count({ where: { recipientId: whitmoreUid, read: false } });
    const atlasUnread = await prisma.message.count({ where: { recipientId: atlasUid, read: false } });
    const eleanorUnread = await prisma.message.count({ where: { recipientId: eleanorUid, read: false } });

    expect(marcusUnread).toBe(1);
    expect(danaUnread).toBe(2);
    expect(whitmoreUnread).toBe(1);
    expect(atlasUnread).toBe(1);
    expect(eleanorUnread).toBe(2);
  });

  it('verifies project attachments link to valid project IDs', async () => {
    const attachedMessages = await prisma.message.findMany({
      where: { attachmentProjectId: { not: null } },
    });

    expect(attachedMessages.length).toBeGreaterThanOrEqual(4);
    for (const msg of attachedMessages) {
      expect(['proj_marcus_chen_2', 'proj_robert_kim_1', 'proj_eleanor_vance_1']).toContain(msg.attachmentProjectId);
    }
  });

  it('verifies timestamps are within expected ranges staggered over last 10 days', async () => {
    const messages = await prisma.message.findMany({
      where: { syntheticAgent: true },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    const tenDaysAgo = now - 11 * 24 * 60 * 60 * 1000;

    for (const msg of messages) {
      const msgTime = new Date(msg.createdAt).getTime();
      expect(msgTime).toBeLessThanOrEqual(now + 60000);
      expect(msgTime).toBeGreaterThanOrEqual(tenDaysAgo);
    }
  });

  it('API GET /api/messages returns inbox for Dana Rodriguez', async () => {
    const req = new NextRequest(`http://localhost:3000/api/messages?userId=${danaUid}`);
    const res = await getMessages(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.messages).toBeDefined();

    // Messages received by Dana: msg 2 (Phoenix Lead), msg 7 (Dallas 6-Plex JV)
    expect(data.messages.length).toBe(2);
    expect(data.unreadCount).toBe(2);
  });

  it('API GET /api/messages/thread/[threadId] returns full conversation thread', async () => {
    const req = new NextRequest('http://localhost:3000/api/messages/thread/thread-marcus-whitmore-akron');
    const params = Promise.resolve({ threadId: 'thread-marcus-whitmore-akron' });
    const res = await getThreadMessages(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.messages.length).toBe(1);
    expect(data.messages[0].subject).toBe('Akron Assignment Ready');
  });
});
