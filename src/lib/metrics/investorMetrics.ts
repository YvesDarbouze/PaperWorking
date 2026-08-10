/**
 * Investor-facing KPI extensions for the Insights dashboard.
 *
 * `METRICS_REGISTRY` (and the `KPI33Block` behind it) is a deliberately
 * numbered 33-metric system that includes brokerage measures — listing-to-
 * meeting, average commission, sold-per-inventory, demand growth, compliance
 * rate. Those are not investor KPIs and are hidden from the Insights view.
 *
 * Rather than extend `KPI33Block` — which lives deep inside `reiMetrics.ts`,
 * is consumed across the app, and would need surgery on the derivation chain —
 * these metrics compute at the REGISTRY layer from project financials. The
 * `MetricRegistryEntry.compute` contract already permits any function;
 * `createCompute` is merely one helper.
 *
 * ── The null contract ────────────────────────────────────────────────────
 * Every compute returns `null` when an input is missing, never 0. The Insights
 * cards render `null` as an em dash so a missing figure can never be mistaken
 * for a real zero (requirement 5).
 */

import type { MetricRegistryEntry } from './metricRegistry';

/** Marks which audience a metric belongs to. */
export type MetricAudience = 'investor' | 'brokerage';

/**
 * Registry ids that are brokerage measures, not investor KPIs. Hidden from
 * the Insights dashboard; still computed and available elsewhere.
 */
export const BROKERAGE_METRIC_IDS: readonly string[] = [
  'sold_per_inventory',
  'demand_growth',
  'listing_to_meeting',
  'avg_commission',
  'compliance_rate',
] as const;

/* ── Safe numeric access ─────────────────────────────────────────────────── */

