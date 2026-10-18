import { handleMarketplaceInvestorsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  listPublicProfilesFromStore,
  listFollowingIdsFromStore,
} from '@/lib/marketplace/investor-store';
import { tryDevSessionAuth } from '@/lib/projects/dev-session-auth';

export async function GET() {
  const result = await handleMarketplaceInvestorsGet({
    tryAuthenticate: async () =>
      (await tryDevSessionAuth()) ??
      (process.env.TEST_AUTH_UID === 'unauthenticated' ? null : { uid: 'dev-user-1' }),
    listPublicProfiles: async () => listPublicProfilesFromStore(),
    listFollowingIds: async (followerUid) => listFollowingIdsFromStore(followerUid),
  });

  return toNextResponse(result);
}
