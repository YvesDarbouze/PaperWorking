import { getMarketScoreboardData, BENCHMARK_TICKERS, BENCHMARK_LOCAL_MARKET } from '../market/market-service';

describe('Market Scoreboard Service and Benchmark Observables', () => {
  it('returns valid market scoreboard structure with tickers and local market indicators', async () => {
    const data = await getMarketScoreboardData();
    expect(data.success).toBe(true);
    expect(data.tickers).toBeDefined();
    expect(data.tickers.length).toBeGreaterThanOrEqual(4);

    // Verify 10-Year Treasury Yield (DGS10)
    const tenYear = data.tickers.find((t) => t.symbol === 'DGS10');
    expect(tenYear).toBeDefined();
    expect(tenYear?.currentValue).toBeGreaterThan(0);
    expect(tenYear?.unit).toBe('percent');
    expect(tenYear?.historicalSeries).toBeDefined();
    expect(tenYear?.historicalSeries?.['1Y']?.length).toBeGreaterThan(0);

    // Verify 30-Year Mortgage (MORTGAGE30US)
    const mortgage30 = data.tickers.find((t) => t.symbol === 'MORTGAGE30US');
    expect(mortgage30).toBeDefined();
    expect(mortgage30?.currentValue).toBeGreaterThan(0);

    // Verify SOFR
    const sofr = data.tickers.find((t) => t.symbol === 'SOFR');
    expect(sofr).toBeDefined();
    expect(sofr?.currentValue).toBeGreaterThan(0);

    // Verify VNQ ETF
    const vnq = data.tickers.find((t) => t.symbol === 'VNQ');
    expect(vnq).toBeDefined();
    expect(vnq?.unit).toBe('usd');

    // Verify Local Market Scoreboard
    expect(data.localMarket).toBeDefined();
    expect(data.localMarket.monthsOfInventory.value).toBeGreaterThan(0);
    expect(data.localMarket.daysOnMarket.value).toBeGreaterThan(0);
    expect(data.localMarket.saleToListRatio.value).toBeGreaterThan(0);
    expect(data.localMarket.absorptionRatePct).toBeGreaterThan(0);
  });

  it('provides all 6 timeframe intervals for historical comparison charts', () => {
    const periods = ['1M', '3M', '6M', '1Y', '5Y', 'ALL'] as const;
    const item = BENCHMARK_TICKERS[0];
    periods.forEach((p) => {
      expect(item.historicalSeries?.[p]).toBeDefined();
      expect(item.historicalSeries?.[p]?.length).toBeGreaterThan(0);
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
