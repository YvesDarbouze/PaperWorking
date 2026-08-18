/**
 * PaperWorking Performance Engine — Redis Metric & Portfolio Cache
 * 
 * Caches project metric calculations and portfolio aggregations to achieve
 * sub-50ms API response times under high concurrency (1,000+ users).
 */

import redis from '../redis';

export interface MetricCacheOptions {
  isArchived?: boolean;
}

const ACTIVE_METRIC_TTL_SECONDS = 3600;       // 1 hour
const ARCHIVED_METRIC_TTL_SECONDS = 86400;    // 24 hours
const PORTFOLIO_TTL_SECONDS = 300;             // 5 minutes

export const metricCacheKey = {
  project: (projectId: string, asOfDate: string) => `metrics:${projectId}:${asOfDate}`,
  portfolio: (userId: string, period: string) => `portfolio:${userId}:${period}`,
};

/**
 * Retrieve cached project metrics or execute calculation callback.
 */
export async function getOrSetProjectMetricsCache<T>(
  projectId: string,
  asOfDate: string,
  computeFn: () => Promise<T>,
  options: MetricCacheOptions = {}
): Promise<T> {
  const key = metricCacheKey.project(projectId, asOfDate);

  try {
    if (redis.status === 'ready') {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch (_err) {
    // Fail open if Redis drops
  }

  const result = await computeFn();

  try {
    if (redis.status === 'ready' && result) {
      const ttl = options.isArchived ? ARCHIVED_METRIC_TTL_SECONDS : ACTIVE_METRIC_TTL_SECONDS;
      await redis.setex(key, ttl, JSON.stringify(result));
    }
  } catch (_err) {
    // Fail open
  }

  return result;
}

/**
 * Retrieve cached portfolio aggregation or execute calculation callback.
 */
export async function getOrSetPortfolioAggregationCache<T>(
  userId: string,
  period: string,
  computeFn: () => Promise<T>
): Promise<T> {
  const key = metricCacheKey.portfolio(userId, period);

  try {
    if (redis.status === 'ready') {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    }
  } catch (_err) {
    // Fail open
  }

  const result = await computeFn();

  try {
    if (redis.status === 'ready' && result) {
      await redis.setex(key, PORTFOLIO_TTL_SECONDS, JSON.stringify(result));
    }
  } catch (_err) {
    // Fail open
  }

  return result;
}

/**
 * Invalidate cached metrics when project data is mutated.
 */
export async function invalidateProjectMetricsCache(projectId: string): Promise<void> {
  try {
    if (redis.status === 'ready') {
      const keys = await redis.keys(`metrics:${projectId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (_err) {
    // Ignore error
  }
}

/**
 * Invalidate portfolio aggregation cache when user data changes.
 */
export async function invalidatePortfolioCache(userId: string): Promise<void> {
  try {
    if (redis.status === 'ready') {
      const keys = await redis.keys(`portfolio:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  } catch (_err) {
    // Ignore error
  }
}
