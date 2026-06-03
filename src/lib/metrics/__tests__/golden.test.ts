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
 * Realistic seed project fixture matching PRD Option B.
 *
 * Purchase price: $279,000
 * Monthly rent: $1,950
 * Vacancy: 7%
 * OpEx: taxes $200/mo, insurance $58/mo, utilities $125/mo, mgmt 10%, maintenance $195/mo, HOA $0
 * Loan: $223,200 (80% LTV), 6.5% rate, 30-year term
 * Rehab: $0
 * Down payment: $55,800
 * Acquisition/Closing costs: $4,200
 * Hold time: 0 months projected (results in 1 year hold for annual metrics)
 * ARV: $350,000
 */
const SEED_FINANCIALS = {
  purchasePrice: 279000,
  estimatedARV: 350000,
  monthlyGrossRent: 1950,
  vacancyRatePercent: 7,
  holdingCostTaxes: 200,
  holdingCostInsurance: 58,
  holdingCostUtilities: 125,
  propertyManagementFeePercent: 10,
  monthlyMaintenanceReserve: 195,
  monthlyHOA: 0,
  loanAmount: 223200,
  loanInterestRate: 6.5,
  loanTermYears: 30,
  projectedRehabCost: 0,
  fixedAcquisitionCosts: 4200,
  emdAmount: 0,
  projectedHoldTimeMonths: 0,
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
    // Explicitly assert NOI is exactly $12,486
    expect(result.value).toBeCloseTo(12486, 0);
  });

  test('D2 Cash Flow matches deriveAllMetrics', () => {
    const result = computeCashFlowMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // Explicitly assert annual cash flow is exactly -$4,443.31
    expect(result.value).toBeCloseTo(-4443.31, 2);
  });

  test('D3 Cap Rate matches deriveAllMetrics', () => {
    const result = computeCapRateMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // Explicitly assert cap rate is 4.48%
    expect(result.value).toBeCloseTo(4.48, 2);
  });

  test('D4 Cash-on-Cash matches deriveAllMetrics', () => {
    const result = computeCoCMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // Explicitly assert CoC return is -7.41%
    expect(result.value).toBeCloseTo(-7.41, 2);
  });

  test('D5 GRM matches deriveAllMetrics', () => {
    const result = computeGRMMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // GRM = Purchase Price ÷ Gross Annual Rent = $279,000 ÷ $23,400 = 11.923 (PRD §4.2.2: 11.9)
    expect(result.value).toBeCloseTo(11.923, 1);
  });

  test('D6 DSCR matches deriveAllMetrics', () => {
    const result = computeDSCRMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // Explicitly assert DSCR is exactly 0.738 (approx 0.74)
    expect(result.value).toBeCloseTo(0.738, 3);
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
    expect(result.value).toBeCloseTo(93, 1);
  });

  test('D9 OER matches deriveAllMetrics', () => {
    const result = computeExpenseRatioMetric(SEED_PROJECT);
    expect(result.state).toBe('projected');
    expect(result.value).not.toBeNull();
    expect(result.inputsMissing).toHaveLength(0);
    // Explicitly assert OER is 39.64%
    expect(result.value).toBeCloseTo(39.64, 2);
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
  test('Annual debt service for $223,200 at 6.5% / 30yr is ~$16,929.31', () => {
    const ds = computeAnnualDebtService(223200, 6.5, 30 * 12);
    expect(ds).toBeCloseTo(16929.31, 2);
  });

  test('Total cash invested matches standard Option B ($60,000)', () => {
    const tci = computeTotalCashInvested(SEED_FINANCIALS as any);
    // Down payment = $279k - $223.2k = $55,800
    // + $4,200 acquisition costs
    expect(tci).toBe(60000);
  });

  test('NOI is positive (rent exceeds operating expenses)', () => {
    expect(golden.noi).toBe(12486);
  });

  test('Cash flow is negative (NOI < annual debt service) for this deal', () => {
    // At 6.5% rate on $223.2k, debt service ($16.9k) exceeds NOI ($12.5k)
    expect(golden.annualCashFlow).toBeCloseTo(-4443.31, 2);
  });
});
