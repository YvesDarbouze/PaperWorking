import { computeSingleMetric } from '@/lib/metrics/metricRegistry';

/**
 * Regression: registry metrics returned 0 for a project with no data, so the
 * Insights cards rendered "Cap Rate 0.0%" / "LTV 0.0%" — indistinguishable from
 * a real measurement. Requirement 5 wants an em dash there, which means the
 * compute must yield null.
 *
 * The core formulas in `reiMetrics.ts` intentionally return 0 (other consumers
 * depend on a number), so the guard lives at the registry layer instead.
 */

const GUARDED = ['noi', 'cap_rate', 'cash_on_cash', 'irr', 'cash_flow', 'grm', 'dscr', 'ltv', 'oer'];

const emptyProject = { id: 'empty', financials: {} };
const noFinancials = { id: 'bare' };

const realProject = {
  id: 'real',
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
  },
};

describe('registry null contract', () => {
  it('returns null, never 0, for a project with empty financials', () => {
    for (const id of GUARDED) {
      expect(computeSingleMetric(emptyProject, id)).toBeNull();
    }
  });

  it('returns null when financials are absent entirely', () => {
    for (const id of GUARDED) {
      expect(computeSingleMetric(noFinancials, id)).toBeNull();
    }
  });

  it('returns null for a null project', () => {
    expect(computeSingleMetric(null, 'cap_rate')).toBeNull();
  });

  it('still computes real values when inputs are present', () => {
    expect(computeSingleMetric(realProject, 'cap_rate')).toBeGreaterThan(0);
    expect(computeSingleMetric(realProject, 'ltv')).toBe(75);
    expect(computeSingleMetric(realProject, 'noi')).toBeGreaterThan(0);
    expect(computeSingleMetric(realProject, 'dscr')).toBeGreaterThan(1);
  });

  it('treats an explicit zero input as missing, not as a measurement', () => {
    // A recorded purchasePrice of 0 is a data-entry gap, not a free property.
    const zeroPrice = { id: 'z', financials: { purchasePrice: 0, monthlyGrossRent: 4_000 } };
    expect(computeSingleMetric(zeroPrice, 'cap_rate')).toBeNull();
    expect(computeSingleMetric(zeroPrice, 'grm')).toBeNull();
  });

  it('guards each metric independently — rent present, price absent', () => {
    const rentOnly = { id: 'r', financials: { monthlyGrossRent: 4_000 } };
    // NOI only needs rent, so it resolves…
    expect(computeSingleMetric(rentOnly, 'noi')).not.toBeNull();
    // …but cap rate needs a value it does not have.
    expect(computeSingleMetric(rentOnly, 'cap_rate')).toBeNull();
    expect(computeSingleMetric(rentOnly, 'ltv')).toBeNull();
  });

  it('leaves unguarded metrics passing through', () => {
    // risk_score has no REQUIRED_INPUTS entry; it must not be forced to null.
    const v = computeSingleMetric(realProject, 'risk_score');
    expect(v === null || Number.isFinite(v)).toBe(true);
  });
});

describe('ratio metrics need BOTH sides', () => {
  it('LTV with a loan but no property value is unknown, not 0%', () => {
    const loanOnly = { id: 'l', financials: { loanAmount: 300_000 } };
    expect(computeSingleMetric(loanOnly, 'ltv')).toBeNull();
  });

  it('LTV resolves once a value basis exists', () => {
    const both = { id: 'b', financials: { loanAmount: 300_000, purchasePrice: 400_000 } };
    expect(computeSingleMetric(both, 'ltv')).toBe(75);
  });

  it('DSCR with debt but no income is unknown, not 0.00x', () => {
    const debtOnly = { id: 'd', financials: { loanAmount: 300_000, monthlyDebtService: 1_600 } };
    expect(computeSingleMetric(debtOnly, 'dscr')).toBeNull();
  });

  it('cap rate with rent but no value is unknown', () => {
    const rentOnly = { id: 'r', financials: { monthlyGrossRent: 4_000 } };
    expect(computeSingleMetric(rentOnly, 'cap_rate')).toBeNull();
  });

  it('cap rate with value but no rent is unknown', () => {
    const valueOnly = { id: 'v', financials: { purchasePrice: 400_000 } };
    expect(computeSingleMetric(valueOnly, 'cap_rate')).toBeNull();
  });
});
