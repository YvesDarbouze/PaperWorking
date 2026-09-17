import { getAdminFirestore, shouldAttemptFirestore } from '@/lib/firebase/admin';

export interface RateLimitOptions {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in ms
  current: number;
}

export interface RateLimiterDeps {
  getFirestore?: () => any;
}

// In-memory fallback / mirror for offline testing or when Firestore is unavailable
const memoryRateLimits = new Map<string, { count: number; resetAt: number }>();

export function resetMemoryRateLimiter(): void {
  memoryRateLimits.clear();
}

export function extractClientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Durable rate limiter with atomic tracking via Firestore, falling back to in-memory store.
 */
export async function checkDurableRateLimit(
  options: RateLimitOptions,
  deps: RateLimiterDeps = {},
): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = options;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const sanitizedDocId = key.replace(/[/\\#?]/g, ':').slice(0, 150);

  // 1. Try durable Firestore tracking if enabled
  const canAttemptFirestore = deps.getFirestore || shouldAttemptFirestore();
  if (canAttemptFirestore) {
    try {
      const db = deps.getFirestore ? deps.getFirestore() : getAdminFirestore();
      if (db) {
        const docRef = db.collection('rate_limits').doc(sanitizedDocId);
        const result = await db.runTransaction(async (t: any) => {
          const snap = await t.get(docRef);
          let count = 0;
          let resetAt = now + windowMs;

          if (snap.exists) {
            const data = snap.data() || {};
            if (typeof data.resetAt === 'number' && data.resetAt > now) {
              count = typeof data.count === 'number' ? data.count : 0;
              resetAt = data.resetAt;
            }
          }

          if (count >= limit) {
            return {
              allowed: false,
              remaining: 0,
              resetAt,
              current: count,
            };
          }

          const nextCount = count + 1;
          t.set(
            docRef,
            {
              count: nextCount,
              resetAt,
              updatedAt: now,
            },
            { merge: true },
          );

          return {
            allowed: true,
            remaining: Math.max(0, limit - nextCount),
            resetAt,
            current: nextCount,
          };
        });

        // Mirror in memory
        memoryRateLimits.set(sanitizedDocId, { count: result.current, resetAt: result.resetAt });
        return result;
      }
    } catch {
      // Graceful fallback to memory store if Firestore call fails
    }
  }

  // 2. In-memory fallback
  let entry = memoryRateLimits.get(sanitizedDocId);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      current: entry.count,
    };
  }

  entry.count += 1;
  memoryRateLimits.set(sanitizedDocId, entry);

  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    current: entry.count,
  };
}
