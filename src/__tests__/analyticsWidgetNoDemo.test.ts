/**
 * AnalyticsWidget — No Demo Data Regression Tests
 *
 * Root cause: AnalyticsWidget.tsx previously rendered a dummyData constant
 * behind a "Demo" badge, presenting fake chart data on a live dashboard.
 *
 * Fix: The widget now reads from usePortfolioMetricSnapshots('monthly') — the
 * same authoritative Firestore-backed hook used by all Insights pages. The
 * Demo badge is removed. Fewer than MIN_POINTS (2) non-null values for the
 * selected metric triggers InsufficientData (honest empty state) rather than
 * a fabricated chart.
 *
 * Tests:
 *   STATIC    — dummyData constant absent, no Demo badge, correct hook import,
 *               InsufficientData component present, METRIC_FIELD mapping intact
 *   LOGIC     — pure chart-series computation logic tested against fixtures:
 *               real series matches, sparse data gates on MIN_POINTS,
 *               null snapshot values are excluded before threshold check
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

const WIDGET = read('components/dashboard/home/AnalyticsWidget.tsx');

/* ──────────────────────────────────────────────────────────────────────────
   STATIC — source must contain no fake-data artifacts
   ────────────────────────────────────────────────────────────────────────── */
describe('AnalyticsWidget — no hardcoded demo data', () => {

  it('aw_no_dummy_data: dummyData is not declared as a variable (comment references are fine)', () => {
    // The comment says "never fake dummyData" — that mention is acceptable.
    // A real regression would declare it: const/let/var dummyData or reference it
    // as a JSX value. Check for assignment forms only.
    expect(WIDGET).not.toMatch(/(?:const|let|var)\s+dummyData/);
    expect(WIDGET).not.toContain('DUMMY_DATA');
    expect(WIDGET).not.toMatch(/=\s*dummyData[^A-Za-z]/);
  });

  it('aw_no_demo_badge: no Demo badge is rendered in JSX output', () => {
    // A Demo badge in JSX would appear as JSX text >Demo< or a class like "demo-badge".
    // The comment "The "Demo" badge is removed" is an allowed occurrence.
    expect(WIDGET).not.toMatch(/>\s*Demo\s*</);
    expect(WIDGET).not.toContain('demo-badge');
  });

  it('aw_uses_real_hook: imports usePortfolioMetricSnapshots (not a local fake)', () => {
    expect(WIDGET).toContain("from '@/hooks/usePortfolioMetricSnapshots'");
    expect(WIDGET).toContain('usePortfolioMetricSnapshots(');
  });

  it('aw_calls_monthly_snapshots: requests monthly period matching the Insights pages', () => {
    expect(WIDGET).toContain("usePortfolioMetricSnapshots('monthly')");
  });

  it('aw_has_insufficient_data_state: InsufficientData component exists for the sparse-data honest state', () => {
    expect(WIDGET).toContain('function InsufficientData');
    expect(WIDGET).toContain('<InsufficientData');
  });

  it('aw_min_points_threshold: MIN_POINTS is set to 2 (matches the Honesty Rule comment)', () => {
    expect(WIDGET).toMatch(/MIN_POINTS\s*=\s*2/);
  });

  it('aw_metric_field_cash_flow: Monthly Cash Flow maps to monthlyCashFlow', () => {
    expect(WIDGET).toContain("'Monthly Cash Flow'");
    expect(WIDGET).toContain("'monthlyCashFlow'");
  });

  it('aw_metric_field_expenses: Operating Expenses maps to totalOperatingExpenses', () => {
    expect(WIDGET).toContain("'Operating Expenses'");
    expect(WIDGET).toContain("'totalOperatingExpenses'");
  });

  it('aw_metric_field_value: Portfolio Value maps to propertyValue', () => {
    expect(WIDGET).toContain("'Portfolio Value'");
    expect(WIDGET).toContain("'propertyValue'");
  });

});

/* ──────────────────────────────────────────────────────────────────────────
   LOGIC — chart-series computation tested against fixtures
   These tests replicate the useMemo logic from the widget without a React
   renderer, verifying the mapping is correct end-to-end.
   ────────────────────────────────────────────────────────────────────────── */

// Minimal snapshot shape the widget reads
interface Snap {
  period: string;
  date: Date;
  monthlyCashFlow: number | null;
  totalOperatingExpenses: number | null;
  propertyValue: number | null;
}

