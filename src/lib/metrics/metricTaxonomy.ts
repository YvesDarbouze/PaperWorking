/**
 * Metric Taxonomy — single source of truth for metric classification.
 *
 * 33 canonical KPIs organized into five categories, plus the 10 hero
 * KPIs elevated as the headline scorecard tier.
 *
 * APPRECIATION (hero #10) is separate from the 33's numbering —
 * it lives in the scorecard but is NOT KPI #25.
 * KPI #25 is Real Estate Portfolio Value Growth.
 *
 * Pure types + constants — no runtime code, no I/O imports.
 */

import type { MetricId, MetricNullReason } from './types';

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
  /** Canonical MetricId from types.ts */
  id: MetricId;
  /** KPI number in the canonical 33 (1–33), or undefined for hero-only metrics */
  kpiNumber?: number;
  /** Human-readable display name */
  name: string;
  /** hero = top 10 scorecard KPIs, supplemental = Insights layer */
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
  /**
   * If this metric's data instrument doesn't exist yet, the reason code
   * that should be returned when the metric is null. Undefined means the
   * metric is fully computable from current inputs.
   */
  deferredReason?: MetricNullReason;
}

// ─── Hero Order (canonical, pinned) ─────────────────────────────────────────

/** The 10 hero KPIs in exact display order — do not reorder. */
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

/** Display order for the five canonical categories. */
export const CATEGORY_ORDER: MetricCategory[] = [
  'Financial Performance',
  'Operational Efficiency',
  'Asset & Portfolio Management',
  'Marketing & Sales',
  'Risk Management & Compliance',
];

// ─── Full Taxonomy ──────────────────────────────────────────────────────────

