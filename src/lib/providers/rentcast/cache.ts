// ─── RentCast Firestore Cache Layer ──────────────────────────────────────────
// Every RentCast response is cached in Firestore with fetchedAt and per-endpoint TTL.
// Collection: vendorCache/rentcast/{endpoint}_{normalizedParams}
// Cache is always checked first; includes a forceRefresh option.
// Logs hit/miss telemetry so API spend is observable.

import { logger } from '@/lib/logger';
import type { CachedResponse } from './types';
import { ENDPOINT_TTLS } from './types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize params into a stable, filesystem-safe cache key.
 * Lowercases, sorts params, strips whitespace.
 */
export function buildCacheKey(endpoint: string, params: Record<string, string | number | undefined>): string {
  const normalizedParams = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v).toLowerCase().trim()}`)
    .join('&');

  // Replace characters that Firestore document IDs don't like
  const safeKey = `${endpoint}__${normalizedParams}`
    .replace(/\//g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_=&.-]/g, '_');

  return safeKey;
}

function getTTL(endpoint: string): number {
  // Match the longest prefix
  for (const [key, ttl] of Object.entries(ENDPOINT_TTLS)) {
    if (endpoint.startsWith(key)) return ttl;
  }
  return 7 * 24 * 60 * 60; // Default: 7 days
}

// ─── Cache Operations ────────────────────────────────────────────────────────

// Lazy import to avoid importing firebase-admin on the client side
let _db: FirebaseFirestore.Firestore | null = null;
async function getDb(): Promise<FirebaseFirestore.Firestore> {
  if (!_db) {
    const { adminDb } = await import('@/lib/firebase/admin');
    _db = adminDb;
  }
  return _db;
}

const CACHE_COLLECTION = 'vendorCache';
const CACHE_SUBCOLLECTION = 'rentcast';

/**
 * Get a cached response if it exists and hasn't expired.
 * Returns null on miss or expiry.
 */
export async function getCached<T>(cacheKey: string): Promise<CachedResponse<T> | null> {
  try {
    const db = await getDb();
    const docRef = db
      .collection(CACHE_COLLECTION)
      .doc(CACHE_SUBCOLLECTION)
      .collection('responses')
      .doc(cacheKey);

    const snap = await docRef.get();

    if (!snap.exists) {
      logger.debug('[RentCast Cache] MISS (not found)', { cacheKey });
      return null;
    }

    const cached = snap.data() as CachedResponse<T>;
    const expiresAt = new Date(cached.expiresAt).getTime();

    if (Date.now() > expiresAt) {
      logger.info('[RentCast Cache] MISS (expired)', {
        cacheKey,
        expiredAt: cached.expiresAt,
      });
      return null;
    }

    logger.info('[RentCast Cache] HIT', {
      cacheKey,
      endpoint: cached.endpoint,
      fetchedAt: cached.fetchedAt,
      expiresAt: cached.expiresAt,
    });

    return cached;
  } catch (err) {
    // Cache failures are non-fatal — fall through to live API
    logger.warn('[RentCast Cache] Read error (non-fatal)', { cacheKey });
    return null;
  }
}

/**
 * Write a response to the cache with the appropriate TTL.
 */
export async function setCached<T>(
  cacheKey: string,
  endpoint: string,
  data: T,
): Promise<void> {
  try {
    const db = await getDb();
    const ttlSeconds = getTTL(endpoint);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const entry: CachedResponse<T> = {
      data,
      fetchedAt: now.toISOString(),
      endpoint,
      cacheKey,
      ttlSeconds,
      expiresAt: expiresAt.toISOString(),
    };

    await db
      .collection(CACHE_COLLECTION)
      .doc(CACHE_SUBCOLLECTION)
      .collection('responses')
      .doc(cacheKey)
      .set(entry);

    logger.info('[RentCast Cache] SET', {
      cacheKey,
      endpoint,
      ttlSeconds,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    // Cache write failures are non-fatal
    logger.warn('[RentCast Cache] Write error (non-fatal)', { cacheKey });
  }
}

/**
 * Invalidate a specific cache entry.
 */
export async function invalidateCache(cacheKey: string): Promise<void> {
  try {
    const db = await getDb();
    await db
      .collection(CACHE_COLLECTION)
      .doc(CACHE_SUBCOLLECTION)
      .collection('responses')
      .doc(cacheKey)
      .delete();

    logger.info('[RentCast Cache] INVALIDATED', { cacheKey });
  } catch (err) {
    logger.warn('[RentCast Cache] Invalidation error (non-fatal)', { cacheKey });
  }
}

/**
 * Log a RentCast API call for volume statistics.
 */
export async function logApiCall(endpoint: string): Promise<void> {
  try {
    const db = await getDb();
    const now = new Date();
    const docRef = db.collection('rentcastCallLogs').doc();
    await docRef.set({
      endpoint,
      timestamp: now.toISOString(),
      year: now.getFullYear(),
      month: now.getMonth() + 1, // 1-indexed
      day: now.getDate(),
    });
    logger.debug('[RentCast Telemetry] Logged API call', { endpoint });
  } catch (err) {
    logger.warn('[RentCast Telemetry] Failed to log API call', { endpoint, err });
  }
}

