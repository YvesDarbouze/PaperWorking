import { deriveAllProjectMetrics } from './reiMetrics';

export type MetricCategoryKey = 'financial' | 'operational' | 'portfolio' | 'marketing' | 'compliance';
export type MetricUnitKey = 'currency' | 'percent' | 'ratio' | 'days' | 'count';

export interface MetricRegistryEntry {
  id: string;
  name: string;
  category: MetricCategoryKey;
  formula: string;
  unit: MetricUnitKey;
  compute: (project: any, portfolio?: any[]) => number | null;
  benchmark: {
    good: number | null;
    warning: number | null;
    bad: number | null;
  };
}

// Map registry lowercase metric ID to KPI33Block key inside active metrics
const KEY_MAP: Record<string, string> = {
  noi: 'NOI',
  cap_rate: 'CAP_RATE',
  cash_on_cash: 'COC',
  irr: 'IRR',
  cash_flow: 'CASH_FLOW',
  grm: 'GRM',
  dscr: 'DSCR',
  ltv: 'LTV',
  oer: 'OER',
  equity_to_value: 'EQUITY_TO_VALUE',
  interest_coverage: 'INTEREST_COVERAGE',
  roi: 'ROI',
  capex: 'CAPEX',
  goi: 'GOI',
  aar: 'AAR',
  equity_multiple: 'EQUITY_MULTIPLE',
  revenue_growth: 'REVENUE_GROWTH',
  occupancy_rate: 'OCCUPANCY',
  tenant_turnover: 'TENANT_TURNOVER',
  avg_rent_price: 'AVG_RENT_PER_PROPERTY',
  lease_renewal: 'LEASE_RENEWAL',
  maintenance_per_unit: 'MAINTENANCE_COST_PER_UNIT',
  days_on_market: 'DOM',
  construction_per_sqft: 'CONSTRUCTION_COST_SQFT',
  portfolio_value_growth: 'PORTFOLIO_VALUE_GROWTH',
  payback_period: 'PAYBACK_PERIOD',
  yoy_variance: 'YOY_SOLD_PRICE_VARIANCE',
  sold_per_inventory: 'SOLD_PER_INVENTORY',
  demand_growth: 'DEMAND_GROWTH',
  listing_to_meeting: 'LISTING_TO_MEETING',
  avg_commission: 'AVG_COMMISSION',
  risk_score: 'RISK_SCORE',
  compliance_rate: 'COMPLIANCE_RATE',
};

/**
 * Computes a single metric value for a project.
 * Derives all metrics via core engine and extracts the appropriate phase value (actual vs projected).
 */
export function computeSingleMetric(project: any, metricId: string): number | null {
  if (!project) return null;
  try {
    const derived = deriveAllProjectMetrics(project);
    const kpiKey = KEY_MAP[metricId];
    if (!kpiKey || !derived.kpi33) return null;

    const kpiVal = (derived.kpi33 as any)[kpiKey];
    if (!kpiVal) return null;

    // Derived values default to actual if project is in Hold or Exit phase, otherwise projected
    const isActual =
      project.phase === 'hold' ||
      project.phase === 'exit' ||
      project.status === 'hold' ||
      project.status === 'exit';

    const val = isActual ? kpiVal.actual : kpiVal.projected;
    return val !== undefined && val !== null ? val : null;
  } catch (err) {
    console.error(`[Metric Registry] Error computing ${metricId}:`, err);
    return null;
  }
}

/**
 * Returns the raw null reason for a metric if it is currently not calculable.
 */
export function computeSingleMetricNullReason(project: any, metricId: string): string | null {
  if (!project) return null;
  try {
    const derived = deriveAllProjectMetrics(project);
    const kpiKey = KEY_MAP[metricId];
    if (!kpiKey || !derived.kpi33) return null;

    const kpiVal = (derived.kpi33 as any)[kpiKey];
    if (!kpiVal) return null;

    const isActual =
      project.phase === 'hold' ||
      project.phase === 'exit' ||
      project.status === 'hold' ||
      project.status === 'exit';

    const reason = isActual ? kpiVal.actualNullReason : kpiVal.projectedNullReason;
    return reason || null;
  } catch (err) {
    return null;
  }
}

/**
 * Aggregates a metric value across all projects in the portfolio.
 * - Currency, count, days: Sum
 * - Percent, ratio: Weighted average based on project purchase price
 */
