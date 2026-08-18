import path from 'path';
import dotenv from 'dotenv';
import { NextRequest } from 'next/server';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fs from 'fs';
import { GET as getRoster } from '@/app/api/admin/agent-crew/route';
import { GET as getAgentDetail } from '@/app/api/admin/agent-crew/[id]/route';
import { POST as impersonateAgent } from '@/app/api/admin/agent-crew/[id]/impersonate/route';
import { prisma } from '@/lib/prisma';

const mockGetSeedAgents = () => {
  const p = path.resolve(process.cwd(), 'src/test/fixtures/agent-crew-seed.json');
  return fs.existsSync(p) ? (JSON.parse(fs.readFileSync(p, 'utf-8')).agents || []) : [];
};

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn().mockImplementation(() => {
        const agents = mockGetSeedAgents();
        return Promise.resolve(
          agents.map((a: { uid: string; email: string; name: string; persona: string }) => ({
            id: a.uid,
            email: a.email,
            name: a.name,
            syntheticAgent: true,
            agentPersona: a.persona,
          }))
        );
      }),
      findUnique: jest.fn().mockImplementation(({ where }: { where: { id?: string; email?: string } }) => {
        const agents = mockGetSeedAgents();
        const agent = agents.find(
          (a: { uid: string; email: string }) => a.uid === where.id || a.email === where.email
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
      findFirst: jest.fn().mockImplementation(({ where }: { where?: { id?: string; email?: string } }) => {
        const agents = mockGetSeedAgents();
        const agent = agents.find(
          (a: { uid: string; email: string }) => a.uid === where?.id || a.email === where?.email
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
    },
    appUser: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    reilProject: {
      findMany: jest.fn().mockImplementation(({ where }: { where?: { listedByAgent?: string; syntheticAgent?: boolean } } = {}) => {
        const agents = mockGetSeedAgents();
        let list = agents.flatMap((a: { handle: string; projects?: Array<Record<string, unknown>> }) =>
          (a.projects || []).map((proj) => ({ ...proj, syntheticAgent: true, listedByAgent: a.handle }))
        );
        if (where?.listedByAgent) {
          list = list.filter((p: { listedByAgent?: string }) => p.listedByAgent === where.listedByAgent);
        }
        if (where?.syntheticAgent) {
          list = list.filter((p: { syntheticAgent?: boolean }) => p.syntheticAgent === true);
        }
        return Promise.resolve(list);
      }),
      count: jest.fn().mockImplementation(({ where }: { where?: { listedByAgent?: string; syntheticAgent?: boolean } } = {}) => {
        const agents = mockGetSeedAgents();
        let list = agents.flatMap((a: { handle: string; projects?: Array<Record<string, unknown>> }) =>
          (a.projects || []).map((proj) => ({ ...proj, syntheticAgent: true, listedByAgent: a.handle }))
        );
        if (where?.listedByAgent) {
          list = list.filter((p: { listedByAgent?: string }) => p.listedByAgent === where.listedByAgent);
        }
        if (where?.syntheticAgent) {
          list = list.filter((p: { syntheticAgent?: boolean }) => p.syntheticAgent === true);
        }
        return Promise.resolve(list.length);
      }),
    },
    marketplaceListing: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(3),
    },
    message: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(2),
    },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/firebase/admin', () => {
  const loadMockProjects = () => {
    const agents = mockGetSeedAgents();
    return agents.flatMap((a: { handle: string; projects?: Array<Record<string, unknown>> }) =>
      (a.projects || []).map((proj) => ({ ...proj, syntheticAgent: true, listedByAgent: a.handle }))
    );
  };

  return {
    adminDb: {
      collection: jest.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'users') {
          return {
            doc: jest.fn().mockImplementation((id: string) => {
              const agents = mockGetSeedAgents();
              const agent = agents.find(
                (a: { uid: string; handle: string }) => a.uid === id || a.handle === id
              );
              return {
                get: jest.fn().mockResolvedValue({
                  exists: !!agent,
                  id: agent ? agent.uid : id,
                  data: () =>
                    agent
                      ? {
                          id: agent.uid,
                          uid: agent.uid,
                          displayName: agent.name,
                          name: agent.name,
                          email: agent.email,
                          syntheticAgent: true,
                          agentPersona: agent.persona,
                          handle: agent.handle,
                          stripeCustomerId: agent.stripeCustomerId,
                          stripeSubscriptionId: agent.stripeSubscriptionId,
                        }
                      : null,
                }),
              };
            }),
            where: jest.fn().mockImplementation((field: string, _op: string, val: unknown) => ({
              get: jest.fn().mockImplementation(() => {
                const agents = mockGetSeedAgents();
                const filtered = agents.filter((a: { syntheticAgent?: boolean }) => {
                  if (field === 'syntheticAgent') return a.syntheticAgent === val;
                  return true;
                });
                return Promise.resolve({
                  empty: filtered.length === 0,
                  size: filtered.length,
                  docs: filtered.map((a: { uid: string; name: string; email: string; persona: string; handle: string; stripeCustomerId?: string; stripeSubscriptionId?: string }) => ({
                    id: a.uid,
                    data: () => ({
                      id: a.uid,
                      uid: a.uid,
                      displayName: a.name,
                      name: a.name,
                      email: a.email,
                      syntheticAgent: true,
                      agentPersona: a.persona,
                      handle: a.handle,
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
                const projects = loadMockProjects();
                const filtered = projects.filter((p: { listedByAgent?: string; syntheticAgent?: boolean }) => {
                  if (field === 'listedByAgent') return p.listedByAgent === val;
                  if (field === 'syntheticAgent') return p.syntheticAgent === val;
                  return true;
                });
                return Promise.resolve({
                  empty: filtered.length === 0,
                  size: filtered.length,
                  docs: filtered.map((p: Record<string, unknown>) => ({
                    id: p.id,
                    data: () => ({ ...p, syntheticAgent: true, listedByAgent: p.listedByAgent }),
                  })),
                });
              }),
            })),
          };
        }
        return {
          doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ exists: false, data: () => null }) }),
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ empty: true, size: 0, docs: [] }),
          }),
        };
      }),
    },
    adminAuth: {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'mock_session_token_123', email: 'admin@paperworking.co' }),
    },
  };
});

