import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { validatePlaceDetailsBody } from '../../../lib/places/autocomplete.js';

export type CheckRateLimitFn = (
  uid: string,
  action: string,
) => Promise<{ allowed: boolean; retryAfter?: number }>;

export type FetchPlaceDetailsFn = (
  placeId: string,
  sessionToken: string,
  uid: string,
) => Promise<Record<string, unknown>>;

export type GetCachedPlaceDetailsFn = (
  placeId: string,
) => Promise<Record<string, unknown> | null>;

export type CachePlaceDetailsFn = (
  placeId: string,
  result: Record<string, unknown>,
) => Promise<void>;

export interface PlacesDetailsPostDeps {
  requireAuth?: RequireAuthFn;
  checkRateLimit?: CheckRateLimitFn;
  getCachedDetails?: GetCachedPlaceDetailsFn;
  fetchDetails?: FetchPlaceDetailsFn;
  cacheDetails?: CachePlaceDetailsFn;
}

/**
 * POST /api/places/details
 */
export async function handlePlacesDetailsPost(
  body: { placeId?: unknown; sessionToken?: unknown },
  deps: PlacesDetailsPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (deps.checkRateLimit) {
    const rateCheck = await deps.checkRateLimit(auth.uid, 'placeDetails');
    if (!rateCheck.allowed) {
      return jsonResponse(429, {
        error: 'Rate limit exceeded',
        retryAfter: rateCheck.retryAfter,
      });
    }
  }

  const validated = validatePlaceDetailsBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  if (deps.getCachedDetails) {
    const cached = await deps.getCachedDetails(validated.placeId);
    if (cached) {
      return jsonResponse(200, { ...cached, cached: true });
    }
  }

  try {
    const result = deps.fetchDetails
      ? await deps.fetchDetails(validated.placeId, validated.sessionToken, auth.uid)
      : { placeId: validated.placeId };

    if (deps.cacheDetails) {
      await deps.cacheDetails(validated.placeId, result);
    }

    return jsonResponse(200, result);
  } catch (error: unknown) {
    console.error('[Places Details] error:', error);
    return jsonResponse(502, { error: 'Failed to fetch place details' });
  }
}
