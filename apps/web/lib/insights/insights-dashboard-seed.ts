/** Seed surfaces for the full `/dashboard/insights` dashboard (v0 parity). */

export type TrendPeriod = 'monthly' | 'quarterly' | 'annual';

export const TREND_PERIOD_LABELS: Record<TrendPeriod, string> = {
  monthly: 'vs last month',
  quarterly: 'vs last quarter',
  annual: 'vs last year',
};

export interface InvestorKpiCard {
  id: string;
  name: string;
  value: number | null;
  unit: 'currency' | 'percent' | 'ratio' | 'days' | 'count';
  higherIsBetter: boolean;
  formula: string;
  description: string;
  /** Optional prior for trend arrows (null → em dash / neutral). */
  prior: number | null;
}

export interface InvestorKpiSection {
  key: 'core' | 'leverage' | 'operational' | 'growth' | 'additional';
  title: string;
  metrics: InvestorKpiCard[];
}

/** Spec sections from v0 `investorKpiView` + seed values for visual parity. */
export const INVESTOR_KPI_SECTIONS: InvestorKpiSection[] = [
  {
    key: 'core',
    title: 'Core Metrics',
    metrics: [
      {
        id: 'noi',
        name: 'Net Operating Income',
        value: 186400,
        unit: 'currency',
        higherIsBetter: true,
        formula: 'Revenue − Operating Expenses',
        description: 'Operational profitability before debt service and CapEx.',
        prior: 178200,
      },
      {
        id: 'irr',
        name: 'Internal Rate of Return',
        value: 17.8,
        unit: 'percent',
        higherIsBetter: true,
        formula: 'Discount rate where NPV of cash flows = 0',
        description: 'Annualized return across the hold period.',
        prior: 16.4,
      },
      {
        id: 'cap_rate',
        name: 'Cap Rate',
        value: 8.4,
        unit: 'percent',
        higherIsBetter: true,
        formula: '(NOI ÷ Property Value) × 100',
        description: 'Unlevered one-year yield on asset value.',
        prior: 8.1,
      },
      {
        id: 'cash_on_cash',
        name: 'Cash-on-Cash Return',
        value: 14.8,
        unit: 'percent',
        higherIsBetter: true,
        formula: '(Annual Cash Flow ÷ Cash Invested) × 100',
        description: 'Cash yield on out-of-pocket equity.',
        prior: 13.9,
      },
    ],
  },
  {
    key: 'leverage',
    title: 'Leverage & Risk',
    metrics: [
      {
        id: 'ltv',
        name: 'Loan-to-Value',
        value: 68.5,
        unit: 'percent',
        higherIsBetter: false,
        formula: '(Loan Amount ÷ Property Value) × 100',
        description: 'Debt relative to current asset value.',
        prior: 71.2,
      },
      {
        id: 'dscr',
        name: 'Debt Service Coverage',
        value: 1.42,
        unit: 'ratio',
        higherIsBetter: true,
        formula: 'NOI ÷ Total Debt Service',
        description: 'Income buffer covering mortgage obligations.',
        prior: 1.35,
      },
      {
        id: 'grm',
        name: 'Gross Rent Multiplier',
        value: 12.4,
        unit: 'ratio',
        higherIsBetter: false,
        formula: 'Property Price ÷ Gross Annual Rent',
        description: 'Years of gross rent to recover purchase price.',
        prior: 12.8,
      },
      {
        id: 'roa',
        name: 'Return on Assets',
        value: 6.2,
        unit: 'percent',
        higherIsBetter: true,
        formula: '(Net Income ÷ Total Assets) × 100',
        description: 'Income efficiency of the asset base.',
        prior: 5.9,
      },
    ],
  },
  {
    key: 'operational',
    title: 'Operational',
    metrics: [
      {
        id: 'oer',
        name: 'Operating Expense Ratio',
        value: 38.4,
        unit: 'percent',
        higherIsBetter: false,
        formula: '(OpEx ÷ Gross Operating Income) × 100',
        description: 'Share of revenue consumed by operations.',
        prior: 40.1,
      },
      {
        id: 'yield_on_cost',
        name: 'Yield on Cost',
        value: 9.1,
        unit: 'percent',
        higherIsBetter: true,
        formula: '(Stabilized NOI ÷ Total Project Cost) × 100',
        description: 'Stabilized yield on all-in development cost.',
        prior: 8.7,
      },
      {
        id: 'cash_flow',
        name: 'Monthly Cash Flow',
        value: 12400,
        unit: 'currency',
        higherIsBetter: true,
        formula: 'Income − Expenses − Debt Service',
        description: 'Net liquidity after debt service.',
        prior: 11200,
      },
      {
        id: 'occupancy_rate',
        name: 'Occupancy Rate',
        value: 96.8,
        unit: 'percent',
        higherIsBetter: true,
        formula: '(Occupied Units ÷ Total Units) × 100',
        description: 'Physical occupancy across the portfolio.',
        prior: 95.2,
      },
    ],
  },
  {
    key: 'growth',
    title: 'Growth',
    metrics: [
      {
        id: 'aar',
        name: 'Annual Average Return',
        value: 15.6,
        unit: 'percent',
        higherIsBetter: true,
        formula: 'Total Net Return ÷ Years Held',
        description: 'Arithmetic mean return over the hold.',
        prior: 14.8,
      },
      {
        id: 'revenue_growth',
        name: 'Revenue Growth',
        value: 7.4,
        unit: 'percent',
        higherIsBetter: true,
        formula: '((Current − Prior) ÷ Prior) × 100',
        description: 'Year-over-year top-line growth.',
        prior: 5.1,
      },
      {
        id: 'portfolio_value_growth',
        name: 'Portfolio Value Growth',
        value: 12.4,
        unit: 'percent',
        higherIsBetter: true,
        formula: '((New Value − Original) ÷ Original) × 100',
        description: 'Aggregate appreciation across holdings.',
        prior: 9.8,
      },
      {
        id: 'equity_multiple',
        name: 'Equity Multiple',
        value: 1.84,
        unit: 'ratio',
        higherIsBetter: true,
        formula: '(Total Distributions + Equity) ÷ Cash Invested',
        description: 'Total cash returned relative to equity in.',
        prior: 1.72,
      },
    ],
  },
];

