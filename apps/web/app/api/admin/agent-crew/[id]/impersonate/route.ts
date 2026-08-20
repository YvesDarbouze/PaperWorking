import { handleAdminAgentCrewImpersonatePost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAdminAuthFailure,
  requireDevAdminAuth,
} from '@/lib/admin/dev-admin-auth';
import { getSeedSyntheticAgent } from '@/lib/admin/seed-data';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireDevAdminAuth();

  const result = await handleAdminAgentCrewImpersonatePost(id, {
    requireAdmin: async () => {
      if (isDevAdminAuthFailure(auth)) return auth;
      return auth;
    },
    loadAgent: async (agentId) => {
      const agent = getSeedSyntheticAgent(agentId);
      if (!agent) return null;
      return {
        id: agent.id,
        email: agent.email,
        name: agent.name,
        persona: agent.persona,
      };
    },
  });

  return toNextResponse(result);
}
