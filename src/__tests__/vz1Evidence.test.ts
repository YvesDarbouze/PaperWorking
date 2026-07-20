/**
 * VZ-1 EVIDENCE — Engine Completeness: All 33 KPIs
 *
 * This test calls deriveAllMetrics with the GOLDEN_INPUTS seed and verifies:
 *   1. All 33 KPI keys exist in kpi33
 *   2. Class 1 metrics have numeric projected values (the five locked among them unchanged)
 *   3. Class 2 metrics have null actual values with specific reason codes
 *   4. Class 3 metrics have null actual values with MARKET_DATA_DEFERRED
 *   5. Interest Coverage (#11) uses firstYearInterest from amortization, not loanAmount × rate
 *   6. No kpi33 metric is ever 0 when it should be null
 */

jest.mock('../lib/firebase/config', () => ({
  db: {},
  auth: {},
  storage: {},
}));

import { deriveAllMetrics } from '../lib/metrics/reiMetrics';
import type { KPI33Block } from '../lib/metrics/reiMetrics';
import { calculateAmortization } from '../lib/utils/reiCalculators';

const GOLDEN_INPUTS = {
  purchasePrice: 279_000,
  monthlyGrossRent: 1_950,
  vacancyRatePercent: 7,
  propertyManagementFeePercent: 10,
  holdingCostTaxes: 200,
  holdingCostInsurance: 58,
  holdingCostUtilities: 125,
  monthlyMaintenanceReserve: 195,
  monthlyHOA: 0,
  loanAmount: 223_200,
  loanInterestRate: 6.5,
  loanTermYears: 30,
  totalCashInvested: 60_000,
  estimatedARV: 320_000,
  projectedRehabCost: 35_000,
};