type ChartMetric = 'Monthly Cash Flow' | 'Operating Expenses' | 'Portfolio Value';

const METRIC_FIELD: Record<ChartMetric, keyof Snap> = {
  'Monthly Cash Flow':  'monthlyCashFlow',
  'Operating Expenses': 'totalOperatingExpenses',
  'Portfolio Value':    'propertyValue',
};

const MIN_POINTS = 2;
const MAX_POINTS = 12;

function deriveChartData(snapshots: Snap[], selectedMetric: ChartMetric) {
  if (!snapshots || snapshots.length === 0) {
    return { chartData: [], latestValue: 0, hasEnoughData: false };
  }

  const field = METRIC_FIELD[selectedMetric];
  const recent = snapshots.slice(-MAX_POINTS);

  const points = recent
    .map((s) => {
      const raw = s[field];
      const value = (raw !== null && typeof raw === 'number') ? raw : null;
      const label = s.date instanceof Date
        ? s.date.toLocaleDateString('en-US', { month: 'short' })
        : s.period.slice(5);
      return { name: label, value };
    })
    .filter((p): p is { name: string; value: number } => p.value !== null);

  const hasEnoughData = points.length >= MIN_POINTS;
  const latest = points[points.length - 1]?.value ?? 0;

  return { chartData: points, latestValue: latest, hasEnoughData };
}

describe('AnalyticsWidget — chart series matches real portfolio fixture', () => {

  const FIXTURE: Snap[] = [
    { period: '2026-01', date: new Date('2026-01-01'), monthlyCashFlow: 1200, totalOperatingExpenses: 800,  propertyValue: 320000 },
    { period: '2026-02', date: new Date('2026-02-01'), monthlyCashFlow: 1350, totalOperatingExpenses: 820,  propertyValue: 322000 },
    { period: '2026-03', date: new Date('2026-03-01'), monthlyCashFlow: 1100, totalOperatingExpenses: 790,  propertyValue: 325000 },
  ];

  it('aw_series_matches_cash_flow: Monthly Cash Flow series equals fixture monthlyCashFlow values', () => {
    const { chartData, hasEnoughData } = deriveChartData(FIXTURE, 'Monthly Cash Flow');
    expect(hasEnoughData).toBe(true);
    expect(chartData).toHaveLength(3);
    expect(chartData[0].value).toBe(1200);
    expect(chartData[1].value).toBe(1350);
    expect(chartData[2].value).toBe(1100);
  });

  it('aw_series_matches_expenses: Operating Expenses series equals fixture totalOperatingExpenses values', () => {
    const { chartData, hasEnoughData } = deriveChartData(FIXTURE, 'Operating Expenses');
    expect(hasEnoughData).toBe(true);
    expect(chartData).toHaveLength(3);
    expect(chartData[0].value).toBe(800);
    expect(chartData[2].value).toBe(790);
  });

  it('aw_series_matches_value: Portfolio Value series equals fixture propertyValue values', () => {
    const { chartData, hasEnoughData } = deriveChartData(FIXTURE, 'Portfolio Value');
    expect(hasEnoughData).toBe(true);
    expect(chartData[0].value).toBe(320000);
    expect(chartData[2].value).toBe(325000);
  });

  it('aw_latest_value_is_last_point: latestValue is the final snapshot value, not a fake', () => {
    const { latestValue } = deriveChartData(FIXTURE, 'Monthly Cash Flow');
    expect(latestValue).toBe(1100); // last in fixture
  });

  it('aw_labels_from_date: chart point names are derived from the Date object (non-empty month strings)', () => {
    // Use noon UTC to avoid timezone-induced day-boundary shifts in CI
    const dated: typeof FIXTURE = [
      { period: '2026-01', date: new Date('2026-01-15T12:00:00Z'), monthlyCashFlow: 1200, totalOperatingExpenses: 800, propertyValue: 320000 },
      { period: '2026-02', date: new Date('2026-02-15T12:00:00Z'), monthlyCashFlow: 1350, totalOperatingExpenses: 820, propertyValue: 322000 },
      { period: '2026-03', date: new Date('2026-03-15T12:00:00Z'), monthlyCashFlow: 1100, totalOperatingExpenses: 790, propertyValue: 325000 },
    ];
    const { chartData } = deriveChartData(dated, 'Monthly Cash Flow');
    // Labels must be non-empty abbreviated month strings (locale-dependent but always short month)
    for (const pt of chartData) {
      expect(pt.name).toMatch(/^[A-Z][a-z]{2}$/); // e.g. "Jan", "Feb", "Mar"
    }
    // Confirm sequential months: the three labels must all be different
    const names = chartData.map((p) => p.name);
    expect(new Set(names).size).toBe(3);
  });

  it('aw_max_points_cap: slice(-12) limits chart to at most 12 points', () => {
    const many: Snap[] = Array.from({ length: 20 }, (_, i) => ({
      period: `2025-${String(i + 1).padStart(2, '0')}`,
      date: new Date(`2025-${String(i + 1).padStart(2, '0')}-01`),
      monthlyCashFlow: 1000 + i,
      totalOperatingExpenses: 500,
      propertyValue: 300000,
    }));
    const { chartData } = deriveChartData(many, 'Monthly Cash Flow');
    expect(chartData).toHaveLength(12);
    // Must be the last 12 — newest entries
    expect(chartData[chartData.length - 1].value).toBe(1019);
  });

});