export interface TrendPoint {
  label: string;
  value: number;
}

export const TREND_SERIES: Record<string, TrendPoint[]> = {
  noi: [
    { label: 'M-11', value: 14200 },
    { label: 'M-10', value: 14800 },
    { label: 'M-9', value: 15100 },
    { label: 'M-8', value: 14900 },
    { label: 'M-7', value: 15500 },
    { label: 'M-6', value: 15800 },
    { label: 'M-5', value: 16100 },
    { label: 'M-4', value: 15900 },
    { label: 'M-3', value: 16400 },
    { label: 'M-2', value: 16800 },
    { label: 'M-1', value: 17200 },
    { label: 'Now', value: 17800 },
  ],
  cash_flow: [
    { label: 'M-11', value: 8200 },
    { label: 'M-10', value: 8600 },
    { label: 'M-9', value: 9100 },
    { label: 'M-8', value: 8800 },
    { label: 'M-7', value: 9400 },
    { label: 'M-6', value: 9800 },
    { label: 'M-5', value: 10100 },
    { label: 'M-4', value: 9900 },
    { label: 'M-3', value: 10800 },
    { label: 'M-2', value: 11200 },
    { label: 'M-1', value: 11800 },
    { label: 'Now', value: 12400 },
  ],
  occupancy: [
    { label: 'M-11', value: 92 },
    { label: 'M-10', value: 93 },
    { label: 'M-9', value: 94 },
    { label: 'M-8', value: 93.5 },
    { label: 'M-7', value: 94.5 },
    { label: 'M-6', value: 95 },
    { label: 'M-5', value: 95.2 },
    { label: 'M-4', value: 94.8 },
    { label: 'M-3', value: 95.5 },
    { label: 'M-2', value: 96 },
    { label: 'M-1', value: 96.4 },
    { label: 'Now', value: 96.8 },
  ],
};