describe('Admin Agent Crew Dashboard API & Route Guard Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Route Guards (403 Forbidden for Non-Admin)', () => {
    it('should return 403 Forbidden when non-admin requests roster', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/agent-crew', {
        headers: {
          'Authorization': 'Bearer mock_session_token_123',
          'x-user-role': 'INVESTOR', // Non-admin role
        },
      });

      const res = await getRoster(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('Forbidden');
    });

    it('should return 403 Forbidden when non-admin requests single agent detail', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/agent-crew/marcus_chen', {
        headers: {
          'Authorization': 'Bearer mock_session_token_123',
          'x-user-role': 'USER',
        },
      });

      const res = await getAgentDetail(req, { params: Promise.resolve({ id: 'marcus_chen' }) });
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when non-admin attempts impersonation', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/agent-crew/marcus_chen/impersonate', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock_session_token_123',
          'x-user-role': 'MEMBER',
        },
      });

      const res = await impersonateAgent(req, { params: Promise.resolve({ id: 'marcus_chen' }) });
      expect(res.status).toBe(403);
    });
  });

  describe('Admin Authorized API Responses', () => {
    it('should return 200 OK and 5 synthetic agents with aggregated stats when requested by ADMIN', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/agent-crew', {
        headers: {
          'Authorization': 'Bearer mock_session_token_123',
          'x-user-role': 'ADMIN',
        },
      });

      const res = await getRoster(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(5);
      expect(json.agents).toHaveLength(5);

      const marcus = json.agents.find((a: any) => a.email.includes('marcus.chen'));
      expect(marcus).toBeDefined();
      expect(marcus.persona).toBe('wholesaler');
      expect(marcus.stats.projectsCount).toBe(3);
    });

    it('should return single agent detail including portfolio projects when requested by SUPERUSER', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/agent-crew/CtUnIHS2kObMyERLGVdHW8bE0g63', {
        headers: {
          'Authorization': 'Bearer mock_session_token_123',
          'x-user-role': 'SUPERUSER',
        },
      });

      const res = await getAgentDetail(req, { params: Promise.resolve({ id: 'CtUnIHS2kObMyERLGVdHW8bE0g63' }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.agent.name).toBe('Marcus Chen');
      expect(json.agent.portfolio).toBeDefined();
      expect(json.agent.portfolio.length).toBeGreaterThanOrEqual(3);
    });

    it('should return impersonation session token and redirect URL for valid agent', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/agent-crew/CtUnIHS2kObMyERLGVdHW8bE0g63/impersonate', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock_session_token_123',
          'x-user-role': 'ADMIN',
        },
      });

      const res = await impersonateAgent(req, { params: Promise.resolve({ id: 'CtUnIHS2kObMyERLGVdHW8bE0g63' }) });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.redirectUrl).toBe('/dashboard/command-center');
    });
  });
});
