import {
  handleAdminAgentCrewByIdDelete,
  handleAdminAgentCrewByIdGet,
  handleAdminAgentCrewImpersonatePost,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAdminAuthFailure,
  requireDevAdminAuth,
} from '@/lib/admin/dev-admin-auth';
import {
  deleteSeedSyntheticAgent,
  getSeedSyntheticAgent,
} from '@/lib/admin/seed-data';

async function adminDeps() {
  const auth = await requireDevAdminAuth();
  return {
    requireAdmin: async () => {
      if (isDevAdminAuthFailure(auth)) return auth;
      return auth;
    },
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const deps = await adminDeps();

  const result = await handleAdminAgentCrewByIdGet(id, {
    ...deps,
    loadAgent: async (agentId) => getSeedSyntheticAgent(agentId),
  });

  return toNextResponse(result);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const deps = await adminDeps();

  const result = await handleAdminAgentCrewByIdDelete(id, {
    ...deps,
    deleteAgent: async (agentId) => {
      const deleted = deleteSeedSyntheticAgent(agentId);
      if (!deleted) throw new Error('Agent not found');
      return deleted;
    },
  });

  return toNextResponse(result);
}
