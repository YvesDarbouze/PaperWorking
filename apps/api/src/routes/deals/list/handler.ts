import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  isAuthFailure,
  type RequireAuthFn,
} from '../../../lib/auth/auth-types.js';
import { filterAndSortDeals, type DealsListQuery } from '../../../lib/deals/filter-deals.js';
import { mapRawDealsToPayloads } from '../../../lib/deals/map-deal.js';
import type { RawDealRecord } from '../../../lib/deals/types.js';

export type ListRawDealsFn = () => Promise<RawDealRecord[]>;

export interface DealsListGetDeps {
  requireAuth?: RequireAuthFn;
  listDeals?: ListRawDealsFn;
}

export type DealsGetQuery = DealsListQuery & {
  userId?: string;
};

/**
 * GET /api/deals — migrated from PaperWorking src/app/api/deals/route.ts
 */
export async function handleDealsGet(
  query: DealsGetQuery = {},
  deps: DealsListGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const userId = query.userId || auth.uid;

  try {
    const rawDeals = deps.listDeals ? await deps.listDeals() : [];
    const mappedDeals = mapRawDealsToPayloads(rawDeals);
    const filtered = filterAndSortDeals(mappedDeals, { ...query, userId });

    return jsonResponse(200, {
      success: true,
      total: filtered.length,
      deals: filtered,
    });
  } catch (error) {
    console.error('[GET /api/deals] Database query error:', error);
    return jsonResponse(500, { error: 'Database query failed' });
  }
}
