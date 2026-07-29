import { getKPI33, CATEGORY_ORDER, type MetricCategory } from '@/lib/metrics/metricTaxonomy';
import { KPI_LINEAGE_MAP } from '@/lib/kpi/lineage';
import { calculatePeriodOverPeriod, generateSeriesData } from '@/components/insights/KPIDatapointExplorer';

describe('IN-1 Insights Redesign Unit Tests', () => {
  const MANDATED_HEADINGS: MetricCategory[] = [
    'Financial Performance',
    'Operational Efficiency',
    'Asset & Portfolio Management',
    'Marketing & Sales',
    'Risk Management & Compliance',
  ];

  it('verifies all 33 KPI IDs have category ∈ 5 mandated headings, exactly 33, no orphans or duplicates', () => {
    const kpi33 = getKPI33();
    expect(kpi33.length).toBe(33);

    const kpiNumbers = new Set<number>();
    const kpiIds = new Set<string>();

    for (const kpi of kpi33) {
      // Check KPI number uniqueness
      expect(kpi.kpiNumber).toBeGreaterThanOrEqual(1);
      expect(kpi.kpiNumber).toBeLessThanOrEqual(33);
      expect(kpiNumbers.has(kpi.kpiNumber!)).toBe(false);
      kpiNumbers.add(kpi.kpiNumber!);

      // Check ID uniqueness
      expect(kpiIds.has(kpi.id)).toBe(false);
      kpiIds.add(kpi.id);

      // Check heading assignment is one of the 5 mandated
      expect(MANDATED_HEADINGS).toContain(kpi.category);

      // Check lineage map alignment
      const lineage = KPI_LINEAGE_MAP[kpi.id];
      expect(lineage).toBeDefined();
      expect(MANDATED_HEADINGS).toContain(lineage.category);
    }

    expect(kpiNumbers.size).toBe(33);
    expect(kpiIds.size).toBe(33);
  });

  it('verifies CATEGORY_ORDER contains exactly the 5 mandated headings in exact order', () => {
    expect(CATEGORY_ORDER).toEqual(MANDATED_HEADINGS);
  });

  it('unit-tests period-over-period delta and percentage calculations', () => {
    // Current = 120, Prior = 100 -> delta = +20, % = +20%
    const res1 = calculatePeriodOverPeriod(120, 100);
    expect(res1.delta).toBe(20);
    expect(res1.percent).toBeCloseTo(20, 2);

    // Current = 80, Prior = 100 -> delta = -20, % = -20%
    const res2 = calculatePeriodOverPeriod(80, 100);
    expect(res2.delta).toBe(-20);
    expect(res2.percent).toBeCloseTo(-20, 2);

    // Null inputs
    const resNull = calculatePeriodOverPeriod(null, 100);
    expect(resNull.delta).toBeNull();
    expect(resNull.percent).toBeNull();
  });

  it('verifies date-range recomputation generates correct series points per preset', () => {
    const value = 150000;

    const series3M = generateSeriesData(value, '3M');
    expect(series3M.length).toBe(3);

    const series6M = generateSeriesData(value, '6M');
    expect(series6M.length).toBe(6);

    const series1Y = generateSeriesData(value, '1Y');
    expect(series1Y.length).toBe(12);

    // Empty value returns empty series (no fabricated zero)
    const seriesNull = generateSeriesData(null, '6M');
    expect(seriesNull).toEqual([]);
  });
});
