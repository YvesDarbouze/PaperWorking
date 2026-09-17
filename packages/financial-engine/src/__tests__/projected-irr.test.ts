import {
  computeProjectedIrr,
  calculateProjectedIrrDetails,
  canonicalDemoDeal,
  reconcileAcquisitionUnderwriting,
} from '../index.js';

describe('Projected IRR Canonical Engine Tests (True DCF Equity IRR)', () => {
  describe('1. Canonical Shared Demo Deal (Hand-Verifiable to 3.8% ± 0.1pt)', () => {
    it('calculates the exact hand-verifiable cash flow vector and metrics', () => {
      const details = calculateProjectedIrrDetails({
        totalCashInvested: canonicalDemoDeal.cashRequired,
        annualPreTaxCashFlow: canonicalDemoDeal.annualCashFlow,
        purchasePrice: canonicalDemoDeal.purchasePrice,
        loanAmount: canonicalDemoDeal.loanAmount,
        interestRatePct: canonicalDemoDeal.interestRatePct,
        amortizationYears: canonicalDemoDeal.amortizationYears,
        holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
        annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
        sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
      });

      // 1. Initial cash equity outlay at t0
      expect(details.cashFlowVector[0]).toBe(-205400);

      // 2. Annual operating cash flows for years 1-4
      expect(details.cashFlowVector[1]).toBe(8557);
      expect(details.cashFlowVector[2]).toBe(8557);
      expect(details.cashFlowVector[3]).toBe(8557);
      expect(details.cashFlowVector[4]).toBe(8557);

      // 3. Exit valuation: $520,000 * (1 + 0.03)^5 = $602,822.52 -> $602,823
      expect(details.exitValue).toBe(602823);

      // 4. Selling costs at 6%: $602,823 * 0.06 = $36,169.38 -> $36,169
      expect(details.sellingCostsAmount).toBe(36169);

      // 5. Remaining loan balance at Month 60 (30-year 6.5% amortized loan of $390,000)
      expect(details.amortizedLoanBalanceAtExit).toBe(365083);

      // 6. Net sale proceeds: $602,823 - $365,083 - $36,169 = $201,571
      expect(details.netSaleProceeds).toBe(201571);

      // 7. Final year cash flow: Operating ($8,557) + Net Proceeds ($201,571) = $210,128
      expect(details.cashFlowVector[5]).toBe(210128);

      // 8. True DCF Equity IRR: exactly 3.8% (3.82%)
      expect(details.projectedIrrPct).toBe(3.8);
      expect(
        computeProjectedIrr({
          totalCashInvested: canonicalDemoDeal.cashRequired,
          annualPreTaxCashFlow: canonicalDemoDeal.annualCashFlow,
          purchasePrice: canonicalDemoDeal.purchasePrice,
          loanAmount: canonicalDemoDeal.loanAmount,
          interestRatePct: canonicalDemoDeal.interestRatePct,
          amortizationYears: canonicalDemoDeal.amortizationYears,
          holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
          annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
          sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
        }),
      ).toBe(3.8);
    });

    it('matches reconcileAcquisitionUnderwriting output for canonical demo deal', () => {
      const reconciled = reconcileAcquisitionUnderwriting({
        purchasePrice: canonicalDemoDeal.purchasePrice,
        rehabBudget: canonicalDemoDeal.rehabBudget,
        estimatedARV: canonicalDemoDeal.estimatedARV,
        targetLtvPct: canonicalDemoDeal.targetLtvPct,
        buyerClosingCostsPct: canonicalDemoDeal.buyerClosingCostsPct,
        interestRatePct: canonicalDemoDeal.interestRatePct,
        amortizationYears: canonicalDemoDeal.amortizationYears,
        grossRentMonthly: canonicalDemoDeal.grossRentMonthly,
        vacancyRatePct: canonicalDemoDeal.vacancyRatePct,
        operatingExpensesAnnual: canonicalDemoDeal.operatingExpensesAnnual,
        operatingExpenseRatioPct: canonicalDemoDeal.operatingExpenseRatioPct,
        holdPeriodYears: canonicalDemoDeal.holdPeriodYears,
        annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
        sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
        terminalValueMethod: canonicalDemoDeal.terminalValueMethod,
      });

      expect(reconciled.totalCostBasis).toBe(595400);
      expect(reconciled.loanAmount).toBe(390000);
      expect(reconciled.cashRequired).toBe(205400);
      expect(reconciled.grossOperatingIncome).toBe(59280);
      expect(reconciled.netOperatingIncome).toBe(38138);
      expect(reconciled.annualNetCashFlow).toBe(8557);
      expect(reconciled.capRateOnCost).toBe(6.4);
      expect(reconciled.cashOnCashReturnPct).toBe(4.2);
      expect(reconciled.projectedIrrPct).toBe(3.8);
    });
  });

  describe('2. Strong Value-Add Deal (Target IRR: 18.4%)', () => {
    it('solves to 18.4% for high-growth value-add scenario', () => {
      const strongDeal = {
        totalCashInvested: 1050000,
        annualPreTaxCashFlow: 84000, // 8.0% Cash-on-Cash
        purchasePrice: 3500000,
        loanAmount: 2625000, // 75% LTV
        interestRatePct: 6.0,
        amortizationYears: 30,
        holdPeriodYears: 5,
        annualAppreciationPct: 5.4,
        sellingCostsPct: 6.0,
      };

      const details = calculateProjectedIrrDetails(strongDeal);

      // Verify cash flows
      expect(details.cashFlowVector[0]).toBe(-1050000);
      expect(details.cashFlowVector[1]).toBe(84000);
      expect(details.exitValue).toBe(4552722);
      expect(details.amortizedLoanBalanceAtExit).toBe(2442677);
      expect(details.netSaleProceeds).toBe(1836882);
      expect(details.cashFlowVector[5]).toBe(1920882);

      // Solves to 18.4%
      expect(details.projectedIrrPct).toBe(18.4);
      expect(computeProjectedIrr(strongDeal)).toBe(18.4);
    });
  });

  describe('3. Negative-Flow / Non-Convergent Deal (Returns null honestly)', () => {
    it('returns null when all cash flows are negative (no positive return)', () => {
      const negativeDeal = {
        totalCashInvested: 100000,
        annualPreTaxCashFlow: -5000,
        purchasePrice: 400000,
        loanAmount: 350000,
        interestRatePct: 7.0,
        amortizationYears: 30,
        holdPeriodYears: 5,
        annualAppreciationPct: -10.0,
        sellingCostsPct: 10.0,
      };

      const result = computeProjectedIrr(negativeDeal);
      expect(result).toBeNull();

      const details = calculateProjectedIrrDetails(negativeDeal);
      expect(details.projectedIrrPct).toBeNull();
    });

    it('returns null when cash invested is zero or negative', () => {
      const zeroEquityDeal = {
        totalCashInvested: 0,
        annualPreTaxCashFlow: 10000,
        purchasePrice: 300000,
        loanAmount: 300000,
        interestRatePct: 6.0,
        amortizationYears: 30,
      };

      expect(computeProjectedIrr(zeroEquityDeal)).toBeNull();
    });

    it('returns null when hold period is zero or negative', () => {
      const zeroHoldDeal = {
        totalCashInvested: 100000,
        annualPreTaxCashFlow: 10000,
        purchasePrice: 300000,
        loanAmount: 200000,
        interestRatePct: 6.0,
        amortizationYears: 30,
        holdPeriodYears: 0,
      };

      expect(computeProjectedIrr(zeroHoldDeal)).toBeNull();
    });
  });
});
