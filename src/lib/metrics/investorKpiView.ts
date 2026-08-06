/**
 * The investor KPI view for /dashboard/insights.
 *
 * Composes `METRICS_REGISTRY` (minus brokerage measures) with
 * `INVESTOR_METRIC_ENTRIES`, then arranges them into the sections the Insights
 * dashboard renders. Pure and React-free so section membership, ordering, and
 * the null contract are all unit-testable.
 */

import { METRICS_REGISTRY, type MetricRegistryEntry } from './metricRegistry';
import { BROKERAGE_METRIC_IDS, INVESTOR_METRIC_ENTRIES } from './investorMetrics';

export type KpiSectionKey = 'core' | 'leverage' | 'operational' | 'growth' | 'additional';

export interface KpiSection {
  key: KpiSectionKey;
  title: string;
  metricIds: string[];
}

/**
 * Section layout. The first four rows are the spec's fixed 4-card rows; the
 * remainder land in "Additional KPIs" so nothing computed is hidden.
 */
export const KPI_SECTIONS: KpiSection[] = [
  {
    key: 'core',
    title: 'Core Metrics',
    metricIds: ['noi', 'irr', 'cap_rate', 'cash_on_cash'],
  },
  {
    key: 'leverage',
    title: 'Leverage & Risk',
    metricIds: ['ltv', 'dscr', 'grm', 'roa'],
  },
  {
    key: 'operational',
    title: 'Operational',
    metricIds: ['oer', 'yield_on_cost', 'cash_flow', 'occupancy_rate'],
  },
  {
    key: 'growth',
    title: 'Growth',
    metricIds: ['aar', 'revenue_growth', 'portfolio_value_growth', 'equity_multiple'],
  },
];

/** Every investor-facing metric: registry minus brokerage, plus extensions. */
export function investorMetrics(): MetricRegistryEntry[] {
  const base = METRICS_REGISTRY.filter((m) => !BROKERAGE_METRIC_IDS.includes(m.id));
  return [...base, ...INVESTOR_METRIC_ENTRIES];
}

/** Lookup by id across the composed set. */
export function findInvestorMetric(id: string): MetricRegistryEntry | undefined {
  return investorMetrics().find((m) => m.id === id);
}

/**
 * Sections resolved to real entries, plus an "Additional KPIs" section holding
 * everything not already placed. Ids in a section that do not resolve are
 * dropped rather than rendered as a broken card.
 */
export function resolvedKpiSections(): Array<{ key: KpiSectionKey; title: string; metrics: MetricRegistryEntry[] }> {
  const all = investorMetrics();
  const byId = new Map(all.map((m) => [m.id, m]));
  const placed = new Set<string>();

  const sections = KPI_SECTIONS.map((s) => {
    const metrics = s.metricIds
      .map((id) => byId.get(id))
      .filter((m): m is MetricRegistryEntry => !!m);
    metrics.forEach((m) => placed.add(m.id));
    return { key: s.key, title: s.title, metrics };
  });

  const rest = all.filter((m) => !placed.has(m.id));
  if (rest.length > 0) {
    sections.push({ key: 'additional', title: 'Additional KPIs', metrics: rest });
  }
  return sections;
}

/** Total investor KPIs on the dashboard. */
export function investorKpiCount(): number {
  return investorMetrics().length;
}

/* ── Display ────────────────────────────────────────────────────────────── */

/** Em dash for missing data — never "0.0", per requirement 5. */
export const EM_DASH = '—';

