import path from 'path';
import dotenv from 'dotenv';
import { NextRequest } from 'next/server';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { GET as getRoster } from '@/app/api/admin/agent-crew/route';
import { GET as getAgentDetail } from '@/app/api/admin/agent-crew/[id]/route';
import { POST as impersonateAgent } from '@/app/api/admin/agent-crew/[id]/impersonate/route';
import { prisma } from '@/lib/prisma';

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
