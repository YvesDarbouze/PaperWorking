import {
  handleVendorPortalRequestsGet,
  handleVendorPortalRequestsPut,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  listSeedVendorRequests,
  loadSeedProjectsMap,
  updateSeedVendorRequest,
} from '@/lib/vendor-portal/seed-data';

export async function GET() {
  const auth = await requireDevSessionAuth();

  const result = await handleVendorPortalRequestsGet({
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    listRequests: async (vendorUid) => listSeedVendorRequests(vendorUid),
    loadProjects: async (projectIds) => loadSeedProjectsMap(projectIds),
  });

  return toNextResponse(result);
}

export async function PUT(request: Request) {
  const auth = await requireDevSessionAuth();
  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await handleVendorPortalRequestsPut(body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid, email: 'vendor@paperworking.test' };
    },
    actorName: 'Dev Vendor',
    actorEmail: 'vendor@paperworking.test',
    updateRequest: async (input) => updateSeedVendorRequest(input),
  });

  return toNextResponse(result);
}