export interface ComparisonPoint {
  projectId: string;
  projectName: string;
  metrics: Record<string, number>;
}

export const COMPARISON_POINTS: ComparisonPoint[] = [
  {
    projectId: 'deal-1',
    projectName: '1247 Elm Street',
    metrics: { cap_rate: 7.8, cash_on_cash: 13.2, dscr: 1.28, ltv: 72, oer: 41, grm: 13.1 },
  },
  {
    projectId: 'deal-2',
    projectName: '88 Harbor Lane',
    metrics: { cap_rate: 8.9, cash_on_cash: 16.4, dscr: 1.51, ltv: 65, oer: 36, grm: 11.2 },
  },
  {
    projectId: 'deal-3',
    projectName: '512 Oak Ridge',
    metrics: { cap_rate: 8.1, cash_on_cash: 14.1, dscr: 1.38, ltv: 69, oer: 39, grm: 12.6 },
  },
];

export const COMPARE_METRIC_OPTIONS = [
  { id: 'cap_rate', name: 'Cap Rate', suffix: '%' },
  { id: 'cash_on_cash', name: 'Cash-on-Cash Return', suffix: '%' },
  { id: 'dscr', name: 'Debt Service Coverage (DSCR)', suffix: '×' },
  { id: 'ltv', name: 'Loan-to-Value (LTV)', suffix: '%' },
  { id: 'oer', name: 'Operating Expense Ratio (OER)', suffix: '%' },
  { id: 'grm', name: 'Gross Rent Multiplier (GRM)', suffix: '×' },
] as const;

export const TREND_METRIC_OPTIONS = [
  { id: 'noi', name: 'Net Operating Income', color: '#10b981', unit: 'currency' as const },
  { id: 'cash_flow', name: 'Net Cash Flow', color: '#6366f1', unit: 'currency' as const },
  { id: 'occupancy', name: 'Occupancy Rate', color: '#f59e0b', unit: 'percent' as const },
] as const;

export const INSIGHTS_TAB_CATEGORIES = [
  { id: 'financial', name: 'Financial Performance', icon: 'bar_chart', match: 'Financial Metrics' },
  { id: 'operational', name: 'Operational Efficiency', icon: 'monitoring', match: 'Deal Metrics' },
  { id: 'portfolio', name: 'Portfolio Management', icon: 'layers', match: 'Portfolio Metrics' },
  { id: 'marketing', name: 'Marketing & Sales', icon: 'group', match: 'Syndication Metrics' },
  { id: 'compliance', name: 'Risk & Compliance', icon: 'verified_user', match: 'Portfolio Metrics' },
] as const;

export function formatInvestorValue(
  value: number | null,
  unit: InvestorKpiCard['unit'],
): string {
  if (value === null || !Number.isFinite(value)) return '—';
  switch (unit) {
    case 'currency':
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      });
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'ratio':
      return `${value.toFixed(2)}×`;
    case 'days':
      return `${Math.round(value)} days`;
    default:
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
}

export function trendTone(
  higherIsBetter: boolean,
  current: number | null,
  prior: number | null,
): { arrow: 'up' | 'down' | 'flat' | 'none'; tone: 'positive' | 'negative' | 'neutral'; label: string } {
  if (current === null || prior === null || prior === 0) {
    return { arrow: 'none', tone: 'neutral', label: '—' };
  }
  const changePct = ((current - prior) / Math.abs(prior)) * 100;
  if (Math.abs(changePct) < 0.05) {
    return { arrow: 'flat', tone: 'neutral', label: '0.0%' };
  }
  const arrow = changePct > 0 ? 'up' : 'down';
  const rising = changePct > 0;
  const tone =
    (rising && higherIsBetter) || (!rising && !higherIsBetter) ? 'positive' : 'negative';
  return {
    arrow,
    tone,
    label: `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%`,
  };
}