export const METRIC_TAXONOMY: MetricTaxonomyEntry[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // HERO TIER: The 10 headline scorecard KPIs
  // These are the metrics that appear on the TenKpiScorecard in Stage 2.
  // APPRECIATION is hero #10 and is NOT in the 33's numbering.
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'NOI',
    kpiNumber: 1,
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
    kpiNumber: 5,
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
    kpiNumber: 2,
    name: 'Capitalization Rate',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'Cap Rate = NOI \u00f7 Property Value',
    phaseLabel: 'Acquisition (Phase 1) / Exit (Phase 4)',
    benchmark: '4\u201310%',
    tagline: 'See the Asset\u2019s Raw Muscle. No Financing Tricks.',
    description:
      'A bad deal can hide behind creative loan terms. Savvy investors look past the financing to measure the pure, cash-equivalent strength of the property itself. But when rehab milestones run over budget, your Cap Rate plummets without you knowing. The exact second you enter a cost against a Project milestone, PaperWorking recalculates your true Cap Rate \u2014 turning daily project management into an early-warning system.',
  },
  {
    id: 'COC',
    kpiNumber: 3,
    name: 'Cash-on-Cash Return',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'CoC = Annual Cash Flow \u00f7 Cash Invested',
    phaseLabel: 'Fund (Phase 2) / Hold (Phase 3)',
    benchmark: '8\u201312%',
    tagline: 'Your Real Cash Yield. Live. Visual. Certain.',
    description:
      'Never fly blind on your actual returns. Command your capital efficiency with an automated dashboard that connects your daily workflow directly to your bottom line.',
  },
  {
    id: 'GRM',
    kpiNumber: 6,
    name: 'Gross Rent Multiplier',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'GRM = Purchase Price \u00f7 Gross Annual Rent',
    phaseLabel: 'Acquisition (Phase 1)',
    benchmark: '\u2264 12',
    tagline: 'Compare Properties Instantly.',
    description:
      'In a competitive market, listing prices can be misleading. GRM is a straight-to-the-point reality check \u2014 exactly how many years of gross rent it takes to cover the purchase price. PaperWorking visualizes it instantly, keeping your capital safe from bad valuations.',
  },
  {
    id: 'DSCR',
    kpiNumber: 7,
    name: 'Debt Service Coverage Ratio',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'DSCR = NOI \u00f7 Annual Debt Service',
    phaseLabel: 'Fund (Phase 2)',
    benchmark: '\u2265 1.25',
    tagline: 'Your DSCR. Automated. Fundable. Certain.',
    description:
      'Stop letting complex bank underwriting slow down your portfolio growth. Command your leverage with a real-time index of your property\u2019s true borrowing strength.',
  },
  {
    id: 'IRR',
    kpiNumber: 4,
    name: 'Internal Rate of Return',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'IRR = Solve NPV = 0 for cash flows',
    phaseLabel: 'Exit (Phase 4)',
    benchmark: '\u2265 15%',
    tagline: 'Your True Return. Time-Weighted. Undeniable.',
    description:
      'Profit tells you how much. IRR tells you how fast \u2014 the metric institutions use to rank every deal, because a dollar returned this year beats a dollar returned in year five. Two Deals with identical profit can have wildly different IRRs. PaperWorking computes yours live from your actual cash-in and cash-out dates, so you rank opportunities the way professionals do.',
  },
  {
    id: 'OCCUPANCY',
    kpiNumber: 18,
    name: 'Occupancy Rate',
    tier: 'hero',
    category: 'Operational Efficiency',
    formula: 'Occupancy = Occupied Units \u00f7 Total Units \u00d7 100',
    phaseLabel: 'Hold (Phase 3)',
    benchmark: '\u2265 90%',
    tagline: 'Every Vacant Day Has a Price Tag.',
    description:
      'Vacancy is the silent tax on your portfolio \u2014 invisible on a spreadsheet until the year is already lost. PaperWorking tracks occupancy across every unit you hold and shows you exactly what empty days are costing you, in dollars, right now.',
  },
  {
    id: 'OER',
    kpiNumber: 9,
    name: 'Expense Ratio',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'OER = OpEx \u00f7 Gross Income \u00d7 100',
    phaseLabel: 'Hold (Phase 3)',
    benchmark: '\u2264 40%',
    tagline: 'Find the Leak Before It Sinks the Margin.',
    description:
      'What percentage of your gross income do operating costs consume? Most investors can\u2019t answer \u2014 and rising expenses quietly eat returns that look healthy on the surface. PaperWorking calculates your Expense Ratio live from the costs you\u2019re already logging, so margin erosion shows up as a dashboard alert, not a year-end surprise.',
  },
  {
    id: 'APPRECIATION',
    // NO kpiNumber — Appreciation is hero #10, separate from the 33's numbering
    name: 'Long-Term Appreciation',
    tier: 'hero',
    category: 'Financial Performance',
    formula: 'Appreciation = CAGR of Property Value',
    phaseLabel: 'Acquisition (Phase 1)',
    benchmark: '3\u20135%/yr',
    tagline: 'The Return You Earn While Holding.',
    description:
      'Cash flow pays you monthly; appreciation builds your net worth. PaperWorking tracks your property\u2019s estimated market value over time \u2014 powered by live market data \u2014 so your equity growth is visible on the same dashboard as your income, and your hold-versus-exit decision is a calculation, not a guess.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCIAL PERFORMANCE — KPIs 1–17
  // KPIs 1–7, 9 are hero-tier above. Below: KPI 8, 10–17.
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'LTV',
    kpiNumber: 8,
    name: 'Loan-to-Value',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'LTV = Loan Amount \u00f7 Property Value \u00d7 100',
    phaseLabel: 'Fund / Hold',
    benchmark: '\u2264 75%',
    description: 'Assesses risk by comparing the mortgage balance to the property\u2019s current market value.',
  },
  {
    id: 'EQUITY_TO_VALUE',
    kpiNumber: 10,
    name: 'Equity-to-Value Ratio',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'Equity-to-Value = (Property Value \u2212 Loan Amount) \u00f7 Property Value \u00d7 100',
    phaseLabel: 'Fund / Hold',
    benchmark: '\u2265 25%',
    description: 'Proportion of asset value owned outright without debt — the inverse of LTV.',
  },
  {
    id: 'INTEREST_COVERAGE',
    kpiNumber: 11,
    name: 'Interest Coverage Ratio',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'Interest Coverage = NOI \u00f7 Year-1 Interest Payments',
    phaseLabel: 'Fund / Hold',
    benchmark: '\u2265 1.5',
    description: 'Measures ability to meet interest obligations. Year-1 interest from the shared amortization utility.',
  },
  {
    id: 'ROI',
    kpiNumber: 12,
    name: 'Return on Investment',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'ROI = Net Profit \u00f7 Total Cash Invested \u00d7 100',
    phaseLabel: 'Exit',
    benchmark: '\u2265 20%',
    description: 'Profitability of the venture relative to total cash deployed.',
  },
  {
    id: 'CAPEX',
    kpiNumber: 13,
    name: 'Capital Expenditures',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'CapEx = PP\u0026E (current) \u2212 PP\u0026E (prior) + Depreciation',
    phaseLabel: 'Hold',
    benchmark: 'Varies',
    description: 'Significant expenses incurred to acquire or improve property assets. Computed from the expense ledger.',
    deferredReason: 'REQUIRES_EXPENSE_LEDGER',
  },
  {
    id: 'GOI',
    kpiNumber: 14,
    name: 'Gross Operating Income',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'GOI = Potential Rental Income + Other Income',
    phaseLabel: 'Acquisition / Hold',
    benchmark: 'Varies',
    description: 'Total revenue before vacancy deductions and operating expenses. Already computed in NOI components.',
  },
  {
    id: 'AAR',
    kpiNumber: 15,
    name: 'Annual Average Return',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'AAR = Total Net Return \u00f7 Number of Years',
    phaseLabel: 'Hold / Exit',
    benchmark: '\u2265 8%',
    description: 'Average yearly ROI over the holding period. Requires historical income ledger entries.',
    deferredReason: 'REQUIRES_INCOME_LEDGER',
  },
  {
    id: 'EQUITY_MULTIPLE',
    kpiNumber: 16,
    name: 'Equity Multiple',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'EM = Total Return \u00f7 Cash Invested',
    phaseLabel: 'Hold / Exit',
    benchmark: '\u2265 2.0\u00d7',
    description: 'Pairs with IRR to measure total return divided by initial capital invested.',
  },
  {
    id: 'REVENUE_GROWTH',
    kpiNumber: 17,
    name: 'Revenue Growth',
    tier: 'supplemental',
    category: 'Financial Performance',
    formula: 'Revenue Growth = (Current \u2212 Prior) \u00f7 Prior \u00d7 100',
    phaseLabel: 'Hold',
    benchmark: '\u2265 3%',
    description: 'Year-over-year change in total revenue. Requires historical income ledger.',
    deferredReason: 'REQUIRES_INCOME_LEDGER',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATIONAL EFFICIENCY — KPIs 18–24
  // KPI 18 (Occupancy) is hero-tier above. Below: KPIs 19–24.
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'TENANT_TURNOVER',
    kpiNumber: 19,
    name: 'Tenant Turnover Rate',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: 'Turnover = Move-Outs \u00f7 Total Units \u00d7 100',
    phaseLabel: 'Hold',
    benchmark: '\u2264 15%',
    description: 'Rate at which tenants vacate and are replaced within a year.',
    deferredReason: 'REQUIRES_TENANT_REGISTRY',
  },
  {
    id: 'AVG_RENT_PER_PROPERTY',
    kpiNumber: 20,
    name: 'Average Rent Price per Property',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: 'Avg Rent = Total Rental Income \u00f7 Number of Properties',
    phaseLabel: 'Hold',
    benchmark: 'Varies',
    description: 'Mean rental income across a portfolio. Requires multi-project aggregation.',
    deferredReason: 'REQUIRES_PORTFOLIO_HISTORY',
  },
  {
    id: 'LEASE_RENEWAL',
    kpiNumber: 21,
    name: 'Lease Renewal Rate',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: 'Renewal = Renewals \u00f7 Expiring Leases \u00d7 100',
    phaseLabel: 'Hold',
    benchmark: '\u2265 75%',
    description: 'Percentage of expiring leases successfully renewed without unit turnover.',
    deferredReason: 'REQUIRES_TENANT_REGISTRY',
  },
  {
    id: 'MAINTENANCE_COST_PER_UNIT',
    kpiNumber: 22,
    name: 'Maintenance Cost per Unit',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: 'Maintenance/Unit = Total Maintenance \u00f7 Number of Units',
    phaseLabel: 'Hold',
    benchmark: '\u2264 $1,800/yr',
    description: 'Average annual maintenance expense allocated per leasable unit.',
  },
  {
    id: 'DOM',
    kpiNumber: 23,
    name: 'Days on Market',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: 'DOM = Listing Date \u2192 Sale Date',
    phaseLabel: 'Acquisition / Exit',
    benchmark: '\u2264 45 days',
    description: 'Time elapsed between listing and contract. Lower = hotter market or better pricing.',
    deferredReason: 'REQUIRES_LISTING_LOG',
  },
  {
    id: 'CONSTRUCTION_COST_SQFT',
    kpiNumber: 24,
    name: 'Construction Cost per Square Foot',
    tier: 'supplemental',
    category: 'Operational Efficiency',
    formula: 'Cost/sqft = Total Construction Costs \u00f7 Total Square Footage',
    phaseLabel: 'Acquisition / Fund',
    benchmark: 'Varies',
    description: 'Average expense of building or renovating on a per-square-foot basis.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ASSET & PORTFOLIO MANAGEMENT — KPIs 25–29
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'PORTFOLIO_VALUE_GROWTH',
    kpiNumber: 25,
    name: 'Real Estate Portfolio Value Growth',
    tier: 'supplemental',
    category: 'Asset & Portfolio Management',
    formula: 'Portfolio Growth = (Current Value \u2212 Prior Value) \u00f7 Prior Value \u00d7 100',
    phaseLabel: 'Hold',
    benchmark: '\u2265 3%/yr',
    description: 'Tracks the aggregate change in portfolio value over time. Requires multi-project aggregation.',
    deferredReason: 'REQUIRES_PORTFOLIO_HISTORY',
  },
  {
    id: 'PAYBACK_PERIOD',
    kpiNumber: 26,
    name: 'Payback Period',
    tier: 'supplemental',
    category: 'Asset & Portfolio Management',
    formula: 'Payback = Initial Investment \u00f7 Annual Net Income',
    phaseLabel: 'Hold / Exit',
    benchmark: '\u2264 10 yrs',
    description: 'Years until cumulative net income equals the original investment amount.',
  },
  {
    id: 'YOY_SOLD_PRICE_VARIANCE',
    kpiNumber: 27,
    name: 'YoY Variance of Average Sold Price',
    tier: 'supplemental',
    category: 'Asset & Portfolio Management',
    formula: 'YoY Variance = (Current Yr Avg \u2212 Prior Yr Avg) \u00f7 Prior Yr Avg \u00d7 100',
    phaseLabel: 'Acquisition / Exit',
    benchmark: 'Varies',
    description: 'Percentage change in average selling price from one year to the next. Awaits market data feed.',
    deferredReason: 'MARKET_DATA_DEFERRED',
  },
  {
    id: 'SOLD_PER_INVENTORY',
    kpiNumber: 28,
    name: 'Sold Homes per Available Inventory',
    tier: 'supplemental',
    category: 'Asset & Portfolio Management',
    formula: 'Sold/Inventory = Homes Sold \u00f7 Total Inventory \u00d7 100',
    phaseLabel: 'Acquisition',
    benchmark: 'Varies',
    description: 'Absorption rate comparing sales velocity to active listings. Awaits market data feed.',
    deferredReason: 'MARKET_DATA_DEFERRED',
  },
  {
    id: 'DEMAND_GROWTH',
    kpiNumber: 29,
    name: 'Real Estate Demand Growth',
    tier: 'supplemental',
    category: 'Asset & Portfolio Management',
    formula: 'Demand Growth = (New Demand \u2212 Original) \u00f7 Original \u00d7 100',
    phaseLabel: 'Acquisition',
    benchmark: '\u2265 0%',
    description: 'Change in real estate demand in a specific market over time. Awaits market data feed.',
    deferredReason: 'MARKET_DATA_DEFERRED',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // MARKETING & SALES — KPIs 30–31
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'LISTING_TO_MEETING',
    kpiNumber: 30,
    name: 'Listing-to-Meeting Ratio',
    tier: 'supplemental',
    category: 'Marketing & Sales',
    formula: 'L-to-M = Meetings \u00f7 Listings \u00d7 100',
    phaseLabel: 'Acquisition',
    benchmark: 'Varies',
    description: 'Conversion rate of property listings to actual meetings with potential buyers. Awaits CRM integration.',
    deferredReason: 'REQUIRES_LISTING_LOG',
  },
  {
    id: 'AVG_COMMISSION',
    kpiNumber: 31,
    name: 'Average Commission per Sale',
    tier: 'supplemental',
    category: 'Marketing & Sales',
    formula: 'Avg Commission = Total Commission \u00f7 Number of Sales',
    phaseLabel: 'Exit',
    benchmark: '2.5\u20133%',
    description: 'Average agent earnings per transaction. Awaits CRM integration.',
    deferredReason: 'REQUIRES_SALE_RECORD',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RISK MANAGEMENT & COMPLIANCE — KPIs 32–33
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'RISK_SCORE',
    kpiNumber: 32,
    name: 'Risk Assessment Score',
    tier: 'supplemental',
    category: 'Risk Management & Compliance',
    formula: 'Risk = (Financial + Market + Operational + Compliance) \u00f7 4',
    phaseLabel: 'All Phases',
    benchmark: '\u2264 3.0',
    description: 'Composite risk profile from banded computed values (DSCR/LTV bands, occupancy, hazard flags, compliance rate). Sub-scores are computed, not manually entered.',
  },
  {
    id: 'COMPLIANCE_RATE',
    kpiNumber: 33,
    name: 'Compliance Rate',
    tier: 'supplemental',
    category: 'Risk Management & Compliance',
    formula: 'Compliance = Compliant Items \u00f7 Total Requirements \u00d7 100',
    phaseLabel: 'All Phases',
    benchmark: '\u2265 95%',
    description: 'Degree of adherence to regulations and standards. Computed from DD checklist items seeded by the compliance cards.',
    deferredReason: 'REQUIRES_COMPLIANCE_CHECKLIST',
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

/** Returns all 33 KPI entries (those with a kpiNumber), ordered 1–33. */
export function getKPI33(): MetricTaxonomyEntry[] {
  return METRIC_TAXONOMY
    .filter((m) => m.kpiNumber != null)
    .sort((a, b) => a.kpiNumber! - b.kpiNumber!);
}

/** Lookup a single metric by ID. */
export function getMetricEntry(id: string): MetricTaxonomyEntry | undefined {
  return METRIC_TAXONOMY.find((m) => m.id === id);
}

/** Lookup a single metric by KPI number (1–33). */
export function getMetricByNumber(kpiNumber: number): MetricTaxonomyEntry | undefined {
  return METRIC_TAXONOMY.find((m) => m.kpiNumber === kpiNumber);
}
