import { handleAdminAgentCrewGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAdminAuthFailure,
  requireDevAdminAuth,
} from '@/lib/admin/dev-admin-auth';
import { listSeedSyntheticAgents } from '@/lib/admin/seed-data';

export async function GET() {
  const auth = await requireDevAdminAuth();

  const result = await handleAdminAgentCrewGet({
    requireAdmin: async () => {
      if (isDevAdminAuthFailure(auth)) return auth;
      return auth;
    },
    listAgents: async () => listSeedSyntheticAgents(),
  });

  return toNextResponse(result);
}
