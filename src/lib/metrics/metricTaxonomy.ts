/**
 * Metric Taxonomy — single source of truth for metric classification.
 *
 * Every metric that appears on PaperWorking Insights is classified into
 * exactly one of five categories, with the 10 canonical KPIs elevated
 * as the hero tier.
 *
 * Pure types + constants — no runtime code, no I/O imports.
 */

import type { MetricId } from './types';

// ─── Category & Tier ────────────────────────────────────────────────────────

export type MetricCategory =
  | 'Financial Performance'
  | 'Operational Efficiency'
  | 'Asset & Portfolio Management'
  | 'Marketing & Sales'
  | 'Risk Management & Compliance';

export type MetricTier = 'hero' | 'supplemental';

// ─── Taxonomy Entry ─────────────────────────────────────────────────────────

export interface MetricTaxonomyEntry {
  /** Canonical MetricId from types.ts (hero metrics) or display key (supplemental) */
  id: MetricId | 'PRICE_TO_RENT' | 'VACANCY';
  /** Human-readable display name */
  name: string;
  /** hero = top 10 KPIs, supplemental = supporting context */
  tier: MetricTier;
  /** One of the five taxonomy categories */
  category: MetricCategory;
  /** Formula expression for tooltips */
  formula: string;
  /** REIL phase gate label */
  phaseLabel: string;
  /** Benchmark display string */
  benchmark: string;
  /** Marketing tagline from the KPI Copy Deck (hero metrics only) */
  tagline?: string;
  /** Full description for tooltips / drill-downs */
  description: string;
}

// ─── Hero Order (canonical, pinned) ─────────────────────────────────────────

/** The 10 canonical KPIs in exact display order — do not reorder. */
export const HERO_ORDER: MetricId[] = [
  'NOI',
  'CASH_FLOW',
  'CAP_RATE',
  'COC',
  'GRM',
  'DSCR',
  'IRR',
  'OCCUPANCY',
  'OER',
  'APPRECIATION',
];

// ─── Category Order ─────────────────────────────────────────────────────────

/** Display order for supplemental categories. */
export const CATEGORY_ORDER: MetricCategory[] = [
  'Financial Performance',
  'Operational Efficiency',
  'Asset & Portfolio Management',
  'Marketing & Sales',
  'Risk Management & Compliance',
];

// ─── Full Taxonomy ──────────────────────────────────────────────────────────

