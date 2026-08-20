import { handleMarketplaceProfileGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { SEED_DEV_USER_PROFILE } from '@/lib/marketplace/seed-data';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET() {
  const auth = await requireDevSessionAuth();

  const result = await handleMarketplaceProfileGet({
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    getUserDoc: async () => SEED_DEV_USER_PROFILE,
  });

  return toNextResponse(result);
}