export function formatMetricValue(
  value: number | null,
  unit: MetricRegistryEntry['unit'],
): string {
  if (value === null || !Number.isFinite(value)) return EM_DASH;

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
    case 'count':
    default:
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'none';

export interface MetricTrend {
  direction: TrendDirection;
  /** Percentage change vs the prior period; null when it cannot be computed. */
  changePct: number | null;
  label: string;
}

/**
 * Compare a value to the prior period.
 *
 * Direction is purely arithmetic — it does NOT encode "good". Metrics where
 * lower is better (LTV, expense ratio, vacancy) still report `up` when the
 * number rises; colouring that as positive would be wrong, so the caller pairs
 * this with `higherIsBetter`.
 */
export function computeTrend(current: number | null, prior: number | null): MetricTrend {
  if (current === null || prior === null || !Number.isFinite(current) || !Number.isFinite(prior)) {
    return { direction: 'none', changePct: null, label: EM_DASH };
  }
  if (prior === 0) {
    return { direction: current === 0 ? 'flat' : 'up', changePct: null, label: EM_DASH };
  }

  const changePct = ((current - prior) / Math.abs(prior)) * 100;
  const direction: TrendDirection =
    Math.abs(changePct) < 0.05 ? 'flat' : changePct > 0 ? 'up' : 'down';

  return {
    direction,
    changePct,
    label: `${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}%`,
  };
}

/* ── Prior-period values from metric snapshots ──────────────────────────── */

/**
 * Registry metric id → the field carrying it on a `PortfolioMetricSnapshot`.
 *
 * The snapshot feed covers a subset of the registry. Metrics absent from this
 * map simply have no prior value, so their arrow renders neutral rather than
 * being compared against something unrelated.
 */
export const SNAPSHOT_FIELD_BY_METRIC_ID: Record<string, string> = {
  noi: 'noi',
  cap_rate: 'capRate',
  cash_on_cash: 'cashOnCashReturn',
  irr: 'irr',
  cash_flow: 'annualCashFlow',
  grm: 'grossRentMultiplier',
  dscr: 'dscr',
  ltv: 'ltv',
  oer: 'oer',
  occupancy_rate: 'occupancyRate',
  vacancy_rate: 'vacancyRate',
  aar: 'appreciation',
  potential_gross_income: 'grossRentalIncome',
  effective_gross_income: 'grossOperatingIncome',
};

/**
 * Minimal shape this module needs from a snapshot.
 *
 * Deliberately NOT an index-signature type: `PortfolioMetricSnapshot` is a
 * closed interface and would not be assignable to one. Fields are read through
 * a cast inside `priorPeriodValues` instead.
 */
export interface MetricSnapshotLike {
  date: Date | string;
}

/**
 * Values from the period immediately BEFORE the latest one, keyed by registry
 * metric id — the baseline every trend arrow compares against.
 *
 * Returns an empty map when fewer than two periods exist: with a single
 * snapshot there is nothing to compare, and inventing a baseline would produce
 * arrows that look measured but are not.
 */
export function priorPeriodValues(
  snapshots: MetricSnapshotLike[] | undefined,
): Record<string, number | null> {
  if (!snapshots || snapshots.length < 2) return {};

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const prior = sorted[sorted.length - 2];

  const bag = prior as unknown as Record<string, unknown>;
  const out: Record<string, number | null> = {};
  for (const [metricId, field] of Object.entries(SNAPSHOT_FIELD_BY_METRIC_ID)) {
    const v = bag[field];
    out[metricId] = typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  return out;
}

/** Period granularity for the trend comparison. */
export type TrendPeriod = 'monthly' | 'quarterly' | 'annual';

export const TREND_PERIOD_LABELS: Record<TrendPeriod, string> = {
  monthly: 'vs last month',
  quarterly: 'vs last quarter',
  annual: 'vs last year',
};

/** Metric ids where a LOWER value is the better outcome. */
export const LOWER_IS_BETTER_IDS: readonly string[] = [
  'ltv', 'grm', 'oer', 'dti', 'break_even_ratio', 'expense_ratio', 'vacancy_rate',
  'management_fee_efficiency', 'collection_loss', 'breakeven_occupancy',
  'tenant_turnover', 'maintenance_per_unit', 'days_on_market', 'risk_score',
  'payback_period',
] as const;

export type TrendTone = 'positive' | 'negative' | 'neutral';

/**
 * Semantic tone for a trend arrow.
 *
 * Green is reserved for genuinely positive movement, red for negative, gray for
 * flat or unknown — requirement 1. A rising LTV is red, not green.
 */
export function trendTone(metricId: string, direction: TrendDirection): TrendTone {
  if (direction === 'none' || direction === 'flat') return 'neutral';
  const lowerIsBetter = LOWER_IS_BETTER_IDS.includes(metricId);
  const improving = lowerIsBetter ? direction === 'down' : direction === 'up';
  return improving ? 'positive' : 'negative';
}
