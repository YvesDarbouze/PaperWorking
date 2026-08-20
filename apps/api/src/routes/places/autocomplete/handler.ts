import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  validateAutocompleteBody,
  type PlacePrediction,
} from '../../../lib/places/autocomplete.js';

export type CheckRateLimitFn = (
  uid: string,
  action: string,
) => Promise<{ allowed: boolean; retryAfter?: number }>;

export type CheckPublicRateLimitFn = (
  ip: string,
) => Promise<{ allowed: boolean; retryAfter?: number }>;

export type FetchAutocompleteFn = (
  input: string,
  sessionToken: string,
  uid: string,
) => Promise<PlacePrediction[]>;

export interface PlacesAutocompletePostDeps {
  requireAuth?: RequireAuthFn;
  clientIp?: string;
  checkPublicRateLimit?: CheckPublicRateLimitFn;
  checkRateLimit?: CheckRateLimitFn;
  fetchAutocomplete?: FetchAutocompleteFn;
}

/**
 * POST /api/places/autocomplete
 */
export async function handlePlacesAutocompletePost(
  body: { input?: unknown; sessionToken?: unknown },
  deps: PlacesAutocompletePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const ip = deps.clientIp || 'unknown';
  if (deps.checkPublicRateLimit) {
    const ipCheck = await deps.checkPublicRateLimit(ip);
    if (!ipCheck.allowed) {
      return jsonResponse(429, {
        error: 'Rate limit exceeded',
        retryAfter: ipCheck.retryAfter,
      });
    }
  }

  if (deps.checkRateLimit) {
    const rateCheck = await deps.checkRateLimit(auth.uid, 'autocomplete');
    if (!rateCheck.allowed) {
      return jsonResponse(429, {
        error: 'Rate limit exceeded',
        retryAfter: rateCheck.retryAfter,
      });
    }
  }

  const validated = validateAutocompleteBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  if (!validated.input || validated.input.length < 2) {
    return jsonResponse(200, { predictions: [] });
  }

  try {
    const predictions = deps.fetchAutocomplete
      ? await deps.fetchAutocomplete(validated.input, validated.sessionToken!, auth.uid)
      : [];

    return jsonResponse(200, { predictions });
  } catch (error: unknown) {
    console.error('[Places Autocomplete] Gateway error:', error);
    return jsonResponse(200, { predictions: [] });
  }
}
