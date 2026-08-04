import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fs from 'fs';
import { adminDb } from '../lib/firebase/admin';
import { prisma } from '../lib/prisma';

describe('Synthetic Agent Crew Seeder Tests', () => {
  const fixturePath = path.resolve(process.cwd(), 'src/test/fixtures/agent-crew-seed.json');

  it('should have created the fixture file with 5 agents', () => {
    expect(fs.existsSync(fixturePath)).toBe(true);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
    expect(fixture.agents).toHaveLength(5);
  });

  const expectedAgents = [
    { email: 'marcus.chen.synthetic@paperworking.co', persona: 'wholesaler', handle: 'marcus_chen', count: 3 },
    { email: 'dana.rodriguez.synthetic@paperworking.co', persona: 'fix_and_flip', handle: 'dana_rodriguez', count: 3 },
    { email: 'whitmore.synthetic@paperworking.co', persona: 'buy_and_hold', handle: 'whitmore', count: 3 },
    { email: 'robert.kim.synthetic@paperworking.co', persona: 'commercial', handle: 'robert_kim', count: 3 },
    { email: 'eleanor.vance.synthetic@paperworking.co', persona: 'syndicator', handle: 'eleanor_vance', count: 3 },
  ];

  for (const agent of expectedAgents) {
    describe(`Agent Verification: ${agent.email}`, () => {
      it('should exist in Firestore with syntheticAgent = true', async () => {
        const snap = await adminDb.collection('users').where('email', '==', agent.email).get();
        expect(snap.empty).toBe(false);
        const doc = snap.docs[0].data();
        expect(doc.syntheticAgent).toBe(true);
        expect(doc.agentPersona).toBe(agent.persona);
        expect(doc.stripeCustomerId).toBeDefined();
        expect(doc.stripeSubscriptionId).toBeDefined();
      });

      it('should exist in Prisma with syntheticAgent = true', async () => {
        const user = await prisma.user.findUnique({ where: { email: agent.email } });
        expect(user).not.toBeNull();
        expect(user?.syntheticAgent).toBe(true);
        expect(user?.agentPersona).toBe(agent.persona);

        const appUser = await prisma.appUser.findUnique({ where: { email: agent.email } });
        expect(appUser).not.toBeNull();
        expect(appUser?.syntheticAgent).toBe(true);
      });

      it(`should have ${agent.count} projects in Firestore & Prisma with listedByAgent = ${agent.handle}`, async () => {
        const snap = await adminDb
          .collection('projects')
          .where('listedByAgent', '==', agent.handle)
          .get();
        expect(snap.docs).toHaveLength(agent.count);

        for (const doc of snap.docs) {
          const p = doc.data();
          expect(p.syntheticAgent).toBe(true);
          expect(p.listedByAgent).toBe(agent.handle);
        }

        const prismaProjects = await prisma.reilProject.findMany({
          where: { listedByAgent: agent.handle },
        });
        expect(prismaProjects).toHaveLength(agent.count);
        for (const p of prismaProjects) {
          expect(p.syntheticAgent).toBe(true);
          expect(p.listedByAgent).toBe(agent.handle);
        }
      });
    });
  }

  it('should have 15 total synthetic projects in the database', async () => {
    const firestoreProjects = await adminDb
      .collection('projects')
      .where('syntheticAgent', '==', true)
      .get();
    expect(firestoreProjects.docs.length).toBeGreaterThanOrEqual(15);

    const prismaProjects = await prisma.reilProject.findMany({
      where: { syntheticAgent: true },
    });
    expect(prismaProjects.length).toBeGreaterThanOrEqual(15);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
