import redis from '@/lib/redis';
import type { RateLimitResult } from './placesRateLimit';
import { rateLimitResponse } from './placesRateLimit';

export { rateLimitResponse };
export type { RateLimitResult };

const PUBLIC_RATE_LIMIT = { max: 20, windowSeconds: 60 };
const PREFIX = 'places:public_ratelimit:';

function isRedisReady(): boolean {
  try {
    return redis.status === 'ready';
  } catch {
    return false;
  }
}

/**
 * Check and increment the public rate limit counter for an IP.
 * Uses Redis INCR with TTL (sliding window approximation).
 *
 * Returns { allowed, remaining, limit, retryAfterSeconds? }.
 * If Redis is unavailable, always returns allowed: true (fail-open).
 */
export async function checkPublicRateLimit(
  ip: string,
): Promise<RateLimitResult> {
  const config = PUBLIC_RATE_LIMIT;

  if (!isRedisReady()) {
    // Fail-open: if Redis is down, don't block requests
    return { allowed: true, remaining: config.max, limit: config.max };
  }

  const key = `${PREFIX}${ip}`;

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
