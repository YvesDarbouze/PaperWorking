import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fs from 'fs';
import { adminDb } from '../lib/firebase/admin';
import { prisma } from '../lib/prisma';

const mockFixturePath = path.resolve(process.cwd(), 'src/test/fixtures/agent-crew-seed.json');
const mockFixture = fs.existsSync(mockFixturePath)
  ? JSON.parse(fs.readFileSync(mockFixturePath, 'utf-8'))
  : { agents: [] };
const mockAgents = mockFixture.agents || [];
const mockProjects = mockAgents.flatMap(
  (a: { handle: string; projects?: Array<Record<string, unknown>> }) =>
    (a.projects || []).map((p) => ({ ...p, syntheticAgent: true, listedByAgent: a.handle }))
);

jest.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { email?: string; id?: string } }) => {
        const agent = mockAgents.find(
          (a: { email: string; uid: string; id?: string }) =>
            (where.email && a.email === where.email) ||
            (where.id && (a.uid === where.id || a.id === where.id))
        );
        if (!agent) return Promise.resolve(null);
        return Promise.resolve({
          id: agent.uid,
          email: agent.email,
          name: agent.name,
          syntheticAgent: true,
          agentPersona: agent.persona,
        });
      }),
      findMany: jest.fn().mockImplementation(({ where }: { where?: { syntheticAgent?: boolean } }) => {
        if (where?.syntheticAgent) {
          return Promise.resolve(
            mockAgents.map((a: { uid: string; email: string; name: string; persona: string }) => ({
              id: a.uid,
              email: a.email,
              name: a.name,
              syntheticAgent: true,
              agentPersona: a.persona,
            }))
          );
        }
        return Promise.resolve([]);
      }),
    },
    appUser: {
      findUnique: jest.fn().mockImplementation(({ where }: { where: { email?: string; id?: string } }) => {
        const agent = mockAgents.find(
          (a: { email: string; uid: string; id?: string }) =>
            (where.email && a.email === where.email) ||
            (where.id && (a.uid === where.id || a.id === where.id))
        );
        if (!agent) return Promise.resolve(null);
        return Promise.resolve({
          id: agent.uid,
          email: agent.email,
          displayName: agent.name,
          syntheticAgent: true,
        });
      }),
    },
    reilProject: {
      findMany: jest.fn().mockImplementation(
        ({ where }: { where?: { listedByAgent?: string; syntheticAgent?: boolean } }) => {
          let res = mockProjects;
          if (where?.listedByAgent) {
            res = res.filter((p: { listedByAgent?: string }) => p.listedByAgent === where.listedByAgent);
          }
          if (where?.syntheticAgent) {
            res = res.filter((p: { syntheticAgent?: boolean }) => p.syntheticAgent === true);
          }
          return Promise.resolve(res);
        }
      ),
    },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          where: jest.fn().mockImplementation((field: string, _op: string, val: unknown) => ({
            get: jest.fn().mockImplementation(() => {
              const filtered = mockAgents.filter((a: { email?: string; syntheticAgent?: boolean }) => {
                if (field === 'email') return a.email === val;
                if (field === 'syntheticAgent') return a.syntheticAgent === val;
                return true;
              });
              return Promise.resolve({
                empty: filtered.length === 0,
                docs: filtered.map((a: { uid: string; email: string; name: string; persona: string; stripeCustomerId?: string; stripeSubscriptionId?: string }) => ({
                  id: a.uid,
                  data: () => ({
                    uid: a.uid,
                    email: a.email,
                    displayName: a.name,
                    syntheticAgent: true,
                    agentPersona: a.persona,
                    stripeCustomerId: a.stripeCustomerId,
                    stripeSubscriptionId: a.stripeSubscriptionId,
                  }),
                })),
              });
            }),
          })),
        };
      }
      if (collectionName === 'projects') {
        return {
          where: jest.fn().mockImplementation((field: string, _op: string, val: unknown) => ({
            get: jest.fn().mockImplementation(() => {
              const filtered = mockProjects.filter((p: { listedByAgent?: string; syntheticAgent?: boolean }) => {
                if (field === 'listedByAgent') return p.listedByAgent === val;
                if (field === 'syntheticAgent') return p.syntheticAgent === val;
                return true;
              });
              return Promise.resolve({
                empty: filtered.length === 0,
                docs: filtered.map((p: Record<string, unknown>) => ({
                  id: p.id as string,
                  data: () => ({
                    ...p,
                    syntheticAgent: true,
                    listedByAgent: p.listedByAgent,
                  }),
                })),
              });
            }),
          })),
        };
      }
      return {
        where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) }),
      };
    }),
  },
}));

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
