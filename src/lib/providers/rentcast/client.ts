// ─── RentCast API Client ─────────────────────────────────────────────────────
// The single entry point for all RentCast API calls.
// Nothing else in the codebase calls RentCast directly.
//
// Features:
//   • Cache-first with Firestore-backed TTL cache
//   • Token bucket rate limiting (20 req/s)
//   • Retry with exponential backoff on 429/5xx
//   • Typed error mapping — never throws raw vendor errors
//   • Structured logging + telemetry

import { logger } from '@/lib/logger';
import { rentCastLimiter } from './limiter';
import { buildCacheKey, getCached, setCached, logApiCall } from './cache';
import {
  RentCastError,
  RentCastRateLimitError,
  RentCastServerError,
  RentCastNetworkError,
  mapRentCastError,
} from './errors';
import type {
  RentCastProperty,
  RentCastValueEstimate,
  RentCastRentEstimate,
  RentCastMarketData,
  RentCastListing,
  PropertyLookupParams,
  AVMValueParams,
  AVMRentParams,
  MarketParams,
  ListingParams,
} from './types';

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://api.rentcast.io/v1';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

// ─── Internal Fetch with Retry ───────────────────────────────────────────────

interface FetchOpts {
  endpoint: string;
  params: Record<string, string | number | undefined>;
  apiKey: string;
  forceRefresh?: boolean;
}

async function fetchWithRetry<T>(opts: FetchOpts): Promise<T> {
  const { endpoint, params, apiKey, forceRefresh } = opts;

  // 1. Build cache key and check cache (unless forced)
  const cacheKey = buildCacheKey(endpoint, params);

  if (!forceRefresh) {
    const cached = await getCached<T>(cacheKey);
    if (cached) {
      return cached.data;
    }
  }

  // 2. Build URL
  const queryParts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

  const url = `${BASE_URL}/${endpoint}${queryParts ? `?${queryParts}` : ''}`;

  const headers = {
    'X-Api-Key': apiKey,
    'Accept': 'application/json',
  };

  // 3. Retry loop with backoff
  let lastError: RentCastError | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Respect rate limit
    await rentCastLimiter.acquire();

    try {
      logger.debug(`[RentCast Client] Fetching /${endpoint} (attempt ${attempt + 1})`, {
        url: url.replace(apiKey, '***'),
      });

      const res = await fetch(url, { headers });

      if (res.ok) {
        const data = (await res.json()) as T;

        // Write to cache and log call (fire-and-forget)
        setCached(cacheKey, endpoint, data).catch(() => {});
        logApiCall(endpoint).catch(() => {});

        logger.info(`[RentCast Client] ✅ /${endpoint} success`, { cacheKey });
        return data;
      }

      // Parse error body
      let errorBody: any;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { message: res.statusText };
      }

      const error = mapRentCastError(res.status, errorBody, endpoint);

      // Only retry on 429 or 5xx
      if (error instanceof RentCastRateLimitError || error instanceof RentCastServerError) {
        lastError = error;
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        logger.warn(`[RentCast Client] Retryable error on /${endpoint}, backing off ${backoff}ms`, {
          status: res.status,
          attempt: attempt + 1,
        });
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }

      // Non-retryable errors throw immediately
      throw error;

    } catch (err) {
      if (err instanceof RentCastError) {
        throw err;
      }
      // Network / unknown errors — retry
      lastError = new RentCastNetworkError(
        err instanceof Error ? err.message : 'Network error',
        endpoint,
      );
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      logger.warn(`[RentCast Client] Network error on /${endpoint}, backing off ${backoff}ms`, {
        attempt: attempt + 1,
      });
      await new Promise(r => setTimeout(r, backoff));
    }
  }

  // All retries exhausted
  throw lastError ?? new RentCastError('All retries exhausted', { endpoint });
}

// ─── RentCast Client Class ───────────────────────────────────────────────────

export class RentCastClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // ── /properties ──────────────────────────────────────────────────────────

  /**
   * Fetch property records by address. Returns an array (usually 1 result).
   * Includes attributes, last sale, tax assessments, property taxes, history.
   */
  async getProperties(
    params: PropertyLookupParams,
    forceRefresh = false,
  ): Promise<RentCastProperty[]> {
    return fetchWithRetry<RentCastProperty[]>({
      endpoint: 'properties',
      params: { address: params.address },
      apiKey: this.apiKey,
      forceRefresh,
    });
  }

  // ── /avm/value ───────────────────────────────────────────────────────────

  /**
   * Automated Valuation Model — returns an estimated value and sale comparables.
   * Passing the full address lets lookupSubjectAttributes default to true.
   */
  async getValueEstimate(
    params: AVMValueParams,
    forceRefresh = false,
  ): Promise<RentCastValueEstimate> {
    return fetchWithRetry<RentCastValueEstimate>({
      endpoint: 'avm/value',
      params: {
        address: params.address,
        compCount: params.compCount,
        maxRadius: params.maxRadius,
        daysOld: params.daysOld,
      },
      apiKey: this.apiKey,
      forceRefresh,
    });
  }

  // ── /avm/rent/long-term ──────────────────────────────────────────────────

  /**
   * Rent estimate with rental comparables.
   */
  async getRentEstimate(
    params: AVMRentParams,
    forceRefresh = false,
  ): Promise<RentCastRentEstimate> {
    return fetchWithRetry<RentCastRentEstimate>({
      endpoint: 'avm/rent/long-term',
      params: {
        address: params.address,
        compCount: params.compCount,
        maxRadius: params.maxRadius,
        daysOld: params.daysOld,
      },
      apiKey: this.apiKey,
      forceRefresh,
    });
  }

  // ── /markets ─────────────────────────────────────────────────────────────

  /**
   * Zip-level sale & rental market statistics with ~12 months history.
   */
  async getMarketStats(
    params: MarketParams,
    forceRefresh = false,
  ): Promise<RentCastMarketData> {
    return fetchWithRetry<RentCastMarketData>({
      endpoint: 'markets',
      params: { zipCode: params.zipCode },
      apiKey: this.apiKey,
      forceRefresh,
    });
  }

  // ── /listings/sale ───────────────────────────────────────────────────────

  /**
   * Active sale listings.
   */
  async getSaleListings(
    params: ListingParams,
    forceRefresh = false,
  ): Promise<RentCastListing[]> {
    return fetchWithRetry<RentCastListing[]>({
      endpoint: 'listings/sale',
      params: {
        address: params.address,
        zipCode: params.zipCode,
        city: params.city,
        state: params.state,
        limit: params.limit,
        offset: params.offset,
        status: params.status,
        bedrooms: params.bedrooms,
        bathrooms: params.bathrooms,
        propertyType: params.propertyType,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
      },
      apiKey: this.apiKey,
      forceRefresh,
    });
  }

  // ── /listings/rental ─────────────────────────────────────────────────────

  /**
   * Active rental listings (long-term).
   */
  async getRentalListings(
    params: ListingParams,
    forceRefresh = false,
  ): Promise<RentCastListing[]> {
    return fetchWithRetry<RentCastListing[]>({
      endpoint: 'listings/rental',
      params: {
        address: params.address,
        zipCode: params.zipCode,
        city: params.city,
        state: params.state,
        limit: params.limit,
        offset: params.offset,
        status: params.status,
        bedrooms: params.bedrooms,
        bathrooms: params.bathrooms,
        propertyType: params.propertyType,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
      },
      apiKey: this.apiKey,
      forceRefresh,
    });
  }
}