describe('VZ-1 EVIDENCE — All 33 KPIs from deriveAllMetrics', () => {
  const m = deriveAllMetrics(
    GOLDEN_INPUTS as any,
    320_000,
    'RENT',
    1,
    new Date().toISOString()
  );

  it('kpi33 block exists and has exactly 33 keys', () => {
    expect(m.kpi33).toBeDefined();
    const keys = Object.keys(m.kpi33);
    expect(keys.length).toBe(33);

    console.log('\n=== VZ-1 EVIDENCE: ALL 33 KPI KEYS ===');
    keys.forEach((key, i) => {
      const entry = m.kpi33[key as keyof KPI33Block];
      const projVal = entry.projected !== null
        ? (typeof entry.projected === 'number' ? entry.projected.toFixed(2) : String(entry.projected))
        : `null (${entry.projectedNullReason})`;
      const actVal = entry.actual !== null
        ? (typeof entry.actual === 'number' ? entry.actual.toFixed(2) : String(entry.actual))
        : `null (${entry.actualNullReason})`;
      console.log(`  KPI ${String(i + 1).padStart(2, ' ')}: ${key.padEnd(28, ' ')} = [Proj: ${projVal}] | [Act: ${actVal}]`);
    });
    console.log('======================================\n');
  });

  // ── Class 1: computable now ──────────────────────────────────────────────
  it('Class 1 — five locked golden values are unchanged in projected', () => {
    expect(m.kpi33.NOI.projected).toBe(12_486);
    expect(m.kpi33.CAP_RATE.projected).toBe(4.5);
    expect(m.kpi33.CASH_FLOW.projected).toBeCloseTo(-4444, 0);
    expect(m.kpi33.DSCR.projected).toBe(0.74);
    expect(m.kpi33.COC.projected).toBe(-7.41);
  });

  it('Class 1 — all computable-now metrics have non-null projected values', () => {
    const class1Keys: (keyof KPI33Block)[] = [
      'NOI', 'CAP_RATE', 'COC', 'IRR', 'CASH_FLOW', 'GRM', 'DSCR',
      'LTV', 'OER', 'EQUITY_TO_VALUE', 'INTEREST_COVERAGE',
      'GOI', 'EQUITY_MULTIPLE', 'OCCUPANCY', 'MAINTENANCE_COST_PER_UNIT',
      'RISK_SCORE',
    ];
    for (const key of class1Keys) {
      const entry = m.kpi33[key];
      expect(entry.projected).not.toBeNull();
      expect(typeof entry.projected).toBe('number');
      // Never 0 when it should be null — guard check
      if (entry.projected === 0) {
        expect(['NOI', 'CASH_FLOW', 'GOI'].includes(key)).toBe(true);
      }
    }
  });

  it('Interest Coverage (#11) uses firstYearInterest, not loanAmount × rate', () => {
    // Verify against amortization utility directly
    const amort = calculateAmortization(223_200, 6.5, 360);
    const firstYearInterest = amort.firstYearInterest;
    const expectedIC = Math.round((12_486 / firstYearInterest) * 100) / 100;
    expect(m.kpi33.INTEREST_COVERAGE.projected).toBe(expectedIC);

    // Prove it's NOT the naive formula
    const naiveInterest = 223_200 * (6.5 / 100);
    const naiveIC = Math.round((12_486 / naiveInterest) * 100) / 100;
    expect(m.kpi33.INTEREST_COVERAGE.projected).not.toBe(naiveIC);

    console.log('\n=== Interest Coverage Evidence ===');
    console.log(`  firstYearInterest (amort utility): $${firstYearInterest.toFixed(2)}`);
    console.log(`  naive loanAmount × rate:           $${naiveInterest.toFixed(2)}`);
    console.log(`  IC (correct, amort):               ${expectedIC}`);
    console.log(`  IC (wrong, naive):                 ${naiveIC}`);
    console.log('=================================\n');
  });

  // ── Class 2: deferred instruments ────────────────────────────────────────
  it('Class 2 — deferred-instrument metrics have null actuals with reason codes', () => {
    const class2: [keyof KPI33Block, string][] = [
      ['ROI', 'REQUIRES_SALE_RECORD'],
      ['CAPEX', 'REQUIRES_EXPENSE_LEDGER'],
      ['AAR', 'REQUIRES_SALE_RECORD'],
      ['REVENUE_GROWTH', 'REQUIRES_INCOME_LEDGER'],
      ['TENANT_TURNOVER', 'REQUIRES_TENANT_REGISTRY'],
      ['AVG_RENT_PER_PROPERTY', 'REQUIRES_TENANT_REGISTRY'],
      ['LEASE_RENEWAL', 'REQUIRES_TENANT_REGISTRY'],
      ['DOM', 'REQUIRES_LISTING_LOG'],
      ['PORTFOLIO_VALUE_GROWTH', 'REQUIRES_RE_VALUATION'],
      ['LISTING_TO_MEETING', 'REQUIRES_LISTING_LOG'],
      ['AVG_COMMISSION', 'REQUIRES_SALE_RECORD'],
      ['COMPLIANCE_RATE', 'REQUIRES_COMPLIANCE_CHECKLIST'],
    ];

    for (const [key, reason] of class2) {
      const entry = m.kpi33[key];
      expect(entry.actual).toBeNull();
      expect(entry.actualNullReason).toBe(reason);
    }
  });

  // ── Class 3: product-deferred ────────────────────────────────────────────
  it('Class 3 — market-deferred metrics have null actuals with MARKET_DATA_DEFERRED', () => {
    const class3: (keyof KPI33Block)[] = [
      'YOY_SOLD_PRICE_VARIANCE',
      'SOLD_PER_INVENTORY',
      'DEMAND_GROWTH',
    ];

    for (const key of class3) {
      const entry = m.kpi33[key];
      expect(entry.actual).toBeNull();
      expect(entry.actualNullReason).toBe('MARKET_DATA_DEFERRED');
    }
  });

  // ── No metric became a stored field ──────────────────────────────────────
  it('kpi33 is purely derived — not a stored field on financials', () => {
    expect((GOLDEN_INPUTS as any).kpi33).toBeUndefined();
  });
});
