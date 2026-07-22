/**
 * computeNOI wrapper tests.
 */

import { computeNOIMetric } from '../computeNOI';

describe('computeNOIMetric', () => {
  test('happy path — returns NOI from rent minus expenses', () => {
    const result = computeNOIMetric({
      financials: {
        monthlyGrossRent: 2000,
        vacancyRatePercent: 5,
        holdingCostTaxes: 200,
        holdingCostInsurance: 100,
        monthlyMaintenanceReserve: 50,
        propertyManagementFeePercent: 10,
        monthlyHOA: 0,
        holdingCostUtilities: 0,
      },
      currentPhase: 1,
    });

    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // Gross: $2,000 × 12 = $24,000
    // Vacancy: $24,000 × 5% = $1,200
    // Expenses: taxes $2,400 + insurance $1,200 + maintenance $600 + mgmt $2,400 (10% of $24,000 gross rent) = $6,600
    // NOI = $22,800 - $6,600 = $16,200
    expect(result.value).toBeCloseTo(16200, 0);
  });

  test('returns incomplete when only precomputed NOI is available (CE-C3: cache shortcut removed)', () => {
    // After CE-C3 fix, the wrapper requires actual rent inputs to compute NOI.
    // netOperatingIncome alone is no longer sufficient because it may be stale.
    const result = computeNOIMetric({
      financials: {
        netOperatingIncome: 15000,
      },
    });

    expect(result.state).toBe('incomplete');
    expect(result.value).toBeNull();
  });

  test('missing rent returns incomplete', () => {
    const result = computeNOIMetric({
      financials: {
        holdingCostTaxes: 200,
      },
    });

    expect(result.state).toBe('incomplete');
    expect(result.value).toBeNull();
    expect(result.inputsMissing).toContain('financials.monthlyGrossRent');
  });

  test('zero rent returns incomplete', () => {
    const result = computeNOIMetric({
      financials: {
        monthlyGrossRent: 0,
      },
    });

    expect(result.state).toBe('incomplete');
    expect(result.value).toBeNull();
  });

  test('Phase 3 returns "live" state', () => {
    const result = computeNOIMetric({
      financials: {
        monthlyGrossRent: 1500,
        vacancyRatePercent: 5,
      },
      currentPhase: 3,
    });

    expect(result.state).toBe('live');
  });

  test('Phase 4 returns "realized" state', () => {
    const result = computeNOIMetric({
      financials: {
        monthlyGrossRent: 1500,
      },
      currentPhase: 4,
    });

    expect(result.state).toBe('realized');
  });

  test('empty financials returns incomplete', () => {
    const result = computeNOIMetric({});
    expect(result.state).toBe('incomplete');
    expect(result.value).toBeNull();
  });
});
