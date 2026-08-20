import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { TryAuthenticateFn } from '../../../lib/auth/auth-types.js';
import {
  filterListingsForViewer,
  sortMarketplaceListings,
  type DealListingRecord,
} from '../../../lib/marketplace/listings.js';

export type ListDealListingsFn = () => Promise<DealListingRecord[]>;

export interface MarketplaceListingsGetDeps {
  tryAuthenticate?: TryAuthenticateFn;
  listListings?: ListDealListingsFn;
}

/**
 * GET /api/marketplace/listings — migrated from PaperWorking.
 */
export async function handleMarketplaceListingsGet(
  deps: MarketplaceListingsGetDeps = {},
): Promise<RouteResult> {
  try {
    let isAuthenticated = false;
    if (deps.tryAuthenticate) {
      const auth = await deps.tryAuthenticate();
      isAuthenticated = auth !== null;
    }

    const rawListings = deps.listListings ? await deps.listListings() : [];
    const visible = filterListingsForViewer(rawListings, isAuthenticated);
    const listings = sortMarketplaceListings(visible);

    return jsonResponse(200, {
      success: true,
      isAuthenticated,
      count: listings.length,
      listings,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[MarketplaceListings GET]', message);
    return jsonResponse(500, {
      error: 'Failed to fetch marketplace listings',
      message,
    });
  }
}
