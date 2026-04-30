/**
 * src/lib/cache/placesCache.ts
 *
 * Redis TTL cache for Google Places API responses.
 *
 * Autocomplete predictions (keyed by query string) — 1 h TTL.
 *   Addresses are stable on that timescale; 1 h balances freshness with cost.
 *
 * Place details (keyed by placeId) — 24 h TTL.
 *   Address components for a known placeId almost never change.
 */

import redis from '../redis';

const AUTOCOMPLETE_PREFIX = 'places:autocomplete:';
const DETAILS_PREFIX = 'places:details:';
const AUTOCOMPLETE_TTL = 60 * 60;        // 1 hour
const DETAILS_TTL = 60 * 60 * 24;        // 24 hours

function isRedisReady(): boolean {
  return redis.status === 'ready';
}

export const placesCache = {
  async getAutocomplete(input: string): Promise<unknown[] | null> {
    if (!isRedisReady()) return null;
    try {
      const raw = await redis.get(`${AUTOCOMPLETE_PREFIX}${input.toLowerCase()}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setAutocomplete(input: string, predictions: unknown[]): Promise<void> {
    if (!isRedisReady()) return;
    try {
      await redis.set(
        `${AUTOCOMPLETE_PREFIX}${input.toLowerCase()}`,
        JSON.stringify(predictions),
        'EX',
        AUTOCOMPLETE_TTL
      );
    } catch {
      // Cache write failure is non-fatal; the caller already has the live response.
    }
  },

  async getDetails(placeId: string): Promise<unknown | null> {
    if (!isRedisReady()) return null;
    try {
      const raw = await redis.get(`${DETAILS_PREFIX}${placeId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async setDetails(placeId: string, details: unknown): Promise<void> {
    if (!isRedisReady()) return;
    try {
      await redis.set(
        `${DETAILS_PREFIX}${placeId}`,
        JSON.stringify(details),
        'EX',
        DETAILS_TTL
      );
    } catch {
      // Non-fatal — live response already returned.
    }
  },
};