export function aggregatePortfolio(
  metricId: string,
  portfolio: any[],
  unit: MetricUnitKey
): number | null {
  if (!portfolio || portfolio.length === 0) return null;

  const validProjects = portfolio
    .map(p => {
      const val = computeSingleMetric(p, metricId);
      // Purchase price as weighting factor (fallback to 1 if missing or 0)
      const purchasePrice = p.financials?.purchasePrice ?? p.purchasePrice ?? 1;
      const weight = purchasePrice > 0 ? purchasePrice : 1;
      return { val, weight };
    })
    .filter(item => item.val !== null && !isNaN(item.val!));

  if (validProjects.length === 0) return null;

  if (unit === 'percent' || unit === 'ratio') {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const p of validProjects) {
      weightedSum += p.val! * p.weight;
      totalWeight += p.weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : null;
  } else {
    // Sum for currency, count, days
    return validProjects.reduce((sum, p) => sum + p.val!, 0);
  }
}

/**
 * Centralised compute router for the metric registry.
 */
function createCompute(metricId: string, unit: MetricUnitKey) {
  return (project: any, portfolio?: any[]): number | null => {
    if (portfolio && portfolio.length > 0) {
      return aggregatePortfolio(metricId, portfolio, unit);
    }
    return computeSingleMetric(project, metricId);
  };
}

