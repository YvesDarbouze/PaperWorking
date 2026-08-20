import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  PLACES_CORS_HEADERS,
  stripPublicPredictions,
  validatePublicAutocompleteBody,
  type PlacePrediction,
} from '../../../lib/places/autocomplete.js';

export type CheckPublicRateLimitFn = (
  ip: string,
) => Promise<{ allowed: boolean; retryAfter?: number }>;

export type FetchAutocompleteFn = (
  input: string,
  sessionToken: string,
  uid: string,
) => Promise<PlacePrediction[]>;

export type GenerateSessionTokenFn = () => string;

export interface PlacesAutocompletePublicPostDeps {
  clientIp?: string;
  checkPublicRateLimit?: CheckPublicRateLimitFn;
  fetchAutocomplete?: FetchAutocompleteFn;
  generateSessionToken?: GenerateSessionTokenFn;
}

function withCors(result: RouteResult): RouteResult {
  return {
    ...result,
    headers: { ...result.headers, ...PLACES_CORS_HEADERS },
  };
}

/**
 * POST /api/places/autocomplete-public
 */
export async function handlePlacesAutocompletePublicPost(
  body: { input?: unknown },
  deps: PlacesAutocompletePublicPostDeps = {},
): Promise<RouteResult> {
  const ip = deps.clientIp || 'unknown';

  if (deps.checkPublicRateLimit) {
    const rateCheck = await deps.checkPublicRateLimit(ip);
    if (!rateCheck.allowed) {
      return withCors(
        jsonResponse(429, {
          error: 'Rate limit exceeded',
          retryAfter: rateCheck.retryAfter,
        }),
      );
    }
  }

  const validated = validatePublicAutocompleteBody(body);
  if (!validated.ok) {
    return withCors(jsonResponse(200, { predictions: validated.predictions }));
  }

  const sessionToken = deps.generateSessionToken
    ? deps.generateSessionToken()
    : crypto.randomUUID();

  try {
    const predictions = deps.fetchAutocomplete
      ? await deps.fetchAutocomplete(validated.input, sessionToken, 'public')
      : [];

    return withCors(
      jsonResponse(200, { predictions: stripPublicPredictions(predictions) }),
    );
  } catch (error: unknown) {
    console.error('[Places Autocomplete Public] Gateway error:', error);
    return withCors(jsonResponse(200, { predictions: [] }));
  }
}

/**
 * OPTIONS /api/places/autocomplete-public — CORS preflight.
 */
export async function handlePlacesAutocompletePublicOptions(): Promise<RouteResult> {
  return {
    status: 204,
    body: null,
    headers: {
      ...PLACES_CORS_HEADERS,
      'content-type': 'application/json',
    },
  };
}
