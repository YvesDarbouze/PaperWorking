import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  evaluateDealVisibility,
  mapRawDealToPreview,
  normalizeDealSlug,
} from '../../../lib/deals/deal-exists.js';
import type { RawDealRecord } from '../../../lib/deals/types.js';

export interface DealsExistsQuery {
  slug?: string;
  userId?: string;
}

export type FindDealBySlugFn = (normalizedSlug: string) => Promise<RawDealRecord | null>;

export interface DealsExistsGetDeps {
  findBySlug?: FindDealBySlugFn;
}

/**
 * GET /api/deals/exists — slug collision check for deal creation.
 */
export async function handleDealsExistsGet(
  query: DealsExistsQuery = {},
  deps: DealsExistsGetDeps = {},
): Promise<RouteResult> {
  const normalizedSlug = normalizeDealSlug(query.slug || '');
  if (!normalizedSlug) {
    return jsonResponse(200, { exists: false, deal: null });
  }

  const userId = query.userId || 'user_guest';

  try {
    const dbDeal = deps.findBySlug ? await deps.findBySlug(normalizedSlug) : null;
    if (!dbDeal) {
      return jsonResponse(200, { exists: false, deal: null });
    }

    const preview = mapRawDealToPreview(dbDeal);
    const result = evaluateDealVisibility(preview, userId);

    return jsonResponse(200, result);
  } catch (error) {
    console.error('[GET /api/deals/exists] Database query error:', error);
    return jsonResponse(200, { exists: false, deal: null });
  }
}
