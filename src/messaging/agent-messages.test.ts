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
