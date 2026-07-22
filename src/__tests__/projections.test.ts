import { deriveAllMetrics, computeIRR } from '../lib/metrics/reiMetrics';
import type { ProjectFinancials } from '@/types/schema';

describe('AQ-16 Projections Engine Unit Tests', () => {
  const DEMO_FINANCIALS: ProjectFinancials = {
    purchasePrice: 279000,
    estimatedARV: 320000,
    projectedRehabCost: 35000,
    financingType: 'Financed',
    downPaymentPercent: 20,
    loanInterestRate: 6.5,
    loanTermYears: 30,
    loanAmount: 223200,
    monthlyGrossRent: 1950,
    vacancyRatePercent: 7,
    tax: 200,
    insurance: 58,
    utilities: 125,
    management_pct: 10,
    maintenance_pct: 10,
    totalCashInvested: 60000, // overridden for exact cash basis matching
    costs: [],
  };

  describe('AC1: Year-5 equity hand-checks (RENT strategy)', () => {
    it('calculates Year-5 property value, remaining loan balance, and equity correctly', () => {
      const metrics = deriveAllMetrics(DEMO_FINANCIALS, undefined, 'RENT', 1);
      
      const rentProjections = metrics.projections?.rentProjections;
      expect(rentProjections).toBeDefined();
      expect(rentProjections!.length).toBe(10);

      const yr5 = rentProjections![4]; // Year 5 is index 4 (1-indexed years 1..10)
      expect(yr5.year).toBe(5);

      // Value Year 5: 279000 * 1.03^5 = 323437.47 -> 323437
      expect(Math.round(yr5.propertyValue)).toBe(323437);

      // Remaining Loan Balance: amortization after 60 payments (5 years) -> approx 208940
      expect(Math.round(yr5.loanBalance)).toBe(208940);

      // Equity: 323437.47 - 208939.73 = 114497.74 -> 114498
      expect(Math.round(yr5.equity)).toBe(114498);
    });
  });

  describe('AC2: 90 to 270 days profit delta equals accrued holding costs (SALE strategy)', () => {
    it('verifies that profit delta matches accrued holding costs exactly', () => {
      // Create a flip project with a clear holding cost structure
      const flipFinancials: ProjectFinancials = {
        purchasePrice: 200000,
        projectedSalePrice: 300000,
        projectedRehabCost: 40000,
        fixedAcquisitionCosts: 5000,
        loanAmount: 160000,
        loanInterestRate: 8.0, // interest-only or amortizing, burn rate calculated
        loanTermYears: 30,
        holdingCostTaxes: 150, // monthly
        holdingCostInsurance: 50, // monthly
        holdingCostUtilities: 100, // monthly
        totalCashInvested: 50000,
        estimatedARV: 300000,
        costs: [],
      };

      const customPeriods = [90, 270];
      const metrics = deriveAllMetrics(flipFinancials, undefined, 'SALE', 1, null, customPeriods);

      const saleProjections = metrics.projections?.saleProjections;
      expect(saleProjections).toBeDefined();
      expect(saleProjections!.length).toBe(2);

      const p90 = saleProjections!.find(p => p.days === 90)!;
      const p270 = saleProjections!.find(p => p.days === 270)!;

      expect(p90).toBeDefined();
      expect(p270).toBeDefined();

      const profitDelta = p90.netProfit - p270.netProfit;
      const holdingCostsDelta = p270.accruedHoldingCosts - p90.accruedHoldingCosts;

      // Net profit difference between 90 and 270 days must EXACTLY equal the accrued holding costs of those 180 days
      expect(profitDelta).toBeCloseTo(holdingCostsDelta, 2);
    });
  });

  describe('AC3: IRR returns a value for the DEMO_FINANCIALS negative-cash-flow series', () => {
    it('converges on a valid IRR value despite negative annual cash flow', () => {
      const metrics = deriveAllMetrics(DEMO_FINANCIALS, undefined, 'RENT', 1);
      
      // Annual cash flow is negative (-370 * 12 = -4443)
      expect(metrics.annualCashFlow).toBeLessThan(0);

      // IRR solver must successfully converge and return a positive percentage rate
      expect(metrics.irr).not.toBeNull();
      expect(metrics.irr).toBeGreaterThan(0);
      expect(metrics.irr).toBeLessThan(100);

      // Verify each rent projection year IRR-to-date
      const rentProjections = metrics.projections?.rentProjections;
      expect(rentProjections).toBeDefined();
      
      // For Evergreen Terrace, Year 1 to 4 should have null/negative IRR-to-date because exit proceeds are small,
      // but by Year 5 the appreciation gives enough proceeds to yield a positive IRR-to-date.
      const yr5 = rentProjections![4];
      expect(yr5.irrToDate).not.toBeNull();
      expect(yr5.irrToDate).toBeGreaterThan(0);
    });
  });
});
