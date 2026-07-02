/**
 * computeDSCR, computeIRR, computeOccupancy, computeExpenseRatio, computeAppreciation tests.
 */

import { computeDSCRMetric } from '../computeDSCR';
import { computeIRRMetric } from '../computeIRR';
import { computeOccupancyMetric } from '../computeOccupancy';
import { computeExpenseRatioMetric } from '../computeExpenseRatio';
import { computeAppreciationMetric } from '../computeAppreciation';

describe('computeDSCRMetric', () => {
  test('happy path — financed deal', () => {
    const result = computeDSCRMetric({
      financials: {
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

  test('all-cash deal returns n/a', () => {
    const result = computeDSCRMetric({
      financials: {
        monthlyGrossRent: 2000,
        loanAmount: 0,
      },
    });
    expect(result.state).toBe('n/a');
    expect(result.value).toBeNull();
  });

  test('financingType All Cash returns n/a', () => {
    const result = computeDSCRMetric({
      financials: {
        monthlyGrossRent: 2000,
        loanAmount: 100000,
        financingType: 'All Cash',
      },
    });
    expect(result.state).toBe('n/a');
  });

  test('missing rent returns incomplete', () => {
    const result = computeDSCRMetric({
      financials: {
        loanAmount: 160000,
        loanInterestRate: 7,
      },
    });
    expect(result.state).toBe('incomplete');
  });
});

describe('computeIRRMetric', () => {
  test('happy path — returns a number or incomplete', () => {
    const result = computeIRRMetric({
      financials: {
        purchasePrice: 200000,
        monthlyGrossRent: 2000,
        loanAmount: 160000,
        loanInterestRate: 6,
        loanTermYears: 30,
        projectedRehabCost: 20000,
        fixedAcquisitionCosts: 5000,
        projectedHoldTimeMonths: 60,
        annualAppreciationPercent: 3,
      },
      currentPhase: 1,
    });

    expect(['projected', 'incomplete']).toContain(result.state);
    if (result.state === 'projected') {
      expect(typeof result.value).toBe('number');
    }
  });

  test('missing purchase price returns incomplete', () => {
    const result = computeIRRMetric({
      financials: {
        monthlyGrossRent: 2000,
      },
    });
    expect(result.state).toBe('incomplete');
    expect(result.inputsMissing).toContain('financials.purchasePrice');
  });
});

describe('computeOccupancyMetric', () => {
  test('rental with 7% vacancy → 93% occupancy', () => {
    const result = computeOccupancyMetric({
      financials: {
        vacancyRatePercent: 7,
      },
      strategyType: 'Rent',
      currentPhase: 3,
    });

    expect(result.state).toBe('live');
    expect(result.value).toBe(93);
  });

  test('flip strategy returns 0', () => {
    const result = computeOccupancyMetric({
      financials: {},
      strategyType: 'Fix & Flip',
    });
    expect(result.value).toBe(0);
  });

  test('day-based occupancy', () => {
    const result = computeOccupancyMetric({
      financials: {
        daysOccupied: 300,
        totalHoldDays: 365,
      },
      strategyType: 'Rent',
      currentPhase: 3,
    });

    expect(result.value).toBeCloseTo(82.19, 1);
  });

  test('unit-based occupancy', () => {
    const result = computeOccupancyMetric({
      financials: {
        numberOfUnits: 4,
        occupiedUnits: 3,
      },
      strategyType: 'Rent',
    });

    expect(result.value).toBe(75);
  });
});

describe('computeExpenseRatioMetric', () => {
  test('happy path', () => {
    const result = computeExpenseRatioMetric({
      financials: {
        monthlyGrossRent: 2000,
        holdingCostTaxes: 200,
        holdingCostInsurance: 100,
        monthlyMaintenanceReserve: 50,
        propertyManagementFeePercent: 10,
      },
    });

    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    // OpEx = $2,400 + $1,200 + $600 + $2,400 = $6,600
    // GRI = $24,000
    // OER = 27.5%
    expect(result.value!).toBeGreaterThan(20);
    expect(result.value!).toBeLessThan(40);
  });

  test('missing rent returns incomplete', () => {
    const result = computeExpenseRatioMetric({
      financials: {
        holdingCostTaxes: 200,
      },
    });
    expect(result.state).toBe('incomplete');
  });
});

describe('computeAppreciationMetric', () => {
  test('ARV above purchase basis → positive appreciation', () => {
    const result = computeAppreciationMetric({
      financials: {
        purchasePrice: 200000,
        fixedAcquisitionCosts: 5000,
        estimatedARV: 300000,
        projectedHoldTimeMonths: 60,
      },
    });

    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.value!).toBeGreaterThan(0);
  });

  test('ARV below purchase basis → negative appreciation', () => {
    const result = computeAppreciationMetric({
      financials: {
        purchasePrice: 300000,
        fixedAcquisitionCosts: 10000,
        estimatedARV: 250000,
        projectedHoldTimeMonths: 60,
      },
    });

    expect(result.value).not.toBeNull();
    expect(result.value!).toBeLessThan(0);
  });

  test('missing purchase price returns incomplete', () => {
    const result = computeAppreciationMetric({
      financials: {
        estimatedARV: 300000,
      },
    });
    expect(result.state).toBe('incomplete');
  });
});