export const METRIC_TAXONOMY: MetricTaxonomyEntry[] = [
  // ── Hero Tier: Financial Performance (10 KPIs) ────────────────────────────

  {
    id: 'NOI',
    name: 'Net Operating Income',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'NOI = Revenue − OpEx',
    phaseLabel: 'Hold (Phase 3) / Acquisition',
    benchmark: '> $0',
    tagline: 'Instant NOI. Zero Formulas. Total Control.',
    description:
      'Net Operating Income is the foundation of your real estate wealth. It dictates your property\u2019s market value, drives your Cap Rate, and proves your portfolio\u2019s strength. If you can\u2019t pull this number up in five seconds, you\u2019re leaving money on the table. PaperWorking eliminates the data-entry homework, turning your daily milestone logs into instant financial clarity.',
  },
  {
    id: 'CASH_FLOW',
    name: 'Cash Flow',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'Cash Flow = NOI − Debt Service',
    phaseLabel: 'Hold (Phase 3)',
    benchmark: '> $0',
    tagline: 'Your Cash Flow. Automated. Visualized. Certain.',
    description:
      'Stop guesstimating your margins. Command your portfolio like an institution with real-time liquidity tracking that requires zero accounting experience.',
  },
  {
    id: 'CAP_RATE',
    name: 'Capitalization Rate',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'Cap Rate = NOI ÷ Property Value',
    phaseLabel: 'Acquisition (Phase 1) / Exit (Phase 4)',
    benchmark: '4–10%',
    tagline: 'See the Asset\u2019s Raw Muscle. No Financing Tricks.',
    description:
      'A bad deal can hide behind creative loan terms. Savvy investors look past the financing to measure the pure, cash-equivalent strength of the property itself. But when rehab milestones run over budget, your Cap Rate plummets without you knowing. The exact second you enter a cost against a Project milestone, PaperWorking recalculates your true Cap Rate \u2014 turning daily project management into an early-warning system.',
  },
  {
    id: 'COC',
    name: 'Cash-on-Cash Return',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'CoC = Annual Cash Flow ÷ Cash Invested',
    phaseLabel: 'Fund (Phase 2) / Hold (Phase 3)',
    benchmark: '8–12%',
    tagline: 'Your Real Cash Yield. Live. Visual. Certain.',
    description:
      'Never fly blind on your actual returns. Command your capital efficiency with an automated dashboard that connects your daily workflow directly to your bottom line.',
  },
  {
    id: 'GRM',
    name: 'Gross Rent Multiplier',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'GRM = Purchase Price ÷ Gross Annual Rent',
    phaseLabel: 'Acquisition (Phase 1)',
    benchmark: '≤ 12',
    tagline: 'Compare Properties Instantly.',
    description:
      'In a competitive market, listing prices can be misleading. GRM is a straight-to-the-point reality check \u2014 exactly how many years of gross rent it takes to cover the purchase price. PaperWorking visualizes it instantly, keeping your capital safe from bad valuations.',
  },
  {
    id: 'DSCR',
    name: 'Debt Service Coverage Ratio',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'DSCR = NOI ÷ Annual Debt Service',
    phaseLabel: 'Fund (Phase 2)',
    benchmark: '≥ 1.25',
    tagline: 'Your DSCR. Automated. Fundable. Certain.',
    description:
      'Stop letting complex bank underwriting slow down your portfolio growth. Command your leverage with a real-time index of your property\u2019s true borrowing strength.',
  },
  {
    id: 'IRR',
    name: 'Internal Rate of Return',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'IRR = Solve NPV = 0 for cash flows',
    phaseLabel: 'Exit (Phase 4)',
    benchmark: '≥ 15%',
    tagline: 'Your True Return. Time-Weighted. Undeniable.',
    description:
      'Profit tells you how much. IRR tells you how fast \u2014 the metric institutions use to rank every deal, because a dollar returned this year beats a dollar returned in year five. Two Deals with identical profit can have wildly different IRRs. PaperWorking computes yours live from your actual cash-in and cash-out dates, so you rank opportunities the way professionals do.',
  },
  {
    id: 'OCCUPANCY',
    name: 'Occupancy Rate',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'Occupancy = Occupied Units ÷ Total Units',
    phaseLabel: 'Hold (Phase 3)',
    benchmark: '≥ 90%',
    tagline: 'Every Vacant Day Has a Price Tag.',
    description:
      'Vacancy is the silent tax on your portfolio \u2014 invisible on a spreadsheet until the year is already lost. PaperWorking tracks occupancy across every unit you hold and shows you exactly what empty days are costing you, in dollars, right now.',
  },
  {
    id: 'OER',
    name: 'Expense Ratio',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'OER = OpEx ÷ Gross Income',
    phaseLabel: 'Hold (Phase 3)',
    benchmark: '≤ 40%',
    tagline: 'Find the Leak Before It Sinks the Margin.',
    description:
      'What percentage of your gross income do operating costs consume? Most investors can\u2019t answer \u2014 and rising expenses quietly eat returns that look healthy on the surface. PaperWorking calculates your Expense Ratio live from the costs you\u2019re already logging, so margin erosion shows up as a dashboard alert, not a year-end surprise.',
  },
  {
    id: 'APPRECIATION',
    name: 'Long-Term Appreciation',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'Appreciation = CAGR of Property Value',
    phaseLabel: 'Acquisition (Phase 1)',
    benchmark: '3–5%/yr',
    tagline: 'The Return You Earn While Holding.',
    description:
      'Cash flow pays you monthly; appreciation builds your net worth. PaperWorking tracks your property\u2019s estimated market value over time \u2014 powered by live market data \u2014 so your equity growth is visible on the same dashboard as your income, and your hold-versus-exit decision is a calculation, not a guess.',
  },

  // ── Supplemental: Financial Performance ─────────────────────────────────

  {
    id: 'EQUITY_MULTIPLE',
    name: 'Equity Multiple',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'Total Return ÷ Cash Invested',
    phaseLabel: 'Hold / Exit',
    benchmark: '≥ 2.0×',
    description: 'Pairs with IRR to measure total return divided by initial capital invested.',
  },
  {
    id: 'PAYBACK_PERIOD',
    name: 'Payback Period',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'Total Cash Invested ÷ Annual Cash Flow',
    phaseLabel: 'Hold / Exit',
    benchmark: '≤ 10 yrs',
    description: 'Horizon when cumulative cash flow matches initial cash invested.',
  },

  // ── Supplemental: Operational Efficiency ────────────────────────────────

  {
    id: 'TENANT_TURNOVER',
    name: 'Tenant Turnover Rate',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: 'Move-Outs ÷ Total Units × 100',
    phaseLabel: 'Hold',
    benchmark: '≤ 15%',
    description: 'Calculates historical annual move-outs relative to total asset units.',
  },
  {
    id: 'LEASE_RENEWAL',
    name: 'Lease Renewal Rate',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: 'Renewals ÷ Expiring Leases × 100',
    phaseLabel: 'Hold',
    benchmark: '≥ 75%',
    description: 'Percentage of expiring leases successfully renewed without unit turnover.',
  },
  {
    id: 'MAINTENANCE_COST_PER_UNIT',
    name: 'Maintenance Cost / Unit',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: 'Annual Maintenance ÷ Units',
    phaseLabel: 'Hold',
    benchmark: '≤ $1,800/yr',
    description: 'Standardized annual maintenance cost allocated per leasable unit.',
  },
  {
    id: 'BUDGET_VARIANCE',
    name: 'Budget Variance',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: '(Actual − Budget) ÷ Budget × 100',
    phaseLabel: 'Acquisition / Fund',
    benchmark: '≤ 0%',
    description: 'Measures project construction actuals against budgeted numbers.',
  },

  // ── Supplemental: Asset & Portfolio Management ──────────────────────────

  {
    id: 'CAPITAL_RESERVES',
    name: 'CapEx Funded Reserves',
    tier: 'supplemental',
    category: 'Asset & Portfolio Management',
    formula: 'Capital Reserves ÷ Monthly Maintenance',
    phaseLabel: 'Hold',
    benchmark: '≥ 12 mo',
    description: 'Months of monthly maintenance reserves currently covered by liquid capital.',
  },
  {
    id: 'VACANCY' as any,
    name: 'Vacancy Rate',
    tier: 'supplemental',
    category: 'Asset & Portfolio Management',
    formula: '100 − Occupancy Rate',
    phaseLabel: 'Acquisition / Hold',
    benchmark: '≤ 7%',
    description: 'Percentage of time the property sits empty, uncollected, or between tenant turnover.',
  },

  // ── Supplemental: Marketing & Sales ─────────────────────────────────────

  {
    id: 'PRICE_TO_RENT' as any,
    name: 'Price-to-Rent Ratio',
    tier: 'supplemental',
    category: 'Marketing & Sales',
    formula: 'Median Home Price ÷ Avg Annual Rent',
    phaseLabel: 'Acquisition',
    benchmark: '15–20',
    description: 'Price-to-Rent Ratio compares home purchase prices to average rental rates.',
  },
  {
    id: 'DOM',
    name: 'Days on Market',
    tier: 'supplemental',
    category: 'Marketing & Sales',
    formula: 'Listing Date → Sale Date',
    phaseLabel: 'Acquisition / Exit',
    benchmark: '≤ 45 days',
    description: 'Market timeline benchmark for initial acquisition or disposition.',
  },

  // ── Supplemental: Risk Management & Compliance ──────────────────────────

  {
    id: 'LTV',
    name: 'Loan-to-Value',
    tier: 'supplemental',
    category: 'Risk Management & Compliance',
    formula: 'Loan Amount ÷ Property Value × 100',
    phaseLabel: 'Fund / Hold',
    benchmark: '≤ 75%',
    description: 'Represents the lender risk framework relative to the current valuation.',
  },
  {
    id: 'DEBT_YIELD',
    name: 'Debt Yield',
    tier: 'supplemental',
    category: 'Risk Management & Compliance',
    formula: 'NOI ÷ Loan Amount × 100',
    phaseLabel: 'Fund / Hold',
    benchmark: '≥ 10%',
    description: 'Measures cash-on-cash yield for the debt stack, ignoring underwriting terms.',
  },
  {
    id: 'BREAK_EVEN_OCCUPANCY',
    name: 'Break-Even Occupancy',
    tier: 'supplemental',
    category: 'Risk Management & Compliance',
    formula: '(OpEx + Debt) ÷ Gross Rent × 100',
    phaseLabel: 'Hold',
    benchmark: '≤ 75%',
    description: 'Required utilization to cover operating expenses and mortgage debt service.',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns only the 10 hero KPI entries in canonical order. */
export function getHeroMetrics(): MetricTaxonomyEntry[] {
  return HERO_ORDER.map(
    (id) => METRIC_TAXONOMY.find((m) => m.id === id)!
  );
}

/** Returns supplemental metrics grouped by category in display order. */
export function getSupplementalByCategory(): Record<MetricCategory, MetricTaxonomyEntry[]> {
  const result = {} as Record<MetricCategory, MetricTaxonomyEntry[]>;
  for (const cat of CATEGORY_ORDER) {
    result[cat] = METRIC_TAXONOMY.filter(
      (m) => m.tier === 'supplemental' && m.category === cat
    );
  }
  return result;
}

/** Lookup a single metric by ID. */
export function getMetricEntry(id: string): MetricTaxonomyEntry | undefined {
  return METRIC_TAXONOMY.find((m) => m.id === id);
}
