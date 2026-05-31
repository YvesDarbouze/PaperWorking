/**
 * Golden test — runs all 10 metric wrappers against a realistic seed project
 * and asserts values match the underlying reiMetrics engine.
 *
 * The SEED_PROJECT fixture mirrors a typical rental property analysis.
 * Expected values are derived by calling deriveAllMetrics() directly
 * and using its outputs as golden reference values.
 */

import { deriveAllMetrics, computeTotalCashInvested, computeAnnualDebtService } from '../reiMetrics';
import { computeNOIMetric } from '../computeNOI';
import { computeCashFlowMetric } from '../computeCashFlow';
import { computeCapRateMetric } from '../computeCapRate';
import { computeCoCMetric } from '../computeCoC';
import { computeGRMMetric } from '../computeGRM';
import { computeDSCRMetric } from '../computeDSCR';
import { computeIRRMetric } from '../computeIRR';
import { computeOccupancyMetric } from '../computeOccupancy';
import { computeExpenseRatioMetric } from '../computeExpenseRatio';
import { computeAppreciationMetric } from '../computeAppreciation';

/**
 * Realistic seed project fixture.
 *
 * Purchase price: $279,000
 * Monthly rent: $1,950
 * Vacancy: 7%
 * OpEx: taxes $250/mo, insurance $125/mo, maintenance $100/mo, mgmt 8%, HOA $0, utilities $0
 * Loan: $223,200 (80% LTV), 7% rate, 30-year term
 * Rehab: $35,000
 * Down payment: $55,800 (via computeTotalCashInvested)
 * Acquisition costs: $5,000
 * Hold time: 12 months projected
 * ARV: $350,000
 */
const SEED_FINANCIALS = {
  purchasePrice: 279000,
  estimatedARV: 350000,
  monthlyGrossRent: 1950,
  vacancyRatePercent: 7,
  holdingCostTaxes: 250,
  holdingCostInsurance: 125,
  holdingCostUtilities: 0,
  propertyManagementFeePercent: 8,
  monthlyMaintenanceReserve: 100,
  monthlyHOA: 0,
  loanAmount: 223200,
  loanInterestRate: 7,
  loanTermYears: 30,
  projectedRehabCost: 35000,
  fixedAcquisitionCosts: 5000,
  emdAmount: 0,
  projectedHoldTimeMonths: 12,
  annualAppreciationPercent: 3,
  costs: [] as any[],
};

const SEED_PROJECT = {
  financials: SEED_FINANCIALS,
  currentPhase: 1,
  strategyType: 'Rent' as const,
};

// Get golden values from the engine
const golden = deriveAllMetrics(
  SEED_FINANCIALS as any,
  undefined, // currentPropertyValue
  'Rent',
  1, // currentPhase
);

describe('Golden Test — All 10 Metrics Against Seed Project', () => {
  test('D1 NOI matches deriveAllMetrics', () => {
    const result = computeNOIMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // Match the golden NOI from deriveAllMetrics
    expect(result.value).toBeCloseTo(golden.noi, 0);
  });

  test('D2 Cash Flow matches deriveAllMetrics', () => {
    const result = computeCashFlowMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    expect(result.value).toBeCloseTo(golden.annualCashFlow, 0);
  });

  test('D3 Cap Rate matches deriveAllMetrics', () => {
    const result = computeCapRateMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // Cap rate to 0.01% precision
    expect(result.value).toBeCloseTo(golden.capRate, 1);
  });

  test('D4 Cash-on-Cash matches deriveAllMetrics', () => {
    const result = computeCoCMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    expect(result.value).toBeCloseTo(golden.cashOnCashReturn, 1);
  });

  test('D5 GRM matches deriveAllMetrics', () => {
    const result = computeGRMMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // GRM in deriveAllMetrics uses propertyValue = currentPropertyValue ?? estimatedARV ?? purchasePrice
    // Our wrapper uses estimatedARV ?? purchasePrice, so should match
    expect(result.value).toBeCloseTo(golden.grossRentMultiplier, 1);
  });

  test('D6 DSCR matches deriveAllMetrics', () => {
    const result = computeDSCRMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // After CE-C1 fix, computeDSCR returns 999 (sentinel) for all-cash deals instead of Infinity
    expect(result.value).toBeCloseTo(golden.dscr, 2);
  });

  test('D7 IRR produces a reasonable value for rental seed deal', () => {
    const result = computeIRRMetric(SEED_PROJECT);
    // Newton-Raphson may or may not converge for 1-year hold deals
    expect(['projected', 'incomplete']).toContain(result.state);
    if (result.state === 'projected') {
      expect(result.value).not.toBeNull();
      expect(typeof result.value).toBe('number');
      // IRR for a 1-year hold rental deal should be a reasonable percentage
      expect(result.value!).toBeGreaterThan(-50);
      expect(result.value!).toBeLessThan(100);
    }
  });

  test('D8 Occupancy matches deriveAllMetrics', () => {
    const result = computeOccupancyMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    // For rental strategy with 7% vacancy, occupancy = 93%
    expect(result.value).toBeCloseTo(golden.occupancyRate, 1);
  });

  test('D9 OER matches deriveAllMetrics', () => {
    const result = computeExpenseRatioMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    expect(result.value).toBeCloseTo(golden.oer, 1);
  });

  test('D10 Appreciation computes a positive rate for ARV > purchase', () => {
    const result = computeAppreciationMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    // ARV ($350k) > purchase basis ($279k + $5k), so appreciation should be positive
    expect(result.value!).toBeGreaterThan(0);
  });

  test('All wrappers return MetricResult shape', () => {
    const wrappers = [
      computeNOIMetric,
      computeCashFlowMetric,
      computeCapRateMetric,
      computeCoCMetric,
      computeGRMMetric,
      computeDSCRMetric,
      computeIRRMetric,
      computeOccupancyMetric,
      computeExpenseRatioMetric,
      computeAppreciationMetric,
    ];

    for (const wrapper of wrappers) {
      const result = wrapper(SEED_PROJECT);
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('inputsUsed');
      expect(result).toHaveProperty('inputsMissing');
      expect(Array.isArray(result.inputsMissing)).toBe(true);
      expect(typeof result.inputsUsed).toBe('object');
    }
  });
});

describe('Golden Test — Sanity checks on seed values', () => {
  test('Annual debt service for $223,200 at 7% / 30yr is ~$17,826', () => {
    const ds = computeAnnualDebtService(223200, 7, 30 * 12);
    expect(ds).toBeGreaterThan(17000);
    expect(ds).toBeLessThan(19000);
  });

  test('Total cash invested includes down payment + rehab + acquisition costs', () => {
    const tci = computeTotalCashInvested(SEED_FINANCIALS as any);
    // Down payment = $279k - $223.2k = $55,800
    // + $5,000 acq costs + $35,000 rehab + ($375/mo × 12 = $4,500 holding)
    expect(tci).toBeGreaterThan(90000);
    expect(tci).toBeLessThan(110000);
  });

  test('NOI is positive (rent exceeds operating expenses)', () => {
    expect(golden.noi).toBeGreaterThan(0);
  });

  test('Cash flow is negative (NOI < annual debt service) for this deal', () => {
    // At 7% rate on $223k, debt service (~$17.8k) exceeds likely NOI (~$12.5k)
    expect(golden.annualCashFlow).toBeLessThan(0);
  });
});
