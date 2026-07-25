/**
 * PlacesRateLimit — DM-3 Server-Side Rate Limiting
 *
 * Redis sliding window counter per authenticated user per endpoint.
 * Non-blocking: if Redis is unavailable, the request proceeds (fail-open).
 */

import redis from '@/lib/redis';

export type PlacesEndpoint =
  | 'autocomplete'
  | 'placeDetails'
  | 'geocode'
  | 'addressValidation'
  | 'staticMaps'
  | 'streetView'
  | 'cardExchange';

const RATE_LIMITS: Record<PlacesEndpoint, { max: number; windowSeconds: number }> = {
  autocomplete:       { max: 60,  windowSeconds: 60 },
  placeDetails:       { max: 20,  windowSeconds: 60 },
  geocode:            { max: 30,  windowSeconds: 60 },
  addressValidation:  { max: 10,  windowSeconds: 60 },
  staticMaps:         { max: 100, windowSeconds: 60 },
  streetView:         { max: 100, windowSeconds: 60 },
  cardExchange:       { max: 15,  windowSeconds: 60 },
};

const PREFIX = 'places:ratelimit:';

function isRedisReady(): boolean {
  try {
    return redis.status === 'ready';
  } catch {
    return false;
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds?: number;
}

/**
 * Check and increment the rate limit counter for a user + endpoint.
 * Uses Redis INCR with TTL (sliding window approximation).
 *
 * Returns { allowed, remaining, limit, retryAfterSeconds? }.
 * If Redis is unavailable, always returns allowed: true (fail-open).
 */
export async function checkRateLimit(
  uid: string,
  endpoint: PlacesEndpoint,
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[endpoint];
  if (!config) {
    return { allowed: true, remaining: 999, limit: 999 };
  }

  if (!isRedisReady()) {
    // Fail-open: if Redis is down, don't block requests
    return { allowed: true, remaining: config.max, limit: config.max };
  }

  const key = `${PREFIX}${uid}:${endpoint}`;

  try {
    const current = await redis.incr(key);

    // Set TTL on first increment
    if (current === 1) {
      await redis.expire(key, config.windowSeconds);
    }

    if (current > config.max) {
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        remaining: 0,
        limit: config.max,
        retryAfterSeconds: ttl > 0 ? ttl : config.windowSeconds,
      };
    }

    return {
      allowed: true,
      remaining: config.max - current,
      limit: config.max,
    };
  } catch {
    // Redis error — fail-open
    return { allowed: true, remaining: config.max, limit: config.max };
  }
}

/**
 * Utility to create a NextResponse for rate limit exceeded.
 */
export function rateLimitResponse(result: RateLimitResult) {
  const { NextResponse } = require('next/server');
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      limit: result.limit,
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds || 60),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
      },
    },
  );
}
