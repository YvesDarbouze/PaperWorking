// ─── RentCast Provider — Public API ──────────────────────────────────────────
// Re-exports everything needed by consumers.
// Provides the factory function for selecting real vs mock.

export { RentCastClient } from './client';
export { buildCacheKey, getCached, setCached, invalidateCache } from './cache';
export { TokenBucketLimiter, rentCastLimiter } from './limiter';
export {
  RentCastError,
  RentCastBadRequestError,
  RentCastAuthError,
  RentCastNotFoundError,
  RentCastRateLimitError,
  RentCastServerError,
  RentCastBillingError,
  RentCastInsufficientDataError,
  RentCastNetworkError,
  mapRentCastError,
} from './errors';
export type {
  RentCastProperty,
  RentCastValueEstimate,
  RentCastRentEstimate,
  RentCastMarketData,
  RentCastMarketStat,
  RentCastMarketPropertyTypeStat,
  RentCastMarketBedroomsStat,
  RentCastMarketDataSection,
  RentCastListing,
  RentCastSaleComparable,
  RentCastRentalComparable,
  RentCastTaxAssessment,
  RentCastPropertyTax,
  RentCastHistoryEntry,
  RentCastFeatures,
  CachedResponse,
  PropertyLookupParams,
  AVMValueParams,
  AVMRentParams,
  MarketParams,
  ListingParams,
} from './types';
export { ENDPOINT_TTLS } from './types';

import { RentCastClient } from './client';
import { logger } from '@/lib/logger';

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Get a RentCastClient if RENTCAST_API_KEY is set, or null otherwise.
 * Callers that need fallback behavior (e.g., mock providers) should check
 * for null and branch accordingly.
 */
export function getRentCastClient(): RentCastClient | null {
  const apiKey = process.env.RENTCAST_API_KEY;

  if (!apiKey) {
    logger.warn('[RentCast] RENTCAST_API_KEY is not set — client unavailable');
    return null;
  }

  return new RentCastClient(apiKey);
}

/**
 * Returns true when the env is configured for live RentCast.
 */
export function isRentCastEnabled(): boolean {
  const provider = (process.env.PROPERTY_DATA_PROVIDER || 'mock').toLowerCase();
  return provider === 'rentcast' && !!process.env.RENTCAST_API_KEY;
}
