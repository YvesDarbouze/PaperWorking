/**
 * computeCapRate, computeCoC, computeGRM wrapper tests.
 */

import { computeCapRateMetric } from '../computeCapRate';
import { computeCoCMetric } from '../computeCoC';
import { computeGRMMetric } from '../computeGRM';

describe('computeCapRateMetric', () => {
  test('happy path', () => {
    const result = computeCapRateMetric({
      financials: {
        purchasePrice: 200000,
        monthlyGrossRent: 2000,
        vacancyRatePercent: 5,
        holdingCostTaxes: 200,
        holdingCostInsurance: 100,
        monthlyMaintenanceReserve: 50,
        propertyManagementFeePercent: 10,
      },
      currentPhase: 1,
    });

    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    // NOI ~ $16,200 / $200,000 = ~8.1%
    expect(result.value!).toBeGreaterThan(5);
    expect(result.value!).toBeLessThan(15);
  });

  test('missing purchase price returns incomplete', () => {
    const result = computeCapRateMetric({
      financials: {
        monthlyGrossRent: 2000,
      },
    });
    expect(result.state).toBe('incomplete');
    expect(result.inputsMissing).toContain('financials.purchasePrice');
  });

  test('missing rent returns incomplete', () => {
    const result = computeCapRateMetric({
      financials: {
        purchasePrice: 200000,
      },
    });
    expect(result.state).toBe('incomplete');
    expect(result.inputsMissing).toContain('financials.monthlyGrossRent');
  });

  test('both missing returns both in inputsMissing', () => {
    const result = computeCapRateMetric({ financials: {} });
    expect(result.state).toBe('incomplete');
    expect(result.inputsMissing).toContain('financials.purchasePrice');
    expect(result.inputsMissing).toContain('financials.monthlyGrossRent');
  });
});

describe('computeCoCMetric', () => {
  test('happy path', () => {
    const result = computeCoCMetric({
      financials: {
        purchasePrice: 200000,
        monthlyGrossRent: 2000,
        vacancyRatePercent: 5,
        holdingCostTaxes: 200,
        holdingCostInsurance: 100,
        monthlyMaintenanceReserve: 50,
        propertyManagementFeePercent: 10,
        loanAmount: 160000,
        loanInterestRate: 7,
        loanTermYears: 30,
      },
      currentPhase: 1,
    });

    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(typeof result.value).toBe('number');
  });

  test('missing purchase price returns incomplete', () => {
    const result = computeCoCMetric({
      financials: {
        monthlyGrossRent: 2000,
        loanAmount: 160000,
      },
    });
    expect(result.state).toBe('incomplete');
  });
});

describe('computeGRMMetric', () => {
  test('happy path', () => {
    const result = computeGRMMetric({
      financials: {
        purchasePrice: 240000,
        monthlyGrossRent: 2000,
      },
    });

    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    // GRM = $240,000 / ($2,000 × 12) = 10.0
    expect(result.value).toBeCloseTo(10.0, 1);
  });

  test('missing both returns both in inputsMissing', () => {
    const result = computeGRMMetric({ financials: {} });
    expect(result.state).toBe('incomplete');
    expect(result.inputsMissing.length).toBeGreaterThanOrEqual(2);
  });

  test('zero rent returns incomplete', () => {
    const result = computeGRMMetric({
      financials: {
        purchasePrice: 200000,
        monthlyGrossRent: 0,
      },
    });
    expect(result.state).toBe('incomplete');
  });
});
