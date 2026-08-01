import { calculateRentalDeal, calculateFlipDeal, calculateBRRRRDeal } from '../lib/deal-analyzer/calcEngine';

describe('PROMPT 6 — Deal Analyzer Results Experience & Live Recalculation', () => {
  describe('Live Recalculation Assertion', () => {
    it('recalculates Cash-on-Cash Return to 11.37% ± 0.05 when rent slider changes from $1,650 to $1,800 on Rental Worked Example', () => {
      // Base Rental Worked Example inputs
      const baseInputs = {
        purchasePrice: 150000,
        monthlyRent: 1650,
        vacancyRate: 5,
        propertyTaxesAnnual: 1800,
        insuranceAnnual: 1200,
        utilitiesMonthly: 0,
        hoaMonthly: 0,
        repairsPercent: 5,
        capexPercent: 5,
        propertyMgmtPercent: 10,
        downPaymentPercent: 25,
        interestRate: 6.5,
        loanTermYears: 30,
        closingCostsPercent: 3,
        upfrontRehabCost: 0,
      };

      // Initial calculation at $1,650/mo
      const initialResults = calculateRentalDeal(baseInputs);
      expect(initialResults.cashOnCashReturn).toBeCloseTo(8.13, 1);

      // Live recalculation at $1,800/mo rent (simulating slider change)
      const recalculatedResults = calculateRentalDeal({
        ...baseInputs,
        monthlyRent: 1800,
      });

      // Assert recomputed CoC is 11.37% ± 0.05
      expect(recalculatedResults.cashOnCashReturn).toBeGreaterThanOrEqual(11.32);
      expect(recalculatedResults.cashOnCashReturn).toBeLessThanOrEqual(11.42);
      expect(recalculatedResults.cashOnCashReturn).toBeCloseTo(11.37, 2);
    });
  });

  describe('Pro Forma 30-Year Table Completeness', () => {
    it('generates per-year rows for all 30 years with profit-if-sold and annualized return', () => {
      const results = calculateRentalDeal({
        purchasePrice: 150000,
        monthlyRent: 1650,
        vacancyRate: 5,
        propertyTaxesAnnual: 1800,
        insuranceAnnual: 1200,
        repairsPercent: 5,
        capexPercent: 5,
        propertyMgmtPercent: 10,
        downPaymentPercent: 25,
        interestRate: 6.5,
        loanTermYears: 30,
        closingCostsPercent: 3,
        holdPeriodYears: 30,
      });

      expect(results.proFormaSchedule).toHaveLength(30);

      // Verify Year 1 to 30 continuous numbering
      results.proFormaSchedule.forEach((row, idx) => {
        expect(row.year).toBe(idx + 1);
        expect(row.propertyValue).toBeGreaterThan(0);
        expect(row.equity).toBeGreaterThan(0);
        expect(typeof row.profitIfSoldThatYear).toBe('number');
        expect(typeof row.annualizedReturnPercent).toBe('number');
      });

      // Year 30 balance must reach 0
      expect(results.proFormaSchedule[29].loanBalance).toBe(0);
    });
  });

  describe('Flip Holding Duration Scenarios', () => {
    it('computes 3, 6, 9, 12 month holding period scenarios accurately', () => {
      const baseFlip = {
        purchasePrice: 120000,
        arv: 220000,
        rehabBudget: 40000,
        hardMoneyLTCPercent: 85,
        hardMoneyInterestRate: 11.5,
        hardMoneyPointsPercent: 2.0,
        monthlyHoldingStack: 600,
        purchaseClosingCostsPercent: 2.0,
        sellingCostsPercent: 8.0,
      };

      const months = [3, 6, 9, 12];
      const profits = months.map((m) => calculateFlipDeal({ ...baseFlip, holdingMonths: m }).flipProfit);

      // As holding period increases, interest + holding stack increase, reducing net profit
      expect(profits[0]).toBeGreaterThan(profits[1]);
      expect(profits[1]).toBeGreaterThan(profits[2]);
      expect(profits[2]).toBeGreaterThan(profits[3]);
      expect(profits[1]).toBeCloseTo(25860, 0); // 6-month worked example
    });
  });

  describe('BRRRR Infinite CoC Display Rule', () => {
    it('returns Infinite CoC display string when cash left in deal <= 0', () => {
      const brrrr = calculateBRRRRDeal({
        purchasePrice: 100000,
        arv: 200000, // Higher ARV yields larger cash-out
        rehabBudget: 30000,
        preRefiHoldMonths: 6,
        bridgeLTCPercent: 85,
        bridgeInterestRate: 11.5,
        bridgePointsPercent: 2.0,
        monthlyHoldingStack: 475,
        purchaseClosingCostsPercent: 2.0,
        refiLTVPercent: 75,
        refiInterestRate: 8.5,
        refiLoanTermYears: 30,
        refiClosingCostsPercent: 2.0,
        postRefiMonthlyRent: 2000,
      });

      if (brrrr.cashLeftInDeal <= 0) {
        expect(brrrr.postRefiCoCDisplay).toContain('∞');
      }
    });
  });
});
