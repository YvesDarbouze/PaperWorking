import { handleMarketplaceInvestorsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  SEED_INVESTOR_PROFILES,
  listSeedFollowingIds,
} from '@/lib/marketplace/seed-data';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';

export async function GET() {
  const result = await handleMarketplaceInvestorsGet({
    tryAuthenticate: tryDevSessionAuth,
    listPublicProfiles: async () =>
      SEED_INVESTOR_PROFILES.filter((profile) => profile.data.publicProfile === true),
    listFollowingIds: async (followerUid) => listSeedFollowingIds(followerUid),
  });

  return toNextResponse(result);
}