/** Reads a finite number from an object, else null. Zero is a valid value. */
function num(source: Record<string, unknown> | undefined, ...keys: string[]): number | null {
  if (!source) return null;
  for (const k of keys) {
    const v = source[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

/** Division that yields null on a missing or zero denominator. */
function ratio(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null) return null;
  if (denominator === 0) return null;
  const out = numerator / denominator;
  return Number.isFinite(out) ? out : null;
}

const pct = (n: number | null): number | null => (n === null ? null : n * 100);

/** Project financials, whatever shape the store hands us. */
function fin(project: unknown): Record<string, unknown> | undefined {
  if (!project || typeof project !== 'object') return undefined;
  const f = (project as { financials?: unknown }).financials;
  return f && typeof f === 'object' ? (f as Record<string, unknown>) : undefined;
}

/* ── Shared intermediates ────────────────────────────────────────────────── */

function purchasePrice(p: unknown): number | null {
  return num(fin(p), 'purchasePrice', 'listedPrice');
}

function propertyValue(p: unknown): number | null {
  return num(fin(p), 'estimatedARV', 'currentValue') ?? purchasePrice(p);
}

function monthlyRent(p: unknown): number | null {
  return num(fin(p), 'monthlyGrossRent', 'projectedMonthlyRent', 'gross_rent_per_unit');
}

function annualRent(p: unknown): number | null {
  const m = monthlyRent(p);
  return m === null ? null : m * 12;
}

function loanAmount(p: unknown): number | null {
  return num(fin(p), 'loanAmount');
}

function annualDebtService(p: unknown): number | null {
  const monthly = num(fin(p), 'monthlyDebtService', 'monthlyPI');
  if (monthly !== null) return monthly * 12;
  return num(fin(p), 'annualDebtService');
}

function annualOpEx(p: unknown): number | null {
  const f = fin(p);
  const explicit = num(f, 'annualOperatingExpenses');
  if (explicit !== null) return explicit;

  const monthlyParts = [
    num(f, 'tax', 'propertyTaxMonthly'),
    num(f, 'insurance', 'insuranceMonthly'),
    num(f, 'maintenance', 'monthlyMaintenanceReserve'),
    num(f, 'management', 'propertyManagementFee'),
    num(f, 'monthlyHOA'),
  ].filter((v): v is number => v !== null);

  if (monthlyParts.length === 0) return null;
  return monthlyParts.reduce((a, b) => a + b, 0) * 12;
}

function unitCount(p: unknown): number | null {
  if (!p || typeof p !== 'object') return null;
  const direct = num(p as Record<string, unknown>, 'units', 'unitCount');
  return direct !== null && direct > 0 ? direct : num(fin(p), 'units');
}

function squareFeet(p: unknown): number | null {
  if (!p || typeof p !== 'object') return null;
  return num(p as Record<string, unknown>, 'squareFootage', 'sqft')
      ?? num(fin(p), 'squareFootage', 'sqft');
}

function totalCashInvested(p: unknown): number | null {
  const explicit = num(fin(p), 'totalCashInvested', 'downPayment');
  if (explicit !== null) return explicit;
  const price = purchasePrice(p);
  const loan = loanAmount(p);
  if (price === null || loan === null) return null;
  const equity = price - loan;
  return equity > 0 ? equity : null;
}

/* ── The investor KPI extensions ─────────────────────────────────────────── */

interface InvestorMetricDef {
  id: string;
  name: string;
  category: MetricRegistryEntry['category'];
  formula: string;
  unit: MetricRegistryEntry['unit'];
  compute: (project: unknown) => number | null;
  benchmark: MetricRegistryEntry['benchmark'];
}

export const INVESTOR_METRIC_EXTENSIONS: InvestorMetricDef[] = [
  {
    id: 'roa',
    name: 'Return on Assets',
    category: 'financial',
    formula: 'ROA = NOI ÷ Total Property Value × 100',
    unit: 'percent',
    benchmark: { good: 6, warning: 3, bad: 3 },
    compute: (p) => {
      const rent = annualRent(p);
      const opex = annualOpEx(p);
      if (rent === null || opex === null) return null;
      return pct(ratio(rent - opex, propertyValue(p)));
    },
  },
  {
    id: 'yield_on_cost',
    name: 'Yield on Cost',
    category: 'financial',
    formula: 'Yield on Cost = Stabilised NOI ÷ (Purchase Price + Rehab Budget) × 100',
    unit: 'percent',
    benchmark: { good: 7, warning: 5, bad: 5 },
    compute: (p) => {
      const rent = annualRent(p);
      const opex = annualOpEx(p);
      const price = purchasePrice(p);
      if (rent === null || opex === null || price === null) return null;
      const rehab = num(fin(p), 'rehabBudget', 'renovationBudget') ?? 0;
      return pct(ratio(rent - opex, price + rehab));
    },
  },
  {
    id: 'dti',
    name: 'Debt-to-Income Ratio',
    category: 'financial',
    formula: 'DTI = Annual Debt Service ÷ Effective Gross Income × 100',
    unit: 'percent',
    benchmark: { good: 36, warning: 43, bad: 43 }, // lower is better
    compute: (p) => pct(ratio(annualDebtService(p), effectiveGrossIncome(p))),
  },
  {
    id: 'break_even_ratio',
    name: 'Break-Even Ratio',
    category: 'financial',
    formula: 'BER = (Operating Expenses + Debt Service) ÷ Gross Operating Income × 100',
    unit: 'percent',
    benchmark: { good: 85, warning: 95, bad: 95 }, // lower is better
    compute: (p) => {
      const opex = annualOpEx(p);
      const ads = annualDebtService(p);
      if (opex === null || ads === null) return null;
      return pct(ratio(opex + ads, effectiveGrossIncome(p)));
    },
  },
  {
    id: 'rent_to_value',
    name: 'Rent-to-Value Ratio',
    category: 'financial',
    formula: 'RTV = Monthly Rent ÷ Property Value × 100',
    unit: 'percent',
    benchmark: { good: 1.0, warning: 0.7, bad: 0.7 },
    compute: (p) => pct(ratio(monthlyRent(p), propertyValue(p))),
  },
  {
    id: 'expense_ratio',
    name: 'Expense Ratio',
    category: 'operational',
    formula: 'Expense Ratio = Operating Expenses ÷ Effective Gross Income × 100',
    unit: 'percent',
    benchmark: { good: 40, warning: 55, bad: 55 }, // lower is better
    compute: (p) => pct(ratio(annualOpEx(p), effectiveGrossIncome(p))),
  },
  {
    id: 'vacancy_rate',
    name: 'Vacancy Rate',
    category: 'operational',
    formula: 'Vacancy Rate = Vacant Units ÷ Total Units × 100',
    unit: 'percent',
    benchmark: { good: 5, warning: 10, bad: 10 }, // lower is better
    compute: (p) => {
      const explicit = num(fin(p), 'vacancy_pct', 'vacancyPct');
      if (explicit !== null) return explicit;
      const total = unitCount(p);
      const occupied = p && typeof p === 'object'
        ? num(p as Record<string, unknown>, 'occupiedUnits')
        : null;
      if (total === null || occupied === null) return null;
      return pct(ratio(total - occupied, total));
    },
  },
  {
    id: 'price_per_door',
    name: 'Price per Door',
    category: 'portfolio',
    formula: 'Price per Door = Purchase Price ÷ Number of Units',
    unit: 'currency',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => ratio(purchasePrice(p), unitCount(p)),
  },
  {
    id: 'cost_per_sqft',
    name: 'Cost per Square Foot',
    category: 'portfolio',
    formula: 'Cost per Sq Ft = Purchase Price ÷ Building Square Footage',
    unit: 'currency',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => ratio(purchasePrice(p), squareFeet(p)),
  },
  {
    id: 'replacement_reserve',
    name: 'Replacement Reserve',
    category: 'operational',
    formula: 'Replacement Reserve = Annual Reserve Contribution ÷ Number of Units',
    unit: 'currency',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => {
      const monthly = num(fin(p), 'monthlyMaintenanceReserve', 'maintenanceReserves');
      if (monthly === null) return null;
      const units = unitCount(p) ?? 1;
      return ratio(monthly * 12, units);
    },
  },
  {
    id: 'management_fee_efficiency',
    name: 'Management Fee Efficiency',
    category: 'operational',
    formula: 'Mgmt Fee Efficiency = Management Fees ÷ Effective Gross Income × 100',
    unit: 'percent',
    benchmark: { good: 8, warning: 12, bad: 12 }, // lower is better
    compute: (p) => {
      const monthly = num(fin(p), 'management', 'propertyManagementFee');
      if (monthly === null) return null;
      return pct(ratio(monthly * 12, effectiveGrossIncome(p)));
    },
  },
  {
    id: 'collection_loss',
    name: 'Collection Loss',
    category: 'operational',
    formula: 'Collection Loss = Uncollected Rent ÷ Potential Gross Income × 100',
    unit: 'percent',
    benchmark: { good: 1, warning: 3, bad: 3 }, // lower is better
    compute: (p) => {
      const loss = num(fin(p), 'collectionLoss', 'badDebt');
      if (loss === null) return null;
      return pct(ratio(loss, annualRent(p)));
    },
  },
  {
    id: 'effective_gross_income',
    name: 'Effective Gross Income',
    category: 'financial',
    formula: 'EGI = Potential Gross Income − Vacancy & Collection Loss',
    unit: 'currency',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => effectiveGrossIncome(p),
  },
  {
    id: 'potential_gross_income',
    name: 'Potential Gross Income',
    category: 'financial',
    formula: 'PGI = Monthly Rent × 12, at 100% occupancy',
    unit: 'currency',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => annualRent(p),
  },
  {
    id: 'opex_per_unit',
    name: 'Operating Expense per Unit',
    category: 'operational',
    formula: 'OpEx per Unit = Annual Operating Expenses ÷ Number of Units',
    unit: 'currency',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => ratio(annualOpEx(p), unitCount(p)),
  },
  {
    id: 'debt_service_per_unit',
    name: 'Debt Service per Unit',
    category: 'financial',
    formula: 'Debt Service per Unit = Annual Debt Service ÷ Number of Units',
    unit: 'currency',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => ratio(annualDebtService(p), unitCount(p)),
  },
  {
    id: 'profit_margin',
    name: 'Profit Margin',
    category: 'financial',
    formula: 'Profit Margin = Net Cash Flow ÷ Effective Gross Income × 100',
    unit: 'percent',
    benchmark: { good: 20, warning: 10, bad: 10 },
    compute: (p) => {
      const opex = annualOpEx(p);
      const ads = annualDebtService(p);
      if (opex === null || ads === null) return null;
      const egi = effectiveGrossIncome(p);
      if (egi === null) return null;
      return pct(ratio(egi - opex - ads, egi));
    },
  },
  {
    id: 'return_on_equity',
    name: 'Return on Equity',
    category: 'financial',
    formula: 'ROE = Annual Cash Flow ÷ Equity Invested × 100',
    unit: 'percent',
    benchmark: { good: 12, warning: 8, bad: 8 },
    compute: (p) => {
      const opex = annualOpEx(p);
      const ads = annualDebtService(p);
      const egi = effectiveGrossIncome(p);
      if (opex === null || ads === null || egi === null) return null;
      return pct(ratio(egi - opex - ads, totalCashInvested(p)));
    },
  },
  {
    id: 'net_income_multiplier',
    name: 'Net Income Multiplier',
    category: 'financial',
    formula: 'NIM = Property Value ÷ Net Operating Income',
    unit: 'ratio',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => {
      const opex = annualOpEx(p);
      const egi = effectiveGrossIncome(p);
      if (opex === null || egi === null) return null;
      return ratio(propertyValue(p), egi - opex);
    },
  },
  {
    id: 'breakeven_occupancy',
    name: 'Break-Even Occupancy',
    category: 'operational',
    formula: 'Break-Even Occupancy = (Operating Expenses + Debt Service) ÷ Potential Gross Income × 100',
    unit: 'percent',
    benchmark: { good: 80, warning: 90, bad: 90 }, // lower is better
    compute: (p) => {
      const opex = annualOpEx(p);
      const ads = annualDebtService(p);
      if (opex === null || ads === null) return null;
      return pct(ratio(opex + ads, annualRent(p)));
    },
  },
  {
    id: 'loan_constant',
    name: 'Loan Constant',
    category: 'financial',
    formula: 'Loan Constant = Annual Debt Service ÷ Loan Amount × 100',
    unit: 'percent',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => pct(ratio(annualDebtService(p), loanAmount(p))),
  },
  {
    id: 'holding_period',
    name: 'Holding Period',
    category: 'portfolio',
    formula: 'Holding Period = Planned or elapsed ownership duration, in years',
    unit: 'count',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => num(fin(p), 'holdYears', 'holdingPeriodYears'),
  },
  {
    id: 'exit_cap_rate',
    name: 'Exit Cap Rate',
    category: 'portfolio',
    formula: 'Exit Cap Rate = Stabilised NOI ÷ Projected Sale Price × 100',
    unit: 'percent',
    benchmark: { good: null, warning: null, bad: null },
    compute: (p) => num(fin(p), 'exitCapRate'),
  },
];

/**
 * EGI, shared by several metrics above.
 *
 * Declared as a function so the metric definitions can reference it before it
 * appears in source order.
 */
function effectiveGrossIncome(p: unknown): number | null {
  const pgi = annualRent(p);
  if (pgi === null) return null;
  const vacancyPct = num(fin(p), 'vacancy_pct', 'vacancyPct');
  // No vacancy assumption recorded → report PGI unadjusted rather than
  // inventing a market default.
  if (vacancyPct === null) return pgi;
  return pgi * (1 - vacancyPct / 100);
}

/** Registry-shaped entries, ready to concatenate onto METRICS_REGISTRY. */
export const INVESTOR_METRIC_ENTRIES: MetricRegistryEntry[] =
  INVESTOR_METRIC_EXTENSIONS.map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    formula: m.formula,
    unit: m.unit,
    benchmark: m.benchmark,
    // Portfolio aggregation is a mean of the per-project values that resolve.
    compute: (project: unknown, portfolio?: unknown[]) => {
      if (portfolio && portfolio.length > 0) {
        const vals = portfolio
          .map((proj) => m.compute(proj))
          .filter((v): v is number => v !== null);
        if (vals.length === 0) return null;
        return vals.reduce((a, b) => a + b, 0) / vals.length;
      }
      return m.compute(project);
    },
  }));
