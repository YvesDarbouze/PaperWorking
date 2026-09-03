import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildImpersonationCookies, handleAdminAgentCrewImpersonatePost } from '@paperworking/api';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '../..');

describe('phase D — admin impersonation BFF', () => {
  it('BFF route delegates to shared handler with audit + admin command repo', () => {
    const route = readFileSync(
      join(webRoot, 'app/api/admin/agent-crew/[id]/impersonate/route.ts'),
      'utf8',
    );
    expect(route).toContain('handleAdminAgentCrewImpersonatePost');
    expect(route).toContain('buildAdminCommandRepository');
    expect(route).toContain('findSyntheticAgentById');
    expect(route).toContain('writeAuditLog');
    expect(route).toContain('toNextResponse');
    expect(route).toContain('isAuthorizedAdmin');
  });

  it('AdminAgentCrewPanel uses same-origin impersonation helper', () => {
    const panel = readFileSync(join(webRoot, 'components/admin/AdminAgentCrewPanel.tsx'), 'utf8');
    expect(panel).toContain('impersonateAdminAgentFromBff');
    expect(panel).not.toContain('impersonateAgentViaLegacyNest');
    expect(panel).not.toContain('NEXT_PUBLIC_API_URL');
  });

  it('shared handler records audit before issuing cookies', async () => {
    const auditCalls: string[] = [];
    const result = await handleAdminAgentCrewImpersonatePost('agent-scout', {
      requireAdmin: async () => ({
        uid: 'admin-1',
        role: 'admin',
        isAdmin: true,
        email: 'admin@test.com',
      }),
      loadAgent: async () => ({
        id: 'agent-scout',
        email: 'scout@test.com',
        name: 'Scout',
        persona: 'wholesaler',
      }),
      recordAudit: async ({ agentId }) => {
        auditCalls.push(agentId);
      },
    });

    expect(result.status).toBe(200);
    expect(auditCalls).toEqual(['agent-scout']);
    expect(result.cookies?.map((c) => c.name)).toEqual(
      expect.arrayContaining(['__session', 'mock_user_uid', 'mock_user_email', 'mock_user_name']),
    );
  });

  it('rejects non-admin impersonation attempts', async () => {
    const result = await handleAdminAgentCrewImpersonatePost('agent-scout', {
      requireAdmin: async () => ({ status: 403, body: { error: 'Admin access required' } }),
    });
    expect(result.status).toBe(403);
  });

  it('impersonation cookies match buildImpersonationCookies contract', () => {
    const cookies = buildImpersonationCookies({
      agentId: 'agent-scout',
      email: 'scout@test.com',
      name: 'Scout',
    });
    expect(cookies.find((c) => c.name === '__session')?.options?.httpOnly).toBe(true);
    expect(cookies.find((c) => c.name === '__session')?.value).toContain('agent-scout');
  });
});

describe('phase D — production browser Nest dependency removed', () => {
  it('admin-api no longer re-exports legacy apiFetch impersonation', () => {
    const source = readFileSync(join(webRoot, 'lib/admin/admin-api.ts'), 'utf8');
    expect(source).toContain('impersonateAdminAgentFromBff');
    expect(source).not.toContain('impersonateAgentViaLegacyNest');
    expect(source).not.toContain("from '@/lib/api/client'");
  });
});
