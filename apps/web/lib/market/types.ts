/**
 * Macroeconomic & Local Market Data Types
 * Conforming strictly to Radix-Lyra Design System and NO-MOCK CONTRACT.
 */

export type MacroTickerSymbol =
  | 'DGS10'         // 10-Year Treasury Constant Maturity Rate
  | 'MORTGAGE30US'  // 30-Year Fixed Rate Mortgage (Freddie Mac)
  | 'OBMMIC30YF'    // Optimal Blue 30-Year Fixed Mortgage Index
  | 'SOFR'          // Secured Overnight Financing Rate
  | 'VNQ';          // Vanguard Real Estate ETF

export type ScoreboardPeriod = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';

export type TickerUnit = 'percent' | 'usd' | 'index' | 'basis_points' | 'months' | 'days';

export type MarketDataSource =
  | 'FRED'
  | 'ALPHA_VANTAGE'
  | 'POLYGON'
  | 'LOCAL_BENCHMARK'
  | 'UNCONFIGURED';

export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface LiveTickerItem {
  symbol: MacroTickerSymbol | string;
  name: string;
  category: 'macro' | 'debt' | 'equity' | 'local';
  currentValue: number;
  previousClose: number;
  delta: number;
  deltaPct: number;
  unit: TickerUnit;
  formatDecimals: number;
  sparkline: number[];
  lastUpdated: string;
  source: MarketDataSource;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'RealTime';
  isPositiveGood?: boolean; // false for yields/debt rates where increase adds cost
  description?: string;
  historicalSeries?: Record<ScoreboardPeriod, TimeSeriesPoint[]>;
}

export interface MarketIndicatorMetric {
  id: 'moi' | 'dom' | 'sale_to_list';
  label: string;
  value: number;
  previousValue: number;
  delta: number;
  deltaPct: number;
  unit: 'months' | 'days' | 'percent';
  formatDecimals: number;
  benchmarkRange: string;
  healthyThreshold: string;
  marketRegime: 'SELLER' | 'BALANCED' | 'BUYER' | 'DISTRESSED';
  interpretation: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  historicalSeries: Record<ScoreboardPeriod, TimeSeriesPoint[]>;
}

export interface LocalMarketScoreboard {
  marketName: string;
  geoCode: string;
  asOfDate: string;
  monthsOfInventory: MarketIndicatorMetric;
  daysOnMarket: MarketIndicatorMetric;
  saleToListRatio: MarketIndicatorMetric;
  absorptionRatePct: number;
}

export interface MarketScoreboardApiResponse {
  success: boolean;
  liveFeedConfigured: {
    fred: boolean;
    alphaVantage: boolean;
    polygon: boolean;
  };
  tickers: LiveTickerItem[];
  localMarket: LocalMarketScoreboard;
  timestamp: string;
}
