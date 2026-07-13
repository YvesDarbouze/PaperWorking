/**
 * whatChanged tests — verifies that modifying specific fields
 * triggers the correct set of metric recomputations.
 */

import { whatChanged, METRIC_DEPENDENCIES } from '../whatChanged';
import type { MetricId } from '../types';

const BASE_PROJECT = {
  financials: {
    purchasePrice: 200000,
    estimatedARV: 250000,
    monthlyGrossRent: 2000,
    vacancyRatePercent: 5,
    holdingCostTaxes: 200,
    holdingCostInsurance: 100,
    monthlyMaintenanceReserve: 50,
    propertyManagementFeePercent: 10,
    loanAmount: 160000,
    loanInterestRate: 7,
    loanTermYears: 30,
    projectedRehabCost: 20000,
    fixedAcquisitionCosts: 5000,
    projectedHoldTimeMonths: 60,
    annualAppreciationPercent: 3,
    numberOfUnits: 1,
    occupiedUnits: 1,
  },
  dispositionType: 'RENT',
  subStrategy: 'LONG_TERM',
  currentPhase: 1,
};

function clone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

describe('whatChanged', () => {
  test('identical projects → no changes', () => {
    const result = whatChanged(BASE_PROJECT, clone(BASE_PROJECT));
    expect(result).toHaveLength(0);
  });

  test('changing rent triggers NOI, CASH_FLOW, CAP_RATE, COC, GRM, DSCR, IRR, OER', () => {
    const after = clone(BASE_PROJECT);
    after.financials.monthlyGrossRent = 2500;

    const changed = whatChanged(BASE_PROJECT, after);

    expect(changed).toContain('NOI');
    expect(changed).toContain('CASH_FLOW');
    expect(changed).toContain('CAP_RATE');
    expect(changed).toContain('COC');
    expect(changed).toContain('GRM');
    expect(changed).toContain('DSCR');
    expect(changed).toContain('IRR');
    expect(changed).toContain('OER');
    // OCCUPANCY and APPRECIATION should NOT be affected
    expect(changed).not.toContain('OCCUPANCY');
    expect(changed).not.toContain('APPRECIATION');
  });

  test('changing purchase price triggers CAP_RATE, COC, GRM, IRR, APPRECIATION', () => {
    const after = clone(BASE_PROJECT);
    after.financials.purchasePrice = 220000;

    const changed = whatChanged(BASE_PROJECT, after);

    expect(changed).toContain('CAP_RATE');
    expect(changed).toContain('COC');
    expect(changed).toContain('IRR');
    expect(changed).toContain('APPRECIATION');
  });

  test('changing loan amount triggers CASH_FLOW, COC, DSCR, IRR', () => {
    const after = clone(BASE_PROJECT);
    after.financials.loanAmount = 180000;

    const changed = whatChanged(BASE_PROJECT, after);

    expect(changed).toContain('CASH_FLOW');
    expect(changed).toContain('COC');
    expect(changed).toContain('DSCR');
    expect(changed).toContain('IRR');
  });

  test('changing vacancy triggers NOI, CASH_FLOW, CAP_RATE, COC, DSCR, OER, OCCUPANCY', () => {
    const after = clone(BASE_PROJECT);
    after.financials.vacancyRatePercent = 10;

    const changed = whatChanged(BASE_PROJECT, after);

    expect(changed).toContain('NOI');
    expect(changed).toContain('CASH_FLOW');
    expect(changed).toContain('CAP_RATE');
    expect(changed).toContain('OCCUPANCY');
    expect(changed).toContain('OER');
  });

  test('changing dispositionType triggers multiple metrics', () => {
    const after = clone(BASE_PROJECT);
    after.dispositionType = 'SALE';

    const changed = whatChanged(BASE_PROJECT, after);

    expect(changed).toContain('NOI');
    expect(changed).toContain('OCCUPANCY');
  });

  test('changing ARV triggers GRM and APPRECIATION', () => {
    const after = clone(BASE_PROJECT);
    after.financials.estimatedARV = 300000;

    const changed = whatChanged(BASE_PROJECT, after);

    expect(changed).toContain('GRM');
    expect(changed).toContain('APPRECIATION');
  });

  test('changing numberOfUnits triggers only OCCUPANCY', () => {
    const after = clone(BASE_PROJECT);
    after.financials.numberOfUnits = 4;

    const changed = whatChanged(BASE_PROJECT, after);

    expect(changed).toContain('OCCUPANCY');
    // Should not trigger financial metrics
    expect(changed).not.toContain('NOI');
    expect(changed).not.toContain('CASH_FLOW');
  });

  test('METRIC_DEPENDENCIES covers all 10 metrics', () => {
    const ids: MetricId[] = ['NOI', 'CASH_FLOW', 'CAP_RATE', 'COC', 'GRM', 'DSCR', 'IRR', 'OCCUPANCY', 'OER', 'APPRECIATION'];
    for (const id of ids) {
      expect(METRIC_DEPENDENCIES[id]).toBeDefined();
      expect(METRIC_DEPENDENCIES[id]!.length).toBeGreaterThan(0);
    }
  });
});
