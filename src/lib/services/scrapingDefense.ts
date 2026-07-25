import redis from '@/lib/redis';
import { headers } from 'next/headers';
import posthog from 'posthog-js';

const RATELIMIT_PREFIX = 'scraping:ratelimit:';
const ENUMERATION_PREFIX = 'scraping:enumeration:';

// Configurable limits
const SEARCH_LIMIT = { max: 30, windowSeconds: 60 };
const READ_LIMIT = { max: 60, windowSeconds: 60 };
const AUTOCOMPLETE_LIMIT = { max: 60, windowSeconds: 60 };

const ENUMERATION_THRESHOLD = 10; // 10 failed reads within 60s is flagged as a scrape anomaly
const ENUMERATION_WINDOW = 60;

function isRedisReady(): boolean {
  try {
    return redis.status === 'ready';
  } catch {
    return false;
  }
}

/**
 * Get client IP address from headers
 */
export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
  } catch {
    // Headers not available in some static environments / tests
  }
  return '127.0.0.1';
}

/**
 * Check and increment rate limit for an action
 */
export async function limitRequest(
  keyPart: string,
  actionType: 'search' | 'read' | 'autocomplete'
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  if (!isRedisReady()) {
    const max = actionType === 'search' ? SEARCH_LIMIT.max : actionType === 'read' ? READ_LIMIT.max : AUTOCOMPLETE_LIMIT.max;
    return { allowed: true, remaining: max, limit: max };
  }

  const config =
    actionType === 'search'
      ? SEARCH_LIMIT
      : actionType === 'read'
      ? READ_LIMIT
      : AUTOCOMPLETE_LIMIT;

  const key = `${RATELIMIT_PREFIX}${actionType}:${keyPart}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, config.windowSeconds);
    }

    if (current > config.max) {
      return { allowed: false, remaining: 0, limit: config.max };
    }

    return {
      allowed: true,
      remaining: config.max - current,
      limit: config.max,
    };
  } catch (err) {
    console.error('[ScrapingDefense] Redis rate limit error:', err);
    return { allowed: true, remaining: config.max, limit: config.max };
  }
}

/**
 * Track failed deal reads or guess attempts to identify enumeration scans
 */
export async function trackEnumerationAttempt(
  ip: string,
  uid?: string
): Promise<void> {
  if (!isRedisReady()) return;

  const key = `${ENUMERATION_PREFIX}${ip}`;

  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, ENUMERATION_WINDOW);
    }

    if (current >= ENUMERATION_THRESHOLD) {
      // Fire Anomaly Alert!
      const alertMsg = `🚨 [ANOMALY ALERT] Enumeration scrape pattern detected! IP: ${ip}${
        uid ? `, Principal: ${uid}` : ''
      }, Failed Attempts: ${current}`;
      console.warn(alertMsg);

      // Emit PostHog telemetry event
      try {
        posthog.capture('scraping_anomaly_detected', {
          ip,
          uid,
          failedAttempts: current,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Posthog might not be initialized in all server contexts
      }
    }
  } catch (err) {
    console.error('[ScrapingDefense] Failed to track enumeration attempt:', err);
  }
}
