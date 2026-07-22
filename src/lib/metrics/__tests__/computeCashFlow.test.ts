/**
 * computeCashFlow wrapper tests.
 */

import { computeCashFlowMetric } from '../computeCashFlow';

describe('computeCashFlowMetric', () => {
  test('happy path — financed deal', () => {
    const result = computeCashFlowMetric({
      financials: {
        monthlyGrossRent: 2000,
        vacancyRatePercent: 5,
        holdingCostTaxes: 200,
        holdingCostInsurance: 100,
        monthlyMaintenanceReserve: 50,
        propertyManagementFeePercent: 10,
        monthlyHOA: 0,
        holdingCostUtilities: 0,
        loanAmount: 160000,
        loanInterestRate: 7,
        loanTermYears: 30,
      },
      currentPhase: 1,
    });

    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    expect(typeof result.value).toBe('number');
  });

  test('all-cash deal — no debt service, cash flow equals NOI', () => {
    const result = computeCashFlowMetric({
      financials: {
        monthlyGrossRent: 2000,
        vacancyRatePercent: 5,
        holdingCostTaxes: 200,
        holdingCostInsurance: 100,
        monthlyMaintenanceReserve: 50,
        propertyManagementFeePercent: 10,
        loanAmount: 0,
      },
      currentPhase: 1,
    });

    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    // Cash flow should equal NOI when there's no debt
    // NOI = $22,800 effective rent - $5,400 (taxes, ins, maint) - $2,400 (10% PM of gross rent) = $16,200
    expect(result.value).toBeCloseTo(16200, 0);
  });

  test('missing rent returns incomplete', () => {
    const result = computeCashFlowMetric({
      financials: {
        loanAmount: 160000,
        loanInterestRate: 7,
      },
    });

    expect(result.state).toBe('incomplete');
    expect(result.value).toBeNull();
    expect(result.inputsMissing).toContain('financials.monthlyGrossRent');
  });

  test('records loan inputs in inputsUsed when loan exists', () => {
    const result = computeCashFlowMetric({
      financials: {
        monthlyGrossRent: 2000,
        loanAmount: 100000,
        loanInterestRate: 6,
        loanTermYears: 30,
      },
      currentPhase: 1,
    });

    expect(result.inputsUsed['financials.loanAmount']).toBe(100000);
    expect(result.inputsUsed['financials.loanInterestRate']).toBe(6);
  });
});
