import { buildImpersonationCookies, handleAdminAgentCrewImpersonatePost } from '@paperworking/api';

describe('integration — admin impersonation audit', () => {
  const adminAuth = { uid: 'dev-admin-1', role: 'admin', isAdmin: true };

  it('blocks impersonation without admin role', async () => {
    const result = await handleAdminAgentCrewImpersonatePost('agent-scout', {
      requireAdmin: async () => ({ status: 403, body: { error: 'Admin access required' } }),
    });

    expect(result.status).toBe(403);
  });

  it('sets auditable impersonation cookies and redirect target', async () => {
    const result = await handleAdminAgentCrewImpersonatePost('agent-scout', {
      requireAdmin: async () => adminAuth,
      loadAgent: async () => ({
        id: 'agent-scout',
        email: 'scout@paperworking.test',
        name: 'Scout Agent',
        persona: 'wholesaler',
      }),
    });

    expect(result.status).toBe(200);
    const body = result.body as {
      success: boolean;
      redirectUrl: string;
      agent: { id: string; email: string };
    };
    expect(body.success).toBe(true);
    expect(body.redirectUrl).toBe('/dashboard');
    expect(body.agent.id).toBe('agent-scout');

    const cookies = result.cookies ?? [];
    const names = cookies.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining(['__session', 'mock_user_uid', 'mock_user_email', 'mock_user_name']),
    );

    const auditCookies = buildImpersonationCookies({
      agentId: 'agent-scout',
      email: 'scout@paperworking.test',
      name: 'Scout Agent',
    });
    expect(auditCookies.find((c) => c.name === '__session')?.value).toContain('agent-scout');
  });
});
