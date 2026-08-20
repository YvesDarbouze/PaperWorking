import { handleAdminLenderChecklistsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAdminAuthFailure,
  requireDevAdminAuth,
} from '@/lib/admin/dev-admin-auth';
import { SEED_LENDER_CHECKLISTS_DOC } from '@/lib/admin/seed-data';

export async function GET() {
  const auth = await requireDevAdminAuth();

  const result = await handleAdminLenderChecklistsGet({
    requireAdmin: async () => {
      if (isDevAdminAuthFailure(auth)) return auth;
      return auth;
    },
    getConfigDoc: async () => SEED_LENDER_CHECKLISTS_DOC,
  });

  return toNextResponse(result);
}
