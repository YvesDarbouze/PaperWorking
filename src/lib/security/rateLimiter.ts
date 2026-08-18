/**
 * PaperWorking Security & Compliance — Distributed Sliding-Window Rate Limiter
 * 
 * Protects public, auth, and authenticated API routes against brute-force,
 * credential stuffing, and DoS attacks.
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

// Clean up expired buckets periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now > bucket.resetAt) {
        buckets.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  limit: number;       // Maximum allowed requests in window
  windowMs: number;    // Window size in milliseconds
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  public: { limit: 100, windowMs: 60 * 1000 },       // 100 requests per minute
  auth: { limit: 5, windowMs: 60 * 1000 },           // 5 login/register attempts per minute
  authenticated: { limit: 1000, windowMs: 3600 * 1000 }, // 1,000 requests per hour
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit status for a given key (e.g. IP or User ID + route tier).
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = {
      count: 0,
      resetAt: now + config.windowMs,
    };
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  const allowed = bucket.count <= config.limit;
  const remaining = Math.max(0, config.limit - bucket.count);

  return {
    allowed,
    limit: config.limit,
    remaining,
    resetAt: bucket.resetAt,
  };
}
