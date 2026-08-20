import { binaryResponse, jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  parseReilListingsParams,
  validateReilListingsQuery,
  validateReilMarketStatsZip,
} from '../../../lib/reil/listings.js';
import { validateReilCronAuth } from '../../../lib/projects/hold-auto-advance.js';

export type SearchReilListingsFn = (
  listingType: string,
  params: Record<string, unknown>,
) => Promise<Array<Record<string, unknown>>>;
export type FetchReilMarketStatsFn = (zipCode: string) => Promise<Record<string, unknown>>;
export type RunReilCronRefreshFn = () => Promise<{
  scanned: number;
  refreshed: number;
  apiCallsMade: number;
}>;

/**
 * GET /api/reil/listings
 */
export async function handleReilListingsGet(
  searchParams: URLSearchParams,
  deps: { requireAuth?: RequireAuthFn; searchListings?: SearchReilListingsFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const locationCheck = validateReilListingsQuery({
    zipCode: searchParams.get('zipCode'),
    city: searchParams.get('city'),
    state: searchParams.get('state'),
  });
  if (!locationCheck.ok) return jsonResponse(locationCheck.status, { error: locationCheck.error });

  const params = parseReilListingsParams(searchParams);
  const listingType = String(params.listingType);

  try {
    const listings = deps.searchListings ? await deps.searchListings(listingType, params) : [];
    return jsonResponse(200, { success: true, listings, count: listings.length });
  } catch (err: unknown) {
    console.error('[Listings Route]', err);
    return jsonResponse(502, { error: 'Failed to search active listings. Please try again.' });
  }
}

/**
 * GET /api/reil/market-stats
 */
export async function handleReilMarketStatsGet(
  query: { zipCode?: string | null },
  deps: { requireAuth?: RequireAuthFn; fetchStats?: FetchReilMarketStatsFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const validated = validateReilMarketStatsZip(query.zipCode);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  try {
    const stats = deps.fetchStats ? await deps.fetchStats(validated.zipCode) : { zipCode: validated.zipCode };
    return jsonResponse(200, { stats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if ((err as { name?: string }).name === 'MarketStatsNotFoundError') {
      return jsonResponse(404, { error: `No market statistics available for zip code: ${validated.zipCode}` });
    }
    console.error('[Market Stats Route]', message);
    return jsonResponse(502, { error: message || 'Failed to fetch market statistics' });
  }
}

/**
 * POST /api/reil/cron/refresh
 */
export async function handleReilCronRefreshPost(
  input: { authorization?: string | null; queryToken?: string | null; isAdmin?: boolean },
  deps: { cronSecret?: string; runRefresh?: RunReilCronRefreshFn } = {},
): Promise<RouteResult> {
  const authorized = validateReilCronAuth({
    cronSecret: deps.cronSecret ?? process.env.CRON_SECRET,
    authorization: input.authorization,
    queryToken: input.queryToken,
    isAdmin: input.isAdmin,
  });
  if (!authorized) return jsonResponse(401, { error: 'Unauthorized' });

  const result = deps.runRefresh
    ? await deps.runRefresh()
    : { scanned: 0, refreshed: 0, apiCallsMade: 0 };
  return jsonResponse(200, { success: true, ...result });
}
