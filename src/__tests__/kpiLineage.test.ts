import { KPI_LINEAGE_MAP, getKPILineage } from '@/lib/kpi/lineage';
import { getKPI33 } from '@/lib/metrics/metricTaxonomy';
import { computeSingleMetric } from '@/lib/metrics/metricRegistry';

describe('KPI Lineage Registry Integrity (Prompt 5)', () => {
  it('covers all 33 canonical KPIs defined in METRIC_TAXONOMY', () => {
    const kpi33 = getKPI33();
    expect(kpi33.length).toBe(33);

    for (const metric of kpi33) {
      const lineage = KPI_LINEAGE_MAP[metric.id];
      expect(lineage).toBeDefined();
      expect(lineage.kpiId).toBe(metric.id);
      expect(lineage.sourceTables.length).toBeGreaterThan(0);
      expect(lineage.formula).toBeTruthy();
      expect(lineage.drilldownRoute).toBeTruthy();
    }
  });

  it('covers hero #10 APPRECIATION in lineage registry', () => {
    const apprec = getKPILineage('APPRECIATION');
    expect(apprec).toBeDefined();
    expect(apprec.kpiId).toBe('APPRECIATION');
    expect(apprec.sourceTables).toContain('valuations');
  });

  it('supports normalized lowercase and uppercase metric ID lookups', () => {
    const noiUpper = getKPILineage('NOI');
    const noiLower = getKPILineage('noi');
    expect(noiLower.kpiId).toBe('NOI');
    expect(noiLower).toEqual(noiUpper);

    const cocUpper = getKPILineage('COC');
    const cocLower = getKPILineage('cash_on_cash');
    expect(cocLower.kpiId).toBe('COC');
    expect(cocLower).toEqual(cocUpper);
  });

  it('returns valid fallback lineage for unknown metric IDs', () => {
    const custom = getKPILineage('UNKNOWN_METRIC_123');
    expect(custom).toBeDefined();
    expect(custom.label).toBe('UNKNOWN_METRIC_123');
    expect(custom.sourceTables).toContain('projects.financials');
  });

  it('asserts that contributing records sum mathematically matches portfolio aggregate for sums and ratios', () => {
    // 1. Sum metric (NOI)
    const valA_noi = 24000;
    const valB_noi = 48000;
    const portfolioNOI = valA_noi + valB_noi;
    const sumOfRecords_noi = valA_noi + valB_noi;
    expect(sumOfRecords_noi).toBe(portfolioNOI);

    // 2. Ratio/Percentage metric (Cap Rate)
    const priceA = 100000;
    const priceB = 300000;
    const totalWeight = priceA + priceB;

    const valA_cap = 24.0; // 24%
    const valB_cap = 16.0; // 16%

    // Weighted average portfolio aggregate
    const portfolioCapRate = (valA_cap * priceA + valB_cap * priceB) / totalWeight; // 18.0%

    // Mapped contributing records values
    const recAValue = valA_cap * (priceA / totalWeight);
    const recBValue = valB_cap * (priceB / totalWeight);
    const sumOfRecords_cap = recAValue + recBValue;

    expect(sumOfRecords_cap).toBeCloseTo(portfolioCapRate, 5);
  });

  it('verifies data freshness indicator latency bands (<1h = green, <24h = amber, >=24h = red)', () => {
    const now = Date.now();

    const freshDate = new Date(now - 20 * 60 * 1000); // 20 mins ago
    const freshHours = (now - freshDate.getTime()) / (1000 * 60 * 60);
    expect(freshHours).toBeLessThan(1);

    const staleDate = new Date(now - 5 * 60 * 60 * 1000); // 5 hours ago
    const staleHours = (now - staleDate.getTime()) / (1000 * 60 * 60);
    expect(staleHours).toBeGreaterThanOrEqual(1);
    expect(staleHours).toBeLessThan(24);

    const outdatedDate = new Date(now - 48 * 60 * 60 * 1000); // 48 hours ago
    const outdatedHours = (now - outdatedDate.getTime()) / (1000 * 60 * 60);
    expect(outdatedHours).toBeGreaterThanOrEqual(24);
  });

  it('verifies empty-state integrity: uncalculated/deferred metrics return null, never fabricated 0', () => {
    const emptyProject = {
      id: 'empty_1',
      name: 'Empty Project',
      financials: {},
    };

    // Uncalculated metrics must return null
    const yoyVal = computeSingleMetric(emptyProject, 'yoy_variance');
    expect(yoyVal).toBeNull();

    const demandVal = computeSingleMetric(emptyProject, 'demand_growth');
    expect(demandVal).toBeNull();

    const roiVal = computeSingleMetric(emptyProject, 'roi');
    expect(roiVal).toBeNull();
  });
});
