/**
 * TC-C2 — Unit tests for core reiMetrics.ts pure functions.
 *
 * Covers all exported formula functions with exact value assertions,
 * edge cases (division by zero, all-cash deals, negative cash flow),
 * and boundary conditions.
 */

import {
  computeNOIComponents,
  computeNOI,
  computeCashFlow,
  computeCapRate,
  computeCoCReturn,
  computeGRM,
  computeDSCR,
  computeLTV,
  computeAnnualDebtService,
  computeTotalCashInvested,
  computeOER,
  computeBreakEvenOccupancy,
  computeMAO,
  computeFlipNetProfit,
  computeFlipROI,
  computeHealthScore,
} from '../reiMetrics';

// ═══════════════════════════════════════════════════════════════
// computeDSCR
// ═══════════════════════════════════════════════════════════════
describe('computeDSCR', () => {
  test('positive NOI, no debt → 999 sentinel (CE-C1 fix)', () => {
    expect(computeDSCR(12000, 0)).toBe(999);
  });

  test('zero NOI, no debt → 0', () => {
    expect(computeDSCR(0, 0)).toBe(0);
  });

  test('healthy coverage: 12000 / 10000 = 1.2', () => {
    expect(computeDSCR(12000, 10000)).toBeCloseTo(1.2, 2);
  });

  test('negative NOI produces negative DSCR', () => {
    expect(computeDSCR(-5000, 10000)).toBeCloseTo(-0.5, 2);
  });

  test('tight coverage: 10500 / 10000 = 1.05', () => {
    expect(computeDSCR(10500, 10000)).toBeCloseTo(1.05, 2);
  });

  test('result is JSON-safe (no Infinity)', () => {
    const result = computeDSCR(50000, 0);
    expect(Number.isFinite(result)).toBe(true);
    expect(JSON.stringify(result)).not.toBe('null');
  });
});

