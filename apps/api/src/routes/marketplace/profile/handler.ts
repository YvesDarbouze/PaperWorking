import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  isAuthFailure,
  type RequireAuthFn,
} from '../../../lib/auth/auth-types.js';
import { mapUserDocToEditableProfile } from '../../../lib/marketplace/investor-mapper.js';

export type GetUserProfileDocFn = (uid: string) => Promise<Record<string, unknown> | null>;

export interface MarketplaceProfileGetDeps {
  requireAuth?: RequireAuthFn;
  getUserDoc?: GetUserProfileDocFn;
}

/**
 * GET /api/marketplace/profile — migrated read path from PaperWorking.
 */
export async function handleMarketplaceProfileGet(
  deps: MarketplaceProfileGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const data = deps.getUserDoc ? await deps.getUserDoc(auth.uid) : {};
    const profile = mapUserDocToEditableProfile(auth.uid, data ?? {});

    return jsonResponse(200, { profile });
  } catch (err) {
    console.error('[api/marketplace/profile GET] failed', err);
    return jsonResponse(500, { error: 'Could not load profile.' });
  }
}
