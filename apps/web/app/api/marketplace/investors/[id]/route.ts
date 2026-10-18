import { handleMarketplaceInvestorByIdGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  getInvestorProfileFromStore,
  isFollowingInStore,
} from '@/lib/marketplace/investor-store';
import {
  seedInvestorActivity,
  seedPublicDealsForOwner,
} from '@/lib/marketplace/seed-data';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const result = await handleMarketplaceInvestorByIdGet(
    { id },
    {
      tryAuthenticate: async () =>
        (await tryDevSessionAuth()) ??
        (process.env.TEST_AUTH_UID === 'unauthenticated' ? null : { uid: 'dev-user-1' }),
      getInvestor: async (investorId) => getInvestorProfileFromStore(investorId),
      listDeals: async (ownerUid) => seedPublicDealsForOwner(ownerUid),
      listActivity: async (actorUid) => seedInvestorActivity(actorUid),
      isFollowing: async (followerUid, targetUid) => isFollowingInStore(followerUid, targetUid),
    },
  );

  return toNextResponse(result);
}
