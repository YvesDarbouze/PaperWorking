export type BenchmarkColor = 'good' | 'warning' | 'bad' | 'none';
export type TrendDirection = 'up' | 'down' | 'flat' | null;

export interface MetricBenchmark {
  good: number | null;
  warning: number | null;
  bad: number | null;
}

export interface MetricRegistryEntry {
  id: string;
  name: string;
  category: string;
  formula: string;
  unit: string;
  benchmark: MetricBenchmark;
}

const LOWER_IS_BETTER_METRICS = new Set([
  'grm',
  'ltv',
  'oer',
  'tenant_turnover',
  'days_on_market',
  'maintenance_per_unit',
  'risk_score',
]);

export function getBenchmarkColor(
  entry: MetricRegistryEntry,
  value: number | null,
): BenchmarkColor {
  if (value === null || Number.isNaN(value)) return 'none';
  const { good, warning, bad } = entry.benchmark;
  if (good === null && warning === null && bad === null) return 'none';

  const lowerIsBetter = LOWER_IS_BETTER_METRICS.has(entry.id);

  if (lowerIsBetter) {
    if (good !== null && value <= good) return 'good';
    if (warning !== null && value <= warning) return 'warning';
    return 'bad';
  }

  if (good !== null && value >= good) return 'good';
  if (warning !== null && value >= warning) return 'warning';
  return 'bad';
}

export function computeTrendDirection(
  currentValue: number | null,
  previousValue: number | null,
  epsilon = 0.001,
): TrendDirection {
  if (currentValue === null || previousValue === null) return null;
  if (Number.isNaN(currentValue) || Number.isNaN(previousValue)) return null;

  const diff = currentValue - previousValue;
  if (Math.abs(diff) < epsilon) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

export const METRIC_NULL_REASON_MAP: Record<string, string> = {
  REQUIRES_INCOME_LEDGER: 'rental income records',
  REQUIRES_EXPENSE_LEDGER: 'capital opex/rehab records',
  REQUIRES_TENANT_REGISTRY: 'tenant occupancy details',
  REQUIRES_SALE_RECORD: 'property sale record',
  REQUIRES_LISTING_LOG: 'property showing log',
  REQUIRES_PORTFOLIO_HISTORY: 'historical property valuation',
  REQUIRES_COMPLIANCE_CHECKLIST: 'compliance checklist items',
  MARKET_DATA_DEFERRED: 'market data',
  INCOMPLETE: 'financial parameters',
};

export function mapNullReasonToMissingData(reason: string | null): string | null {
  if (!reason) return null;
  return METRIC_NULL_REASON_MAP[reason] || 'required inputs';
}

export function parseMetricsQuery(query: {
  category?: string | null;
  projectId?: string | null;
  portfolio?: string | null;
  breakdown?: string | null;
}): { ok: true; category: string; projectId: string | null; portfolio: boolean; breakdown: boolean } | { ok: false; error: string; status: number } {
  const category = query.category?.trim() || '';
  if (!category) {
    return { ok: false, error: 'Category is required', status: 400 };
  }

  const projectId = query.projectId?.trim() || null;
  const portfolio = query.portfolio === 'true';
  const breakdown = query.breakdown === 'true';

  if (!projectId && !portfolio) {
    return { ok: false, error: 'Must specify projectId or portfolio=true', status: 400 };
  }

  return { ok: true, category, projectId, portfolio, breakdown };
}

export function buildMetricsCacheKey(
  orgId: string,
  projectId: string | null,
  category: string,
  breakdown: boolean,
): string {
  return `${orgId}_${projectId || 'portfolio'}_${category}_${breakdown}`;
}
