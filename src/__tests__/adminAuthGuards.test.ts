import { NextRequest } from 'next/server';
import { GET as getAgentCrew } from '@/app/api/admin/agent-crew/route';
import { GET as getAgentDetail, DELETE as deleteAgent } from '@/app/api/admin/agent-crew/[id]/route';
import { POST as impersonateAgent } from '@/app/api/admin/agent-crew/[id]/impersonate/route';
import { DELETE as purgeAllAgents } from '@/app/api/admin/agent-crew/purge-all/route';
import { GET as getLenderRates, PUT as putLenderRates } from '@/app/api/admin/lender-rates/route';
import { GET as getLenderChecklists, PUT as putLenderChecklists } from '@/app/api/admin/lender-checklists/route';
import { GET as getRentcastUsage } from '@/app/api/admin/rentcast-usage/route';

// Mock dependencies
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockImplementation((token: string) => {
      if (token === 'non_admin_token') {
        return Promise.resolve({ uid: 'user_investor', role: 'INVESTOR' });
      }
      if (token === 'admin_token') {
        return Promise.resolve({ uid: 'user_admin', role: 'ADMIN' });
      }
      return Promise.reject(new Error('Invalid token'));
    }),
  },
  adminDb: {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: jest.fn().mockResolvedValue({}),
      }),
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
        }),
      }),
    }),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    appUser: {
      findUnique: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    reilProject: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    marketplaceListing: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    message: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    subscription: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    project: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  },
}));

describe('BUG-004 — Admin API Route Authorization Matrix', () => {
  const routes: Array<{
    name: string;
    handler: (req: NextRequest, ctx?: any) => Promise<any>;
    params?: any;
    method: string;
    body?: any;
  }> = [
    { name: 'GET /api/admin/agent-crew', handler: getAgentCrew, method: 'GET' },
    { name: 'GET /api/admin/agent-crew/[id]', handler: (req) => getAgentDetail(req, { params: Promise.resolve({ id: 'agent_1' }) }), method: 'GET' },
    { name: 'DELETE /api/admin/agent-crew/[id]', handler: (req) => deleteAgent(req, { params: Promise.resolve({ id: 'agent_1' }) }), method: 'DELETE' },
    { name: 'POST /api/admin/agent-crew/[id]/impersonate', handler: (req) => impersonateAgent(req, { params: Promise.resolve({ id: 'agent_1' }) }), method: 'POST' },
    { name: 'DELETE /api/admin/agent-crew/purge-all', handler: purgeAllAgents, method: 'DELETE' },
    { name: 'GET /api/admin/lender-rates', handler: getLenderRates, method: 'GET' },
    { name: 'PUT /api/admin/lender-rates', handler: putLenderRates, method: 'PUT', body: { rates: [{ id: 'conventional', interestRate: 6.5, points: 1, lenderFeesCents: 1000 }] } },
    { name: 'GET /api/admin/lender-checklists', handler: getLenderChecklists, method: 'GET' },
    { name: 'PUT /api/admin/lender-checklists', handler: putLenderChecklists, method: 'PUT', body: { Conventional: ['Tax Returns'] } },
    { name: 'GET /api/admin/rentcast-usage', handler: getRentcastUsage, method: 'GET' },
  ];

  routes.forEach(({ name, handler, method, body }) => {
    describe(name, () => {
      it('rejects unauthenticated caller with 401 Unauthorized', async () => {
        const init: any = { method };
        if (body) init.body = JSON.stringify(body);
        const req = new NextRequest(`http://localhost:3000${name.split(' ')[1]}`, init);
        const res = await handler(req);
        expect(res.status).toBe(401);
      });

      it('rejects authenticated non-admin caller with 403 Forbidden', async () => {
        const init: any = {
          method,
          headers: { authorization: 'Bearer non_admin_token' },
        };
        if (body) init.body = JSON.stringify(body);
        const req = new NextRequest(`http://localhost:3000${name.split(' ')[1]}`, init);
        const res = await handler(req);
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error).toBe('Forbidden');
      });

      it('allows authenticated admin caller to execute handler', async () => {
        const init: any = {
          method,
          headers: { authorization: 'Bearer admin_token' },
        };
        if (body) init.body = JSON.stringify(body);
        const req = new NextRequest(`http://localhost:3000${name.split(' ')[1]}`, init);
        const res = await handler(req);
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      });
    });
  });
});