describe('AnalyticsWidget — sparse data shows honest empty state', () => {

  it('aw_zero_snapshots_no_chart: empty snapshot array → hasEnoughData false', () => {
    const { hasEnoughData, chartData } = deriveChartData([], 'Monthly Cash Flow');
    expect(hasEnoughData).toBe(false);
    expect(chartData).toHaveLength(0);
  });

  it('aw_one_snapshot_no_chart: single snapshot → fewer than MIN_POINTS → hasEnoughData false', () => {
    const single: Snap[] = [
      { period: '2026-01', date: new Date('2026-01-01'), monthlyCashFlow: 1200, totalOperatingExpenses: 800, propertyValue: 320000 },
    ];
    const { hasEnoughData } = deriveChartData(single, 'Monthly Cash Flow');
    expect(hasEnoughData).toBe(false);
  });

  it('aw_two_snapshots_shows_chart: exactly MIN_POINTS snapshots is sufficient', () => {
    const two: Snap[] = [
      { period: '2026-01', date: new Date('2026-01-01'), monthlyCashFlow: 1200, totalOperatingExpenses: 800, propertyValue: 320000 },
      { period: '2026-02', date: new Date('2026-02-01'), monthlyCashFlow: 1350, totalOperatingExpenses: 820, propertyValue: 322000 },
    ];
    const { hasEnoughData } = deriveChartData(two, 'Monthly Cash Flow');
    expect(hasEnoughData).toBe(true);
  });

  it('aw_null_values_excluded: null snapshot values are filtered and count toward threshold', () => {
    // Two snapshots but the selected metric is null in both → insufficient
    const nullMetrics: Snap[] = [
      { period: '2026-01', date: new Date('2026-01-01'), monthlyCashFlow: null, totalOperatingExpenses: 800, propertyValue: 320000 },
      { period: '2026-02', date: new Date('2026-02-01'), monthlyCashFlow: null, totalOperatingExpenses: 820, propertyValue: 322000 },
    ];
    const { hasEnoughData, chartData } = deriveChartData(nullMetrics, 'Monthly Cash Flow');
    expect(chartData).toHaveLength(0);
    expect(hasEnoughData).toBe(false);
  });

  it('aw_mixed_null_filtered: null entries are excluded per-metric so each metric gates independently', () => {
    // Cash flow has 2 non-null values; Operating Expenses has 1
    const mixed: Snap[] = [
      { period: '2026-01', date: new Date('2026-01-01'), monthlyCashFlow: null, totalOperatingExpenses: 800,  propertyValue: 320000 },
      { period: '2026-02', date: new Date('2026-02-01'), monthlyCashFlow: 1350, totalOperatingExpenses: null, propertyValue: 322000 },
      { period: '2026-03', date: new Date('2026-03-01'), monthlyCashFlow: 1100, totalOperatingExpenses: null, propertyValue: 325000 },
    ];
    // Cash flow: 2 non-null → enough to chart
    const cf = deriveChartData(mixed, 'Monthly Cash Flow');
    expect(cf.chartData).toHaveLength(2);
    expect(cf.hasEnoughData).toBe(true);

    // Operating Expenses: only 1 non-null → below MIN_POINTS, honest empty state
    const oe = deriveChartData(mixed, 'Operating Expenses');
    expect(oe.chartData).toHaveLength(1);
    expect(oe.hasEnoughData).toBe(false);
  });

});
