import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { TryAuthenticateFn } from '../../../../lib/auth/auth-types.js';
import { mapUserDocToInvestorProfile } from '../../../../lib/marketplace/investor-mapper.js';
import { publicDealsFor } from '../../../../lib/marketplace/investor-profile.js';

export interface PublicActivityItem {
  id: string;
  text: string;
  at?: string;
}

export type GetPublicInvestorFn = (
  id: string,
) => Promise<{ uid: string; data: Record<string, unknown> } | null>;

export type ListPublicDealsForOwnerFn = (
  ownerUid: string,
) => Promise<Array<Record<string, unknown> & { id: string }>>;

export type ListPublicActivityFn = (actorUid: string) => Promise<PublicActivityItem[]>;

export type IsFollowingFn = (followerUid: string, targetUid: string) => Promise<boolean>;

export interface MarketplaceInvestorByIdParams {
  id: string;
}

export interface MarketplaceInvestorByIdGetDeps {
  tryAuthenticate?: TryAuthenticateFn;
  getInvestor?: GetPublicInvestorFn;
  listDeals?: ListPublicDealsForOwnerFn;
  listActivity?: ListPublicActivityFn;
  isFollowing?: IsFollowingFn;
}

/**
 * GET /api/marketplace/investors/[id] — single public investor profile.
 */
export async function handleMarketplaceInvestorByIdGet(
  params: MarketplaceInvestorByIdParams,
  deps: MarketplaceInvestorByIdGetDeps = {},
): Promise<RouteResult> {
  const { id } = params;
  if (!id) {
    return jsonResponse(404, { error: 'Not found' });
  }

  try {
    const userDoc = deps.getInvestor ? await deps.getInvestor(id) : null;
    const data = userDoc?.data ?? null;

    if (!data || data.publicProfile !== true) {
      return jsonResponse(404, { error: 'Not found' });
    }

    const profile = mapUserDocToInvestorProfile(userDoc!.uid, data);
    const rawProjects = deps.listDeals ? await deps.listDeals(id) : [];
    const deals = publicDealsFor(rawProjects);
    profile.dealCount = deals.length;

    const activity = deps.listActivity ? await deps.listActivity(id) : [];

    let isFollowing = false;
    if (deps.tryAuthenticate && deps.isFollowing) {
      const auth = await deps.tryAuthenticate();
      if (auth) {
        isFollowing = await deps.isFollowing(auth.uid, id);
      }
    }

    return jsonResponse(200, { profile, deals, activity, isFollowing });
  } catch (err) {
    console.error('[api/marketplace/investors/[id]] failed', err);
    return jsonResponse(404, { error: 'Not found' });
  }
}
