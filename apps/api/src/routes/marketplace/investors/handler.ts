import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { TryAuthenticateFn } from '../../../lib/auth/auth-types.js';
import { mapUserDocToInvestorProfile } from '../../../lib/marketplace/investor-mapper.js';
import type { InvestorProfile } from '../../../lib/marketplace/investor-profile.js';

export type ListPublicInvestorsFn = () => Promise<
  Array<{ uid: string; data: Record<string, unknown> }>
>;

export type ListFollowingIdsFn = (followerUid: string) => Promise<string[]>;

export interface MarketplaceInvestorsGetDeps {
  tryAuthenticate?: TryAuthenticateFn;
  listPublicProfiles?: ListPublicInvestorsFn;
  listFollowingIds?: ListFollowingIdsFn;
}

/**
 * GET /api/marketplace/investors — public investor directory.
 */
export async function handleMarketplaceInvestorsGet(
  deps: MarketplaceInvestorsGetDeps = {},
): Promise<RouteResult> {
  try {
    const docs = deps.listPublicProfiles ? await deps.listPublicProfiles() : [];
    const profiles: InvestorProfile[] = docs.map(({ uid, data }) =>
      mapUserDocToInvestorProfile(uid, data),
    );

    let followingIds: string[] = [];
    if (deps.tryAuthenticate && deps.listFollowingIds) {
      const auth = await deps.tryAuthenticate();
      if (auth) {
        followingIds = await deps.listFollowingIds(auth.uid);
      }
    }

    return jsonResponse(200, { profiles, following: followingIds });
  } catch (err) {
    console.error('[api/marketplace/investors] failed', err);
    return jsonResponse(200, { profiles: [], following: [] });
  }
}
