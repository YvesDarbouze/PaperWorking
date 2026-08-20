import { handleMarketplaceInvestorByIdGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  SEED_INVESTOR_PROFILES,
  isSeedFollowing,
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
      tryAuthenticate: tryDevSessionAuth,
      getInvestor: async (investorId) =>
        SEED_INVESTOR_PROFILES.find((profile) => profile.uid === investorId) ?? null,
      listDeals: async (ownerUid) => seedPublicDealsForOwner(ownerUid),
      listActivity: async (actorUid) => seedInvestorActivity(actorUid),
      isFollowing: async (followerUid, targetUid) => isSeedFollowing(followerUid, targetUid),
    },
  );

  return toNextResponse(result);
}
