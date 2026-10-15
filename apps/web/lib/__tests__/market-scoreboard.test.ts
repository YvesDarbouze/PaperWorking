import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import {
  getMarketScoreboardData,
  buildHistoricalSeriesFromPoints,
  clearMarketScoreboardCache,
  BENCHMARK_TICKERS,
  BENCHMARK_LOCAL_MARKET,
} from '../market/market-service';

describe('Market Scoreboard Service and Real-Time Market Vitals', () => {
  beforeEach(() => {
    clearMarketScoreboardCache();
  });

  it('returns valid market scoreboard structure with tickers, real market dates, and local market indicators', async () => {
    const data = await getMarketScoreboardData();
    expect(data.success).toBe(true);
    expect(data.tickers).toBeDefined();
    expect(data.tickers.length).toBe(5);

    const periods = ['1M', '3M', '6M', '1Y', '5Y', 'ALL'] as const;

    // Verify all macro & debt tickers have real market dates and historical series for every timeframe
    for (const ticker of data.tickers) {
      expect(ticker.currentValue).toBeGreaterThan(0);
      expect(ticker.marketDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(ticker.historicalSeries).toBeDefined();
      for (const period of periods) {
        const series = ticker.historicalSeries?.[period] || [];
        expect(series.length).toBeGreaterThan(0);
        // Latest point in each timeframe must match the ticker's latest market observation date & value
        const latestPoint = series[series.length - 1];
        expect(latestPoint.date).toBe(ticker.marketDate);
        expect(latestPoint.value).toBeCloseTo(ticker.currentValue, 2);
      }
    }

    // Verify Local Market Scoreboard has real observation dates and historical series
    expect(data.localMarket).toBeDefined();
    expect(data.localMarket.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const localMetrics = [
      data.localMarket.monthsOfInventory,
      data.localMarket.daysOnMarket,
      data.localMarket.saleToListRatio,
    ];

    for (const metric of localMetrics) {
      expect(metric.value).toBeGreaterThan(0);
      expect(metric.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(metric.source).toBe('FRED');
      for (const period of periods) {
        const series = metric.historicalSeries[period];
        expect(series.length).toBeGreaterThan(0);
        const latestPoint = series[series.length - 1];
        expect(latestPoint.date).toBe(metric.asOfDate);
        expect(latestPoint.value).toBeCloseTo(metric.value, 1);
      }
    }

    expect(data.localMarket.absorptionRatePct).toBeGreaterThan(0);
  });

  it('hydrates live FRED and Polygon observations and historicalSeries with exact market dates', async () => {
    const originalFetch = global.fetch;
    process.env.FRED_API_KEY = 'test-fred-key';
    process.env.POLYGON_API_KEY = 'test-polygon-key';

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('series_id=DGS10')) {
        return {
          ok: true,
          json: async () => ({
            observations: [
              { date: '2026-10-09', value: '5.24' },
              { date: '2026-10-08', value: '5.22' },
              { date: '2026-09-09', value: '5.10' },
              { date: '2025-10-09', value: '4.35' },
            ],
          }),
        } as Response;
      }
      if (url.includes('series_id=HOSSUPUSM673N')) {
        return {
          ok: true,
          json: async () => ({
            observations: [
              { date: '2026-09-01', realtime_end: '2026-10-14', value: '4.8' },
              { date: '2026-08-01', realtime_end: '2026-10-14', value: '4.9' },
              { date: '2026-07-01', realtime_end: '2026-10-14', value: '4.7' },
              { date: '2025-09-01', realtime_end: '2026-10-14', value: '4.6' },
            ],
          }),
        } as Response;
      }
      if (url.includes('api.polygon.io')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              { t: Date.parse('2025-10-13T00:00:00Z'), c: 89.4, o: 89.0 },
              { t: Date.parse('2026-10-09T00:00:00Z'), c: 91.45, o: 91.1 },
              { t: Date.parse('2026-10-12T00:00:00Z'), c: 91.36, o: 90.65 },
              { t: Date.parse('2026-10-13T00:00:00Z'), c: 91.14, o: 92.22 },
            ],
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({ observations: [] }),
      } as Response;
    }) as typeof fetch;

    try {
      const data = await getMarketScoreboardData();
      const dgs10 = data.tickers.find((t) => t.symbol === 'DGS10')!;
      expect(dgs10.currentValue).toBe(5.24);
      expect(dgs10.previousClose).toBe(5.22);
      expect(dgs10.delta).toBeCloseTo(0.02, 2);
      expect(dgs10.marketDate).toBe('2026-10-09');
      expect(dgs10.historicalSeries?.['1Y'].slice(-1)[0]).toEqual({
        date: '2026-10-09',
        value: 5.24,
      });

      const vnq = data.tickers.find((t) => t.symbol === 'VNQ')!;
      expect(vnq.currentValue).toBe(91.14);
      expect(vnq.previousClose).toBe(91.36);
      expect(vnq.delta).toBeCloseTo(-0.22, 2);
      expect(vnq.marketDate).toBe('2026-10-13');
      expect(vnq.historicalSeries?.['1Y'].slice(-1)[0]).toEqual({
        date: '2026-10-13',
        value: 91.14,
      });

      expect(data.localMarket.monthsOfInventory.value).toBe(4.8);
      expect(data.localMarket.monthsOfInventory.seriesSymbol).toBe('HOSSUPUSM673N');
      expect(data.localMarket.monthsOfInventory.asOfDate).toBe('2026-10-14');
      expect(data.localMarket.monthsOfInventory.referencePeriod).toBe('Sep 2026');
      expect(data.localMarket.monthsOfInventory.historicalSeries['1Y'].slice(-1)[0]).toEqual({
        date: '2026-10-14',
        value: 4.8,
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('partitions real ascending observation points across all 6 timeframes accurately', () => {
    const rawPoints = [
      { date: '2021-10-01', value: 3.1 },
      { date: '2023-10-01', value: 4.5 },
      { date: '2025-10-01', value: 4.8 },
      { date: '2026-06-01', value: 5.0 },
      { date: '2026-08-01', value: 5.1 },
      { date: '2026-09-15', value: 5.15 },
      { date: '2026-10-01', value: 5.18 },
      { date: '2026-10-08', value: 5.22 },
      { date: '2026-10-09', value: 5.24 },
    ];

    const series = buildHistoricalSeriesFromPoints(rawPoints);
    const periods = ['1M', '3M', '6M', '1Y', '5Y', 'ALL'] as const;

    periods.forEach((p) => {
      expect(series[p].length).toBeGreaterThanOrEqual(4);
      const last = series[p][series[p].length - 1];
      expect(last).toEqual({ date: '2026-10-09', value: 5.24 });
    });

    expect(series.ALL[0]).toEqual({ date: '2021-10-01', value: 3.1 });
  });

  it('provides all 6 timeframe intervals for benchmark tickers and local market', () => {
    const periods = ['1M', '3M', '6M', '1Y', '5Y', 'ALL'] as const;
    BENCHMARK_TICKERS.forEach((item) => {
      periods.forEach((p) => {
        expect(item.historicalSeries?.[p]).toBeDefined();
        expect(item.historicalSeries?.[p]?.length).toBeGreaterThan(0);
      });
    });
    periods.forEach((p) => {
      expect(BENCHMARK_LOCAL_MARKET.monthsOfInventory.historicalSeries[p].length).toBeGreaterThan(0);
      expect(BENCHMARK_LOCAL_MARKET.daysOnMarket.historicalSeries[p].length).toBeGreaterThan(0);
      expect(BENCHMARK_LOCAL_MARKET.saleToListRatio.historicalSeries[p].length).toBeGreaterThan(0);
    });
  });

  it('correctly tracks live feed configuration state honestly per Rule 5', async () => {
    const data = await getMarketScoreboardData();
    expect(data.liveFeedConfigured).toBeDefined();
    expect(typeof data.liveFeedConfigured.fred).toBe('boolean');
    expect(typeof data.liveFeedConfigured.polygon).toBe('boolean');
    expect(typeof data.liveFeedConfigured.alphaVantage).toBe('boolean');
  });
});