export const METRICS_REGISTRY: MetricRegistryEntry[] = [
  // ── FINANCIAL PERFORMANCE (17 metrics) ───────────────────────────────────
  {
    id: 'noi',
    name: 'Net Operating Income',
    category: 'financial',
    formula: 'NOI = Gross Rental Income + Other Income − Vacancy Loss − Operating Expenses',
    unit: 'currency',
    compute: createCompute('noi', 'currency'),
    benchmark: { good: 0, warning: 0, bad: null }, // good: >0
  },
  {
    id: 'cap_rate',
    name: 'Capitalization Rate',
    category: 'financial',
    formula: 'Cap Rate = NOI ÷ Property Value × 100',
    unit: 'percent',
    compute: createCompute('cap_rate', 'percent'),
    benchmark: { good: 6.0, warning: 4.0, bad: 4.0 }, // good >= 6%, warning 4-6%, bad < 4%
  },
  {
    id: 'cash_on_cash',
    name: 'Cash-on-Cash Return',
    category: 'financial',
    formula: 'CoC = Annual Cash Flow ÷ Total Cash Deployed × 100',
    unit: 'percent',
    compute: createCompute('cash_on_cash', 'percent'),
    benchmark: { good: 8.0, warning: 5.0, bad: 5.0 }, // good >= 8%, warning 5-8%, bad < 5%
  },
  {
    id: 'irr',
    name: 'Internal Rate of Return',
    category: 'financial',
    formula: 'IRR = Discount rate where Net Present Value of all cash flows is zero',
    unit: 'percent',
    compute: createCompute('irr', 'percent'),
    benchmark: { good: 12.0, warning: 8.0, bad: 8.0 }, // good >= 12%, warning 8-12%, bad < 8%
  },
  {
    id: 'cash_flow',
    name: 'Cash Flow',
    category: 'financial',
    formula: 'Cash Flow = NOI − Annual Debt Service',
    unit: 'currency',
    compute: createCompute('cash_flow', 'currency'),
    benchmark: { good: 0, warning: 0, bad: null }, // good > 0
  },
  {
    id: 'grm',
    name: 'Gross Rent Multiplier',
    category: 'financial',
    formula: 'GRM = Property Price ÷ Gross Annual Rent',
    unit: 'ratio',
    compute: createCompute('grm', 'ratio'),
    benchmark: { good: 10.0, warning: 12.0, bad: 12.0 }, // GRM: good <= 10, warning 10-12, bad > 12 (lower is better)
  },
  {
    id: 'dscr',
    name: 'Debt Service Coverage Ratio',
    category: 'financial',
    formula: 'DSCR = NOI ÷ Annual Debt Service',
    unit: 'ratio',
    compute: createCompute('dscr', 'ratio'),
    benchmark: { good: 1.25, warning: 1.0, bad: 1.0 }, // good >= 1.25, warning 1.0-1.25, bad < 1.0
  },
  {
    id: 'ltv',
    name: 'Loan-to-Value Ratio',
    category: 'financial',
    formula: 'LTV = Loan Balance ÷ Current Property Value × 100',
    unit: 'percent',
    compute: createCompute('ltv', 'percent'),
    benchmark: { good: 75.0, warning: 80.0, bad: 80.0 }, // good <= 75%, warning 75-80%, bad > 80% (lower is better)
  },
  {
    id: 'oer',
    name: 'Operating Expense Ratio',
    category: 'financial',
    formula: 'OER = Operating Expenses ÷ Gross Operating Income × 100',
    unit: 'percent',
    compute: createCompute('oer', 'percent'),
    benchmark: { good: 40.0, warning: 50.0, bad: 50.0 }, // good <= 40%, warning 40-50%, bad > 50% (lower is better)
  },
  {
    id: 'equity_to_value',
    name: 'Equity-to-Value Ratio',
    category: 'financial',
    formula: 'Equity-to-Value = (Property Value − Loan Balance) ÷ Property Value × 100',
    unit: 'percent',
    compute: createCompute('equity_to_value', 'percent'),
    benchmark: { good: 30.0, warning: 20.0, bad: 20.0 }, // good >= 30%
  },
  {
    id: 'interest_coverage',
    name: 'Interest Coverage Ratio',
    category: 'financial',
    formula: 'Interest Coverage = NOI ÷ Total Interest Payments',
    unit: 'ratio',
    compute: createCompute('interest_coverage', 'ratio'),
    benchmark: { good: 2.0, warning: 1.5, bad: 1.5 }, // good >= 2.0
  },
  {
    id: 'roi',
    name: 'Return on Investment',
    category: 'financial',
    formula: 'ROI = (Net Return ÷ Total Invested) × 100',
    unit: 'percent',
    compute: createCompute('roi', 'percent'),
    benchmark: { good: 15.0, warning: 8.0, bad: 8.0 }, // good >= 15%
  },
  {
    id: 'capex',
    name: 'Capital Expenditures',
    category: 'financial',
    formula: 'CapEx = Total Rehab & Upgrade Capital Deployed',
    unit: 'currency',
    compute: createCompute('capex', 'currency'),
    benchmark: { good: null, warning: null, bad: null },
  },
  {
    id: 'goi',
    name: 'Gross Operating Income',
    category: 'financial',
    formula: 'GOI = Potential Rental Income + Other Income − Vacancy & Credit Loss',
    unit: 'currency',
    compute: createCompute('goi', 'currency'),
    benchmark: { good: 0, warning: 0, bad: null },
  },
  {
    id: 'aar',
    name: 'Annual Average Return',
    category: 'financial',
    formula: 'AAR = Total Net Return ÷ Years Held',
    unit: 'percent',
    compute: createCompute('aar', 'percent'),
    benchmark: { good: 10.0, warning: 6.0, bad: 6.0 },
  },
  {
    id: 'equity_multiple',
    name: 'Equity Multiple',
    category: 'financial',
    formula: 'Equity Multiple = Total Value Received ÷ Total Cash Deployed',
    unit: 'ratio',
    compute: createCompute('equity_multiple', 'ratio'),
    benchmark: { good: 2.0, warning: 1.5, bad: 1.5 },
  },
  {
    id: 'revenue_growth',
    name: 'Revenue Growth',
    category: 'financial',
    formula: 'Revenue Growth = (Current Month Revenue − Prior Month Revenue) ÷ Prior Month Revenue × 100',
    unit: 'percent',
    compute: createCompute('revenue_growth', 'percent'),
    benchmark: { good: 3.0, warning: 0.0, bad: 0.0 },
  },

  // ── OPERATIONAL EFFICIENCY (7 metrics) ───────────────────────────────────
  {
    id: 'occupancy_rate',
    name: 'Occupancy Rate',
    category: 'operational',
    formula: 'Occupancy Rate = Occupied Units ÷ Total Available Units × 100',
    unit: 'percent',
    compute: createCompute('occupancy_rate', 'percent'),
    benchmark: { good: 92.0, warning: 85.0, bad: 85.0 }, // good >= 92%
  },
  {
    id: 'tenant_turnover',
    name: 'Tenant Turnover Rate',
    category: 'operational',
    formula: 'Tenant Turnover = Tenants Moved Out ÷ Total Units × 100',
    unit: 'percent',
    compute: createCompute('tenant_turnover', 'percent'),
    benchmark: { good: 15.0, warning: 25.0, bad: 25.0 }, // good <= 15% (lower is better)
  },
  {
    id: 'avg_rent_price',
    name: 'Average Rent Price',
    category: 'operational',
    formula: 'Avg Rent Price = Total Rental Income ÷ Number of Rented Units',
    unit: 'currency',
    compute: createCompute('avg_rent_price', 'currency'),
    benchmark: { good: null, warning: null, bad: null },
  },
  {
    id: 'lease_renewal',
    name: 'Lease Renewal Rate',
    category: 'operational',
    formula: 'Lease Renewal = Renewed Leases ÷ Expiring Leases × 100',
    unit: 'percent',
    compute: createCompute('lease_renewal', 'percent'),
    benchmark: { good: 75.0, warning: 60.0, bad: 60.0 }, // good >= 75%
  },
  {
    id: 'maintenance_per_unit',
    name: 'Maintenance per Unit',
    category: 'operational',
    formula: 'Maintenance Cost per Unit = Total Maintenance Spend ÷ Total Units',
    unit: 'currency',
    compute: createCompute('maintenance_per_unit', 'currency'),
    benchmark: { good: 1000, warning: 1800, bad: 1800 }, // good <= $1000/yr (lower is better)
  },
  {
    id: 'days_on_market',
    name: 'Days on Market',
    category: 'operational',
    formula: 'DOM = Total Days from Listing Date to Sale/Lease Contract Date',
    unit: 'days',
    compute: createCompute('days_on_market', 'days'),
    benchmark: { good: 30, warning: 45, bad: 45 }, // good <= 30 days (lower is better)
  },
  {
    id: 'construction_per_sqft',
    name: 'Construction per Sq Ft',
    category: 'operational',
    formula: 'Construction Cost per Sq Ft = Approved Rehab Budget ÷ Square Footage',
    unit: 'currency',
    compute: createCompute('construction_per_sqft', 'currency'),
    benchmark: { good: null, warning: null, bad: null },
  },

  // ── PORTFOLIO MANAGEMENT (5 metrics) ─────────────────────────────────────
  {
    id: 'portfolio_value_growth',
    name: 'Portfolio Value Growth',
    category: 'portfolio',
    formula: 'Portfolio Growth = (Current Portfolio Value − Purchase Price Basis) ÷ Purchase Price Basis × 100',
    unit: 'percent',
    compute: createCompute('portfolio_value_growth', 'percent'),
    benchmark: { good: 5.0, warning: 2.0, bad: 2.0 }, // good >= 5%
  },
  {
    id: 'payback_period',
    name: 'Payback Period',
    category: 'portfolio',
    formula: 'Payback Period = Total Cash Deployed ÷ Annual Net Cash Flow',
    unit: 'days',
    compute: createCompute('payback_period', 'days'),
    benchmark: { good: 1825, warning: 3650, bad: 3650 }, // good <= 5 years (1825 days) (lower is better)
  },
  {
    id: 'yoy_variance',
    name: 'YoY Price Variance',
    category: 'portfolio',
    formula: 'YoY Price Variance = (Current Avg Sold Price − Prior Year Avg Sold Price) ÷ Prior Year Avg Sold Price × 100',
    unit: 'percent',
    compute: createCompute('yoy_variance', 'percent'),
    benchmark: { good: 3.0, warning: 0.0, bad: 0.0 }, // good >= 3%
  },
  {
    id: 'sold_per_inventory',
    name: 'Sold per Inventory',
    category: 'portfolio',
    formula: 'Sold per Inventory = (Homes Sold ÷ Total Inventory) × 100',
    unit: 'percent',
    compute: createCompute('sold_per_inventory', 'percent'),
    benchmark: { good: 20.0, warning: 10.0, bad: 10.0 },
  },
  {
    id: 'demand_growth',
    name: 'Demand Growth',
    category: 'portfolio',
    formula: 'Demand Growth = (Active Listing Showings − Prior Period Showings) ÷ Prior Period Showings × 100',
    unit: 'percent',
    compute: createCompute('demand_growth', 'percent'),
    benchmark: { good: 5.0, warning: 0.0, bad: 0.0 },
  },

  // ── MARKETING (2 metrics) ────────────────────────────────────────────────
  {
    id: 'listing_to_meeting',
    name: 'Listing-to-Meeting Ratio',
    category: 'marketing',
    formula: 'Listing-to-Meeting = (Prospect Meetings ÷ Active Property Listings) × 100',
    unit: 'ratio',
    compute: createCompute('listing_to_meeting', 'ratio'),
    benchmark: { good: null, warning: null, bad: null },
  },
  {
    id: 'avg_commission',
    name: 'Average Commission',
    category: 'marketing',
    formula: 'Avg Commission = Total Commissions Earned ÷ Total Volume Settled',
    unit: 'currency',
    compute: createCompute('avg_commission', 'currency'),
    benchmark: { good: null, warning: null, bad: null },
  },

  // ── COMPLIANCE (2 metrics) ───────────────────────────────────────────────
  {
    id: 'risk_score',
    name: 'Risk Assessment Score',
    category: 'compliance',
    formula: 'Composite Risk Score = (Financial Risk + Market Risk + Operational Risk + Compliance Risk) ÷ 4',
    unit: 'count',
    compute: createCompute('risk_score', 'count'),
    benchmark: { good: 3.0, warning: 5.0, bad: 5.0 }, // good <= 3.0, warning <= 5.0, bad > 5.0 (lower is better)
  },
  {
    id: 'compliance_rate',
    name: 'Compliance Rate',
    category: 'compliance',
    formula: 'Compliance Rate = Compliant Checklist Items ÷ Total Required Items × 100',
    unit: 'percent',
    compute: createCompute('compliance_rate', 'percent'),
    benchmark: { good: 95.0, warning: 85.0, bad: 85.0 }, // good >= 95%, warning 85-95%, bad < 85%
  },
];
