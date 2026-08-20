import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import {
  isAuthFailure,
  type RequireAuthFn,
} from '../../../../lib/auth/auth-types.js';

export interface FollowInvestorBody {
  targetUid?: unknown;
  follow?: unknown;
}

export interface FollowStateResult {
  following: boolean;
  changed: boolean;
}

export type UpdateFollowStateFn = (
  followerUid: string,
  targetUid: string,
  follow: boolean,
) => Promise<FollowStateResult>;

export interface MarketplaceInvestorsFollowDeps {
  requireAuth?: RequireAuthFn;
  updateFollow?: UpdateFollowStateFn;
}

/**
 * POST /api/marketplace/investors/follow — migrated from PaperWorking.
 * Firestore batch writes injected via updateFollow.
 */
export async function handleMarketplaceInvestorsFollowPost(
  body: FollowInvestorBody,
  deps: MarketplaceInvestorsFollowDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const targetUid = typeof body.targetUid === 'string' ? body.targetUid.trim() : '';
  const follow = body.follow !== false;

  if (!targetUid) {
    return jsonResponse(400, { error: 'targetUid is required.' });
  }
  if (targetUid === auth.uid) {
    return jsonResponse(400, { error: 'You cannot follow yourself.' });
  }

  if (!deps.updateFollow) {
    return jsonResponse(500, { error: 'Could not update follow state.' });
  }

  try {
    const result = await deps.updateFollow(auth.uid, targetUid, follow);
    return jsonResponse(200, result);
  } catch (err) {
    console.error('[api/marketplace/investors/follow] failed', err);
    return jsonResponse(500, { error: 'Could not update follow state.' });
  }
}