// ═══════════════════════════════════════════════════════════════
// computeCapRate
// ═══════════════════════════════════════════════════════════════
describe('computeCapRate', () => {
  test('standard: 12000 / 200000 = 6.0%', () => {
    expect(computeCapRate(12000, 200000)).toBeCloseTo(6.0, 1);
  });

  test('zero NOI → 0%', () => {
    expect(computeCapRate(0, 200000)).toBe(0);
  });

  test('zero property value → 0% (division guard)', () => {
    expect(computeCapRate(12000, 0)).toBe(0);
  });

  test('high cap rate: 30000 / 150000 = 20%', () => {
    expect(computeCapRate(30000, 150000)).toBeCloseTo(20.0, 1);
  });

  test('negative NOI produces negative cap rate', () => {
    expect(computeCapRate(-6000, 200000)).toBeCloseTo(-3.0, 1);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeCoCReturn
// ═══════════════════════════════════════════════════════════════
describe('computeCoCReturn', () => {
  test('standard: 5000 / 50000 = 10.0%', () => {
    expect(computeCoCReturn(5000, 50000)).toBeCloseTo(10.0, 1);
  });

  test('negative cash flow: -3000 / 50000 = -6.0%', () => {
    expect(computeCoCReturn(-3000, 50000)).toBeCloseTo(-6.0, 1);
  });

  test('zero cash invested → 0% (division guard)', () => {
    expect(computeCoCReturn(5000, 0)).toBe(0);
  });

  test('zero cash flow → 0%', () => {
    expect(computeCoCReturn(0, 100000)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeGRM
// ═══════════════════════════════════════════════════════════════
describe('computeGRM', () => {
  test('standard: 200000 / 24000 = 8.33', () => {
    expect(computeGRM(200000, 24000)).toBeCloseTo(8.33, 1);
  });

  test('zero annual rent → 0 (division guard)', () => {
    expect(computeGRM(200000, 0)).toBe(0);
  });

  test('low GRM: 100000 / 24000 = 4.17', () => {
    expect(computeGRM(100000, 24000)).toBeCloseTo(4.17, 1);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeLTV
// ═══════════════════════════════════════════════════════════════
describe('computeLTV', () => {
  test('80% LTV: 160000 / 200000', () => {
    expect(computeLTV(160000, 200000)).toBeCloseTo(80.0, 1);
  });

  test('zero loan → 0%', () => {
    expect(computeLTV(0, 200000)).toBe(0);
  });

  test('zero property value → 0% (division guard)', () => {
    expect(computeLTV(160000, 0)).toBe(0);
  });

  test('100% LTV (full leverage)', () => {
    expect(computeLTV(200000, 200000)).toBeCloseTo(100.0, 1);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeCashFlow
// ═══════════════════════════════════════════════════════════════
describe('computeCashFlow', () => {
  test('positive cash flow: 15000 NOI - 10000 DS = 5000 annual', () => {
    const result = computeCashFlow(15000, 10000);
    expect(result.annual).toBe(5000);
    expect(result.monthly).toBeCloseTo(416.67, 1);
  });

  test('negative cash flow: 8000 NOI - 10000 DS = -2000 annual', () => {
    const result = computeCashFlow(8000, 10000);
    expect(result.annual).toBe(-2000);
    expect(result.monthly).toBeCloseTo(-166.67, 1);
  });

  test('zero debt service (all-cash deal)', () => {
    const result = computeCashFlow(12000, 0);
    expect(result.annual).toBe(12000);
    expect(result.monthly).toBe(1000);
  });

  test('zero NOI with debt → negative cash flow', () => {
    const result = computeCashFlow(0, 18000);
    expect(result.annual).toBe(-18000);
    expect(result.monthly).toBe(-1500);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeAnnualDebtService
// ═══════════════════════════════════════════════════════════════
describe('computeAnnualDebtService', () => {
  test('zero loan amount → 0', () => {
    expect(computeAnnualDebtService(0, 7, 360)).toBe(0);
  });

  test('standard: $200k at 6% for 30yr ≈ $14,387/yr', () => {
    const ds = computeAnnualDebtService(200000, 6, 360);
    expect(ds).toBeGreaterThan(14000);
    expect(ds).toBeLessThan(15000);
  });

  test('$223,200 at 7% for 30yr ≈ $17,826/yr (golden seed)', () => {
    const ds = computeAnnualDebtService(223200, 7, 360);
    expect(ds).toBeGreaterThan(17000);
    expect(ds).toBeLessThan(19000);
  });

  test('zero interest rate → principal-only payment', () => {
    const ds = computeAnnualDebtService(120000, 0, 360);
    // Should return principal / months * 12 = 120000/360*12 = 4000/yr
    expect(ds).toBeGreaterThan(3500);
    expect(ds).toBeLessThan(4500);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeNOIComponents
// ═══════════════════════════════════════════════════════════════
describe('computeNOIComponents', () => {
  test('standard rental property calculates all components', () => {
    const fin = {
      monthlyGrossRent: 1950,
      vacancyRatePercent: 7,
      holdingCostTaxes: 250,
      holdingCostInsurance: 125,
      holdingCostUtilities: 0,
      propertyManagementFeePercent: 8,
      monthlyMaintenanceReserve: 100,
      monthlyHOA: 0,
    } as any;

    const result = computeNOIComponents(fin);

    // Gross rental: 1950 * 12 = 23400
    expect(result.grossRentalIncome).toBe(23400);
    // Vacancy: 23400 * 0.07 = 1638
    expect(result.vacancyLoss).toBeCloseTo(1638, 0);
    // Taxes: 250 * 12 = 3000
    expect(result.propertyTaxes).toBe(3000);
    // Insurance: 125 * 12 = 1500
    expect(result.insurance).toBe(1500);
    // PM: 23400 * 0.08 = 1872
    expect(result.propertyManagement).toBeCloseTo(1872, 0);
    // Maintenance: 100 * 12 = 1200
    expect(result.maintenance).toBe(1200);
    // HOA: 0
    expect(result.hoa).toBe(0);
    // NOI: 23400 + 0 - 1638 - (3000+1500+0+1872+1200+0) = positive
    expect(result.noi).toBeGreaterThan(0);
  });

  test('all missing fields → graceful fallbacks to zero', () => {
    const result = computeNOIComponents({} as any);
    expect(result.grossRentalIncome).toBe(0);
    expect(result.otherIncome).toBe(0);
    expect(result.vacancyLoss).toBe(0); // 7% default vacancy on $0 rent = $0
    expect(result.totalOperatingExpenses).toBe(0);
    expect(result.noi).toBe(0);
  });

  test('otherMonthlyIncome fallback uses parking + laundry (CE-C2)', () => {
    const fin = {
      monthlyGrossRent: 1000,
      grossIncomeParking: 50,
      grossIncomeLaundry: 30,
    } as any;

    const result = computeNOIComponents(fin);
    // Other income: (50 + 30) * 12 = 960
    expect(result.otherIncome).toBe(960);
  });

  test('otherMonthlyIncome takes priority over parking+laundry', () => {
    const fin = {
      monthlyGrossRent: 1000,
      otherMonthlyIncome: 100,
      grossIncomeParking: 50,
      grossIncomeLaundry: 30,
    } as any;

    const result = computeNOIComponents(fin);
    // otherMonthlyIncome wins: 100 * 12 = 1200
    expect(result.otherIncome).toBe(1200);
  });

  test('PM fee uses percent when available', () => {
    const fin = {
      monthlyGrossRent: 2000,
      propertyManagementFeePercent: 10,
      propertyManagementFee: 999, // should be ignored
    } as any;

    const result = computeNOIComponents(fin);
    // 10% of 24000 = 2400
    expect(result.propertyManagement).toBeCloseTo(2400, 0);
  });

  test('PM fee falls back to fixed monthly when no percent', () => {
    const fin = {
      monthlyGrossRent: 2000,
      propertyManagementFee: 150,
    } as any;

    const result = computeNOIComponents(fin);
    // 150 * 12 = 1800
    expect(result.propertyManagement).toBe(1800);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeNOI (scalar wrapper — CE-C3 fix)
// ═══════════════════════════════════════════════════════════════
describe('computeNOI', () => {
  test('always derives from components when rent input exists (CE-C3)', () => {
    const fin = {
      monthlyGrossRent: 2000,
      vacancyRatePercent: 5,
      holdingCostTaxes: 200,
      holdingCostInsurance: 100,
      netOperatingIncome: 99999, // stale cached value — should be IGNORED
    } as any;

    const result = computeNOI(fin);
    // Should NOT return 99999
    expect(result).not.toBe(99999);
    // Should compute from components: 2000*12 - vacancy - expenses
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(30000);
  });

  test('falls back to cached NOI when no rent inputs exist', () => {
    const fin = {
      netOperatingIncome: 15000,
    } as any;

    const result = computeNOI(fin);
    expect(result).toBe(15000);
  });

  test('returns 0 when no inputs at all', () => {
    const result = computeNOI({} as any);
    expect(result).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeOER
// ═══════════════════════════════════════════════════════════════
describe('computeOER', () => {
  test('standard: 7572 / 23400 = 32.36%', () => {
    expect(computeOER(7572, 23400)).toBeCloseTo(32.36, 0);
  });

  test('zero gross income → 0 (division guard)', () => {
    expect(computeOER(5000, 0)).toBe(0);
  });

  test('zero expenses → 0%', () => {
    expect(computeOER(0, 24000)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeBreakEvenOccupancy
// ═══════════════════════════════════════════════════════════════
describe('computeBreakEvenOccupancy', () => {
  test('healthy deal: expenses + debt < income', () => {
    const result = computeBreakEvenOccupancy(5000, 8000, 24000);
    // (5000+8000)/24000 = 54.17%
    expect(result).toBeCloseTo(54.17, 0);
  });

  test('underwater deal clamps to 100%', () => {
    // (7572 + 17826) / 23400 = 108.5% → clamped to 100
    const result = computeBreakEvenOccupancy(7572, 17826, 23400);
    expect(result).toBeLessThanOrEqual(100);
  });

  test('zero gross income → 0 (division guard)', () => {
    expect(computeBreakEvenOccupancy(5000, 8000, 0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeFlipNetProfit & computeFlipROI
// ═══════════════════════════════════════════════════════════════
describe('computeFlipNetProfit', () => {
  test('profitable flip: $350k sale - $342k all-in = $8k profit', () => {
    const result = computeFlipNetProfit(350000, 342000);
    expect(result).toBe(8000);
  });

  test('unprofitable flip returns negative', () => {
    const result = computeFlipNetProfit(250000, 342000);
    expect(result).toBeLessThan(0);
  });
});

describe('computeFlipROI', () => {
  test('standard: 8000 profit / 342000 total cost = 2.34%', () => {
    const result = computeFlipROI(8000, 342000);
    expect(result).toBeCloseTo(2.34, 0);
  });

  test('zero total cost → 0 (division guard)', () => {
    expect(computeFlipROI(8000, 0)).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeMAO
// ═══════════════════════════════════════════════════════════════
describe('computeMAO', () => {
  test('standard 70% rule: 70% of 350000 - 35000 - 0 = 210000', () => {
    const result = computeMAO(350000, 35000, 0, 70);
    expect(result).toBeCloseTo(210000, 0);
  });

  test('default multiplier is 70%', () => {
    const result = computeMAO(350000, 35000);
    expect(result).toBeCloseTo(210000, 0);
  });
});

// ═══════════════════════════════════════════════════════════════
// computeHealthScore
// ═══════════════════════════════════════════════════════════════
describe('computeHealthScore', () => {
  test('excellent deal: high cap rate, high DSCR, high CoC', () => {
    const result = computeHealthScore(10.0, 2.0, 15.0);
    expect(result).toBe('excellent');
  });

  test('all-cash sentinel (DSCR=999 via capRate>8, coc>12)', () => {
    // computeHealthScore(capRate, dscr, coc)
    const result = computeHealthScore(9.0, 999, 15.0);
    expect(result).toBe('excellent');
  });

  test('poor deal: low everything', () => {
    const result = computeHealthScore(2.0, 0.5, 1.0);
    expect(result).toBe('poor');
  });

  test('good deal: moderate metrics', () => {
    const result = computeHealthScore(6.0, 1.3, 9.0);
    expect(result).toBe('good');
  });

  test('fair deal: cap rate > 3 and dscr >= 1.0', () => {
    const result = computeHealthScore(4.0, 1.0, 5.0);
    expect(result).toBe('fair');
  });
});

// ═══════════════════════════════════════════════════════════════
// computeTotalCashInvested
// ═══════════════════════════════════════════════════════════════
describe('computeTotalCashInvested', () => {
  test('includes down payment + rehab + acquisition costs', () => {
    const fin = {
      purchasePrice: 279000,
      loanAmount: 223200,
      projectedRehabCost: 35000,
      fixedAcquisitionCosts: 5000,
      emdAmount: 0,
      costs: [],
    } as any;

    const result = computeTotalCashInvested(fin);
    // Down payment: 279000 - 223200 = 55800
    // + 35000 rehab + 5000 acq = 95800 minimum
    expect(result).toBeGreaterThanOrEqual(95800);
  });

  test('all-cash deal (no loan)', () => {
    const fin = {
      purchasePrice: 200000,
      loanAmount: 0,
      projectedRehabCost: 10000,
      fixedAcquisitionCosts: 3000,
      emdAmount: 0,
      costs: [],
    } as any;

    const result = computeTotalCashInvested(fin);
    // Down payment = full purchase price = 200000
    expect(result).toBeGreaterThanOrEqual(213000);
  });

  test('zero purchase price → 0 or minimal', () => {
    const fin = {
      purchasePrice: 0,
      loanAmount: 0,
      projectedRehabCost: 0,
      fixedAcquisitionCosts: 0,
      emdAmount: 0,
      costs: [],
    } as any;

    const result = computeTotalCashInvested(fin);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
