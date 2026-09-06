import { NextResponse } from 'next/server';
import { handleAdminAgentCrewImpersonatePost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { adminErrorResponse } from '@/lib/api/admin-route-errors';
import { buildAdminCommandRepository } from '@/lib/api/handler-deps';
import { isAuthorizedAdmin, resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/agent-crew/:id/impersonate
 *
 * Same-origin BFF for synthetic agent impersonation (Phase D).
 * Session: sets httpOnly `__session` mock token plus mock_user_* cookies via
 * buildImpersonationCookies — same contract as legacy shared handler.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const adminCommand = buildAdminCommandRepository();

  try {
    const result = await handleAdminAgentCrewImpersonatePost(id, {
      requireAdmin: async () => {
        const user = await resolveAuthUserFromRequest(request);
        if (!user) {
          return { status: 401, body: { error: 'Unauthorized' } };
        }
        if (!isAuthorizedAdmin(user)) {
          return { status: 403, body: { error: 'Admin access required' } };
        }
        return {
          uid: user.uid,
          role: user.role ?? 'admin',
          isAdmin: true,
          email: user.email,
        };
      },
      loadAgent: async (agentId: string) => {
        const agent = await adminCommand.findSyntheticAgentById(agentId);
        if (!agent) return null;
        return {
          id: agent.id,
          email: agent.email,
          name: agent.displayName || agent.name || 'Synthetic Agent',
          persona: agent.agentPersona || 'investor',
        };
      },
      recordAudit: async ({ actor, agentId, agentPersona }) => {
        await adminCommand.writeAuditLog({
          actorUid: actor.uid,
          actorEmail: actor.email || 'unknown',
          actorRole: actor.role || 'admin',
          action: 'agent.impersonate',
          targetResource: 'user',
          targetResourceId: agentId,
          status: 'SUCCESS',
          entryHash: `impersonate:${agentId}:${Date.now()}`,
          metadata: { agentPersona },
        });
      },
    });

    return toNextResponse(result);
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to impersonate agent', details: message },
      { status: 500 },
    );
  }
}
