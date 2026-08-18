import {
  getOrSetProjectMetricsCache,
  getOrSetPortfolioAggregationCache,
  invalidateProjectMetricsCache,
  invalidatePortfolioCache,
  metricCacheKey,
} from '../metricCache';
import { logQueryPerformance } from '../../db/queryAudit';

describe('Performance Engine & Metric Caching (AGENT P-4)', () => {
  test('metricCacheKey generates structured Redis keys', () => {
    expect(metricCacheKey.project('proj_123', '2026-08-18')).toBe('metrics:proj_123:2026-08-18');
    expect(metricCacheKey.portfolio('user_123', '2026-Q3')).toBe('portfolio:user_123:2026-Q3');
  });

  test('getOrSetProjectMetricsCache computes metrics on cache miss', async () => {
    const computeFn = jest.fn().mockResolvedValue({ noi: 125000, capRate: 0.065 });

    const result = await getOrSetProjectMetricsCache('proj_123', '2026-08-18', computeFn);

    expect(result).toEqual({ noi: 125000, capRate: 0.065 });
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  test('getOrSetPortfolioAggregationCache computes aggregation on cache miss', async () => {
    const computeFn = jest.fn().mockResolvedValue({ totalValue: 4500000, totalUnits: 18 });

    const result = await getOrSetPortfolioAggregationCache('user_123', '2026-Q3', computeFn);

    expect(result).toEqual({ totalValue: 4500000, totalUnits: 18 });
    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  test('invalidateProjectMetricsCache handles execution without error', async () => {
    await expect(invalidateProjectMetricsCache('proj_123')).resolves.not.toThrow();
  });

  test('logQueryPerformance flags slow queries exceeding 100ms', () => {
    const fastLog = logQueryPerformance('SELECT * FROM Project WHERE id = $1', 45);
    expect(fastLog.isSlow).toBe(false);

    const slowLog = logQueryPerformance('SELECT * FROM TaxRecord JOIN Project ON ...', 145);
    expect(slowLog.isSlow).toBe(true);
  });
});
