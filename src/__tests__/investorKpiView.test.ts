import { METRICS_REGISTRY } from '@/lib/metrics/metricRegistry';
import {
  BROKERAGE_METRIC_IDS,
  INVESTOR_METRIC_ENTRIES,
} from '@/lib/metrics/investorMetrics';
import {
  EM_DASH,
  KPI_SECTIONS,
  LOWER_IS_BETTER_IDS,
  computeTrend,
  findInvestorMetric,
  formatMetricValue,
  investorKpiCount,
  investorMetrics,
  resolvedKpiSections,
  trendTone,
} from '@/lib/metrics/investorKpiView';

/** A project with enough data for most metrics to resolve. */
const fullProject = {
  id: 'p1',
  units: 4,
  occupiedUnits: 3,
  squareFootage: 3_200,
  financials: {
    purchasePrice: 400_000,
    estimatedARV: 460_000,
    loanAmount: 300_000,
    monthlyGrossRent: 4_000,
    monthlyDebtService: 1_600,
    tax: 400,
    insurance: 150,
    maintenance: 200,
    management: 320,
    vacancy_pct: 5,
    holdYears: 7,
    exitCapRate: 6.25,
  },
};

const emptyProject = { id: 'p2', financials: {} };

describe('investor KPI view', () => {
  describe('composition', () => {
    it('excludes brokerage metrics from the investor set', () => {
      const ids = investorMetrics().map((m) => m.id);
      for (const brokerage of BROKERAGE_METRIC_IDS) {
        expect(ids).not.toContain(brokerage);
      }
    });

    it('keeps the investor-relevant registry metrics', () => {
      const ids = investorMetrics().map((m) => m.id);
      for (const core of ['noi', 'irr', 'cap_rate', 'cash_on_cash', 'ltv', 'dscr', 'grm', 'oer']) {
        expect(ids).toContain(core);
      }
    });

    it('adds the investor extensions', () => {
      const ids = investorMetrics().map((m) => m.id);
      for (const added of ['roa', 'yield_on_cost', 'dti', 'break_even_ratio', 'rent_to_value']) {
        expect(ids).toContain(added);
      }
    });

    it('exposes at least 33 investor KPIs', () => {
      expect(investorKpiCount()).toBeGreaterThanOrEqual(33);
    });

    it('has no duplicate ids after composition', () => {
      const ids = investorMetrics().map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('arithmetic: registry − brokerage + extensions', () => {
      expect(investorKpiCount()).toBe(
        METRICS_REGISTRY.length - BROKERAGE_METRIC_IDS.length + INVESTOR_METRIC_ENTRIES.length,
      );
    });

    it('every metric carries a formula and a name for the detail drawer', () => {
      for (const m of investorMetrics()) {
        expect(m.name.length).toBeGreaterThan(0);
        expect(m.formula.length).toBeGreaterThan(0);
      }
    });
  });

  describe('sections', () => {
    it('gives the first four sections exactly four cards each', () => {
      const resolved = resolvedKpiSections();
      for (const spec of KPI_SECTIONS) {
        const found = resolved.find((s) => s.key === spec.key)!;
        expect(found.metrics).toHaveLength(4);
      }
    });

    it('places every remaining metric in Additional KPIs', () => {
      const resolved = resolvedKpiSections();
      const placed = resolved.flatMap((s) => s.metrics.map((m) => m.id));
      expect(new Set(placed).size).toBe(investorKpiCount());
    });

    it('never repeats a metric across sections', () => {
      const placed = resolvedKpiSections().flatMap((s) => s.metrics.map((m) => m.id));
      expect(new Set(placed).size).toBe(placed.length);
    });

    it('resolves every id named in KPI_SECTIONS', () => {
      for (const s of KPI_SECTIONS) {
        for (const id of s.metricIds) {
          expect(findInvestorMetric(id)).toBeDefined();
        }
      }
    });
  });

  describe('the null contract — missing data is never zero', () => {
    it('returns null, not 0, for every extension on an empty project', () => {
      for (const m of INVESTOR_METRIC_ENTRIES) {
        const v = m.compute(emptyProject);
        expect(v === null || Number.isFinite(v)).toBe(true);
        if (v !== null) {
          // If anything does resolve it must come from real inputs, not a
          // default — an empty project has none.
          expect(v).not.toBe(0);
        }
      }
    });

    it('formats null as an em dash for every unit', () => {
      for (const unit of ['currency', 'percent', 'ratio', 'days', 'count'] as const) {
        expect(formatMetricValue(null, unit)).toBe(EM_DASH);
      }
    });

    it('formats a real zero as zero, not an em dash', () => {
      expect(formatMetricValue(0, 'currency')).toBe('$0');
      expect(formatMetricValue(0, 'percent')).toBe('0.0%');
    });

    it('treats NaN and Infinity as missing', () => {
      expect(formatMetricValue(NaN, 'percent')).toBe(EM_DASH);
      expect(formatMetricValue(Infinity, 'currency')).toBe(EM_DASH);
    });
  });

  describe('extension computations', () => {
    const compute = (id: string) =>
      INVESTOR_METRIC_ENTRIES.find((m) => m.id === id)!.compute(fullProject);

    it('price per door divides by unit count', () => {
      expect(compute('price_per_door')).toBe(100_000); // 400k / 4
    });

    it('cost per sq ft divides by square footage', () => {
      expect(compute('cost_per_sqft')).toBeCloseTo(125, 2); // 400k / 3200
    });

    it('potential gross income annualises rent', () => {
      expect(compute('potential_gross_income')).toBe(48_000); // 4000 * 12
    });

    it('effective gross income applies the vacancy assumption', () => {
      expect(compute('effective_gross_income')).toBeCloseTo(45_600, 2); // 48k * 0.95
    });

    it('rent-to-value uses monthly rent over value', () => {
      // 4000 / 460000 * 100
      expect(compute('rent_to_value')).toBeCloseTo(0.87, 2);
    });

    it('loan constant is debt service over loan', () => {
      // (1600*12) / 300000 * 100
      expect(compute('loan_constant')).toBeCloseTo(6.4, 2);
    });

    it('reads holding period and exit cap straight through', () => {
      expect(compute('holding_period')).toBe(7);
      expect(compute('exit_cap_rate')).toBe(6.25);
    });

    it('vacancy rate prefers the explicit assumption', () => {
      expect(compute('vacancy_rate')).toBe(5);
    });

    it('aggregates a portfolio as the mean of resolvable values', () => {
      const entry = INVESTOR_METRIC_ENTRIES.find((m) => m.id === 'price_per_door')!;
      const other = { ...fullProject, id: 'p3', financials: { ...fullProject.financials, purchasePrice: 200_000 } };
      // (100000 + 50000) / 2
      expect(entry.compute(null, [fullProject, other])).toBe(75_000);
    });

    it('returns null for a portfolio where nothing resolves', () => {
      const entry = INVESTOR_METRIC_ENTRIES.find((m) => m.id === 'price_per_door')!;
      expect(entry.compute(null, [emptyProject])).toBeNull();
    });
  });

  describe('trends', () => {
    it('reports direction and signed label', () => {
      expect(computeTrend(110, 100)).toMatchObject({ direction: 'up', label: '+10.0%' });
      expect(computeTrend(90, 100)).toMatchObject({ direction: 'down', label: '-10.0%' });
    });

    it('is flat for negligible movement', () => {
      expect(computeTrend(100.01, 100).direction).toBe('flat');
    });

    it('is "none" when either side is missing', () => {
      expect(computeTrend(null, 100).direction).toBe('none');
      expect(computeTrend(100, null).label).toBe(EM_DASH);
    });

    it('avoids dividing by a zero prior', () => {
      expect(computeTrend(50, 0).changePct).toBeNull();
    });

    it('handles a negative prior via absolute magnitude', () => {
      expect(computeTrend(-50, -100).direction).toBe('up');
    });
  });

  describe('trend tone — green only for genuinely positive movement', () => {
    it('rising NOI is positive', () => {
      expect(trendTone('noi', 'up')).toBe('positive');
    });

    it('rising LTV is NEGATIVE, not positive', () => {
      expect(trendTone('ltv', 'up')).toBe('negative');
      expect(trendTone('ltv', 'down')).toBe('positive');
    });

    it('every lower-is-better metric inverts', () => {
      for (const id of LOWER_IS_BETTER_IDS) {
        expect(trendTone(id, 'up')).toBe('negative');
        expect(trendTone(id, 'down')).toBe('positive');
      }
    });

    it('flat and unknown are neutral, never coloured', () => {
      expect(trendTone('noi', 'flat')).toBe('neutral');
      expect(trendTone('noi', 'none')).toBe('neutral');
      expect(trendTone('ltv', 'flat')).toBe('neutral');
    });
  });
});

/* ── Prior-period snapshot bridge ─────────────────────────────────────────── */

import {
  SNAPSHOT_FIELD_BY_METRIC_ID,
  TREND_PERIOD_LABELS,
  priorPeriodValues,
} from '@/lib/metrics/investorKpiView';

describe('priorPeriodValues', () => {
  const snap = (date: string, over: Record<string, number | null> = {}) => ({
    date,
    noi: 1000, capRate: 6, cashOnCashReturn: 8, irr: 12, annualCashFlow: 500,
    grossRentMultiplier: 10, dscr: 1.3, ltv: 70, oer: 40, occupancyRate: 95,
    vacancyRate: 5, appreciation: 3, grossRentalIncome: 48000,
    grossOperatingIncome: 45600,
    ...over,
  });

  it('returns {} with fewer than two periods — nothing to compare', () => {
    expect(priorPeriodValues([])).toEqual({});
    expect(priorPeriodValues([snap('2026-07-01')])).toEqual({});
    expect(priorPeriodValues(undefined)).toEqual({});
  });

  it('picks the period BEFORE the latest, not the latest', () => {
    const out = priorPeriodValues([
      snap('2026-06-01', { noi: 100 }),
      snap('2026-07-01', { noi: 200 }),
      snap('2026-08-01', { noi: 300 }),
    ]);
    expect(out.noi).toBe(200);
  });

  it('sorts by date regardless of input order', () => {
    const out = priorPeriodValues([
      snap('2026-08-01', { noi: 300 }),
      snap('2026-06-01', { noi: 100 }),
      snap('2026-07-01', { noi: 200 }),
    ]);
    expect(out.noi).toBe(200);
  });

  it('maps snapshot fields onto registry metric ids', () => {
    const out = priorPeriodValues([snap('2026-06-01'), snap('2026-07-01')]);
    expect(out.cap_rate).toBe(6);
    expect(out.cash_on_cash).toBe(8);
    expect(out.grm).toBe(10);
    expect(out.occupancy_rate).toBe(95);
    expect(out.aar).toBe(3);
  });

  it('yields null for a field that is null or absent, never 0', () => {
    // Nulls go on the PRIOR snapshot — that is the one read.
    const out = priorPeriodValues([
      snap('2026-06-01', { dscr: null, ltv: null }),
      snap('2026-07-01'),
    ]);
    expect(out.dscr).toBeNull();
    expect(out.ltv).toBeNull();
  });

  it('covers only mapped metrics, leaving others without a baseline', () => {
    const out = priorPeriodValues([snap('2026-06-01'), snap('2026-07-01')]);
    expect(Object.keys(out).sort()).toEqual(Object.keys(SNAPSHOT_FIELD_BY_METRIC_ID).sort());
    expect(out.price_per_door).toBeUndefined();
  });

  it('labels every period granularity', () => {
    expect(TREND_PERIOD_LABELS.monthly).toBe('vs last month');
    expect(TREND_PERIOD_LABELS.quarterly).toBe('vs last quarter');
    expect(TREND_PERIOD_LABELS.annual).toBe('vs last year');
  });
});
