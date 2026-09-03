import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import {
  isAdminAuthFailure,
  type RequireAdminFn,
} from '../../../../lib/auth/admin-types.js';
import { buildImpersonationCookies } from '../../../../lib/admin/agent-crew.js';

export type LoadAgentForImpersonationFn = (
  agentId: string,
) => Promise<{ id: string; email: string; name: string; persona?: string } | null>;

export type RecordImpersonationAuditFn = (input: {
  actor: { uid: string; email?: string | null; role?: string | null };
  agentId: string;
  agentPersona?: string;
}) => Promise<void>;

export interface AdminAgentCrewImpersonatePostDeps {
  requireAdmin?: RequireAdminFn;
  loadAgent?: LoadAgentForImpersonationFn;
  recordAudit?: RecordImpersonationAuditFn;
}

/**
 * POST /api/admin/agent-crew/[id]/impersonate
 */
export async function handleAdminAgentCrewImpersonatePost(
  agentId: string,
  deps: AdminAgentCrewImpersonatePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAdmin) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const auth = await deps.requireAdmin();
  if (isAdminAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const agent = deps.loadAgent
      ? await deps.loadAgent(agentId)
      : {
          id: agentId,
          email: 'agent@test.com',
          name: 'Synthetic Agent',
          persona: 'investor',
        };

    if (!agent) {
      return jsonResponse(404, { error: 'Agent not found' });
    }

    if (deps.recordAudit) {
      await deps.recordAudit({
        actor: auth,
        agentId: agent.id,
        agentPersona: agent.persona,
      });
    }

    const cookies = buildImpersonationCookies({
      agentId: agent.id,
      email: agent.email,
      name: agent.name,
    });

    return jsonResponse(
      200,
      {
        success: true,
        redirectUrl: '/dashboard',
        agent: {
          id: agent.id,
          email: agent.email,
          name: agent.name,
          persona: agent.persona || 'investor',
        },
      },
      undefined,
      cookies,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Impersonate POST]', message);
    return jsonResponse(500, { error: 'Failed to impersonate agent', message });
  }
}
