/**
 * Deal Analyzer Calculation Engine Unit Tests
 * PaperWorking (paperworking.co)
 *
 * Verifies exact reproduction of Worked Examples (Rental, Flip, BRRRR),
 * Edge Cases, Precision Rules, Amortization Schedule, Pro Forma Year N Profit,
 * IRR Solver, and Regression Snapshots.
 */

import {
  calculateRentalDeal,
  calculateFlipDeal,
  calculateBRRRRDeal,
  calculateAmortizationSchedule,
  calculateIRR,
  calculateEquityMultiple,
  calculateProFormaProjections,
  RentalDealInputs,
  FlipDealInputs,
  BRRRRDealInputs,
} from '@/lib/deal-analyzer/calcEngine';

describe('Deal Analyzer Calculation Engine (calcEngine.ts)', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. WORKED EXAMPLE 1 — RENTAL (BUY & HOLD)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Worked Example 1 — Rental', () => {
    const rentalInputs: RentalDealInputs = {
      purchasePrice: 150000,
      monthlyRent: 1650,
      propertyTaxesAnnual: 1800,
      insuranceAnnual: 1200,
      vacancyRate: 5,
      repairsPercent: 5,
      capexPercent: 5,
      propertyMgmtPercent: 10,
      downPaymentPercent: 25,
      interestRate: 6.5,
      loanTermYears: 30,
      closingCostsPercent: 3,
    };

    it('reproduces exact canonical numbers for Rental strategy', () => {
      const res = calculateRentalDeal(rentalInputs);

      // EGI = $19,800 * (1 - 0.05) = $18,810
      expect(res.egi).toBe(18810);

      // OpEx = Taxes ($1,800) + Insurance ($1,200) + Repairs ($990) + CapEx ($990) + Mgmt ($1,881) = $6,861
      expect(res.operatingExpensesAnnual).toBe(6861);

      // NOI = $18,810 - $6,861 = $11,949
      expect(res.noi).toBe(11949);

      // P&I payment = $711.08/mo
      expect(res.monthlyPI).toBeCloseTo(711.08, 2);

      // Annual Debt Service = $8,532.92
      expect(res.annualDebtService).toBeCloseTo(8532.92, 1);

      // Cash Flow = $11,949 - $8,532.92 = $3,416.08/yr ($284.67/mo)
      expect(res.annualCashFlow).toBeCloseTo(3416.08, 1);
      expect(res.monthlyCashFlow).toBeCloseTo(284.67, 1);

      // Cash Invested = $37,500 down + $4,500 closing = $42,000
      expect(res.totalCashInvested).toBe(42000);

      // Cash-on-Cash Return = 8.13% ± 0.05
      expect(res.cashOnCashReturn).toBeCloseTo(8.13, 1);

      // Cap Rate = 7.97% ± 0.05
      expect(res.capRate).toBeCloseTo(7.97, 1);

      // GRM = 7.58 ± 0.01
      expect(res.grm).toBeCloseTo(7.58, 2);

      // DSCR Commercial (NOI ÷ Debt Service) = 1.40 ± 0.01
      expect(res.dscrCommercial).toBeCloseTo(1.40, 2);
      expect(res.dscrCommercialLabel).toBe('DSCR (NOI ÷ debt service)');

      // DSCR Residential (Rent ÷ PITIA) = 1.63 ± 0.01
      expect(res.dscrResidential).toBeCloseTo(1.63, 2);
      expect(res.dscrResidentialLabel).toBe('DSCR (rent ÷ PITIA)');

      // Break-even Occupancy = 77.7% ± 0.1
      expect(res.breakEvenOccupancy).toBeCloseTo(77.7, 1);

      // Rent-to-price and Price-to-rent labels
      expect(res.rentToPriceMonthlyLabel).toBe('Rent-to-price (monthly)');
      expect(res.priceToRentAnnualLabel).toBe('Price-to-rent (annual)');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. WORKED EXAMPLE 2 — FIX & FLIP
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Worked Example 2 — Fix & Flip', () => {
    const flipInputs: FlipDealInputs = {
      purchasePrice: 120000,
      arv: 220000,
      rehabBudget: 40000,
      holdPeriodMonths: 6,
      hardMoneyLTC: 85,
      hardMoneyInterestRate: 11.5,
      hardMoneyPoints: 2,
      buyClosingCostsPercent: 2,
      sellingCostsPercent: 8,
      monthlyHoldingCosts: 600,
    };

    it('reproduces exact canonical numbers for Fix & Flip strategy', () => {
      const res = calculateFlipDeal(flipInputs);

      // Hard Money Loan = $136,000
      expect(res.hardMoneyLoanAmount).toBe(136000);

      // LTARV = 61.8% (passes <= 70% check)
      expect(res.ltarv).toBeCloseTo(61.8, 1);
      expect(res.isLTARVBreached).toBe(false);

      // Financing Costs: Points = $2,720, Interest = $7,820, Total = $10,540
      expect(res.financingPointsCost).toBe(2720);
      expect(res.financingInterestCost).toBe(7820);
      expect(res.totalFinancingCosts).toBe(10540);

      // Buy Closing = $2,400
      expect(res.buyClosingCosts).toBe(2400);

      // Holding = $3,600 ($600 * 6)
      expect(res.holdingCostsTotal).toBe(3600);

      // Selling = $17,600 (8% of $220k)
      expect(res.sellingCosts).toBe(17600);

      // Total Cost = $194,140
      expect(res.totalProjectCost).toBe(194140);

      // Profit = $25,860 ± $1
      expect(res.profit).toBeCloseTo(25860, 0);

      // Total Cash Invested = $40,540 ($24,000 down + $2,400 closing + $10,540 financing + $3,600 holding)
      expect(res.totalCashInvested).toBe(40540);

      // ROI = 63.8% ± 0.1
      expect(res.roi).toBeCloseTo(63.8, 1);

      // MAO 70% = $114,000 ± $1
      expect(res.mao70).toBeCloseTo(114000, 0);

      // Verdict FAIL (purchase $120,000 exceeds MAO $114,000)
      expect(res.isOverMAO).toBe(true);
      expect(res.verdict).toBe('FAIL');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. WORKED EXAMPLE 3 — BRRRR
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Worked Example 3 — BRRRR', () => {
    const brrrrInputs: BRRRRDealInputs = {
      purchasePrice: 100000,
      rehabBudget: 30000,
      arv: 180000,
      monthlyRentPostRehab: 1800,
      bridgeLTC: 85,
      bridgeInterestRate: 11.5,
      bridgePoints: 2,
      holdPeriodMonths: 6,
      monthlyHoldingCosts: 475,
      buyClosingCostsPercent: 2,
      refiLTV: 75,
      refiInterestRate: 8.5,
      refiTermYears: 30,
      refiClosingCostsPercent: 2,
      vacancyRate: 5,
      propertyTaxesAnnual: 1800,
      insuranceAnnual: 1200,
      repairsPercent: 5,
      capexPercent: 5,
      propertyMgmtPercent: 10,
    };

    it('reproduces exact canonical numbers for BRRRR strategy', () => {
      const res = calculateBRRRRDeal(brrrrInputs);

      // Bridge Loan = $110,500
      expect(res.bridgeLoanAmount).toBe(110500);

      // Bridge Points = $2,210, Interest = $6,353.75
      expect(res.bridgePointsCost).toBe(2210);
      expect(res.bridgeInterestCost).toBe(6353.75);

      // Initial Cash Invested = $32,913.75
      expect(res.initialCashInvested).toBe(32913.75);

      // Refi Loan = $135,000 (75% of $180k)
      expect(res.newRefiLoanAmount).toBe(135000);

      // Refi Closing = $2,700
      expect(res.refiClosingCosts).toBe(2700);

      // Cash Out = $21,800 ± $1
      expect(res.cashOut).toBeCloseTo(21800, 0);

      // Cash Left in Deal = $11,113.75 ± $1
      expect(res.cashLeftInDeal).toBeCloseTo(11113.75, 1);

      // Post-Refi P&I = $1,038.03/mo
      expect(res.postRefiMonthlyPI).toBeCloseTo(1038.03, 2);

      // Post-Refi NOI = $13,308
      expect(res.postRefiNOI).toBe(13308);

      // Post-Refi Cash Flow = $851.60/yr
      expect(res.postRefiAnnualCashFlow).toBeCloseTo(851.60, 1);

      // Post-Refi CoC = 7.7% ± 0.1
      expect(res.postRefiCoC).toBeCloseTo(7.7, 1);

      // Cost Basis = $143,413.75 (79.7% of ARV)
      expect(res.costBasis).toBe(143413.75);
      expect(res.costBasisPctARV).toBeCloseTo(79.7, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. EDGE CASES & PRECISION RULES
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Edge Cases & Precision Rules', () => {

    it('handles Cash Purchase (isCashPurchase = true, 0 debt service)', () => {
      const res = calculateRentalDeal({
        purchasePrice: 100000,
        monthlyRent: 1000,
        isCashPurchase: true,
      });
      expect(res.loanAmount).toBe(0);
      expect(res.monthlyPI).toBe(0);
      expect(res.annualDebtService).toBe(0);
      expect(res.downPayment).toBe(100000);
      expect(res.dscrCommercial).toBe(Infinity);
    });

    it('handles 100% LTC hard money / bridge loan', () => {
      const res = calculateFlipDeal({
        purchasePrice: 100000,
        arv: 150000,
        rehabBudget: 20000,
        hardMoneyLTC: 100,
      });
      expect(res.hardMoneyLoanAmount).toBe(120000); // 100% of $120k
      expect(res.downPayment).toBe(0);
    });

    it('handles zero rent (monthlyRent = 0)', () => {
      const res = calculateRentalDeal({
        purchasePrice: 100000,
        monthlyRent: 0,
      });
      expect(res.grossAnnualRent).toBe(0);
      expect(res.egi).toBe(0);
      expect(res.grm).toBe(0);
    });

    it('handles 100% vacancy rate', () => {
      const res = calculateRentalDeal({
        purchasePrice: 100000,
        monthlyRent: 1000,
        vacancyRate: 100,
      });
      expect(res.vacancyLossAnnual).toBe(12000);
      expect(res.egi).toBe(0);
      expect(res.noi).toBeLessThan(0);
    });

    it('handles negative cash flow', () => {
      const res = calculateRentalDeal({
        purchasePrice: 200000,
        monthlyRent: 800,
        downPaymentPercent: 5,
        interestRate: 8,
      });
      expect(res.annualCashFlow).toBeLessThan(0);
      expect(res.cashOnCashReturn).toBeLessThan(0);
    });

    it('reports Infinity / all capital returned when cashLeftInDeal <= 0 & cashFlow > 0', () => {
      const brrrrRes = calculateBRRRRDeal({
        purchasePrice: 100000,
        rehabBudget: 20000,
        arv: 250000, // Very high ARV -> large cash-out
        monthlyRentPostRehab: 2500,
        refiLTV: 75,
      });
      expect(brrrrRes.cashLeftInDeal).toBeLessThanOrEqual(0);
      expect(brrrrRes.postRefiAnnualCashFlow).toBeGreaterThan(0);
      expect(brrrrRes.postRefiCoC).toBe(Infinity);
    });

    it('returns null on IRR non-convergence or invalid cash flow series', () => {
      // All positive cash flows -> no solution
      expect(calculateIRR([100, 200, 300])).toBeNull();
      // All negative cash flows -> no solution
      expect(calculateIRR([-100, -200, -300])).toBeNull();
      // Invalid input
      expect(calculateIRR([])).toBeNull();
    });

    it('computes IRR correctly for standard cash flow series', () => {
      // -$100k initial, $10k, $10k, $10k, $10k, $120k exit -> ~12.2% IRR
      const irr = calculateIRR([-100000, 10000, 10000, 10000, 10000, 120000]);
      expect(irr).not.toBeNull();
      expect(irr!).toBeGreaterThan(10);
      expect(irr!).toBeLessThan(15);
    });

    it('computes Equity Multiple correctly', () => {
      expect(calculateEquityMultiple(50000, 150000, 100000)).toBe(2.0); // ($50k dist + $150k equity) / $100k
    });

    it('proves Year N (not Year N+1) cash flows are used in Pro Forma profit-if-sold', () => {
      const projections = calculateProFormaProjections({
        purchasePrice: 150000,
        initialGrossAnnualRent: 19800,
        initialAnnualOpEx: 6861,
        initialAnnualDebtService: 8532.92,
        initialCashInvested: 42000,
        loanAmount: 112500,
        interestRate: 6.5,
        loanTermYears: 30,
        rentGrowthPercent: 3,
        expenseGrowthPercent: 2,
        appreciationPercent: 3,
        holdYears: 5,
      });

      expect(projections).toHaveLength(5);

      // Year 1: check cumulative cash flow matches Year 1 cash flow
      expect(projections[0].cumulativeCashFlow).toBeCloseTo(projections[0].cashFlow, 2);

      // Year 2: cumulative cash flow = Year 1 + Year 2
      expect(projections[1].cumulativeCashFlow).toBeCloseTo(projections[0].cashFlow + projections[1].cashFlow, 2);

      // Profit if sold in Year 3 uses Year 3 cumulative cash flow and Year 3 property value
      const yr3 = projections[2];
      expect(yr3.profitIfSold).toBeCloseTo(yr3.cumulativeCashFlow + yr3.netExitProceeds - 42000, 2);
    });

    it('proves amortization schedule balance reaches $0 at term end and total interest matches payment*n - principal', () => {
      const amort = calculateAmortizationSchedule(100000, 6.0, 360);
      expect(amort.schedule).toHaveLength(360);

      const lastPeriod = amort.schedule[359];
      expect(lastPeriod.remainingBalance).toBe(0);

      const expectedTotalInterest = (amort.monthlyPayment * 360) - 100000;
      expect(amort.totalInterestPaid).toBeCloseTo(expectedTotalInterest, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. REGRESSION SNAPSHOTS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Regression Guard Snapshots', () => {
    it('matches Rental deal full results snapshot', () => {
      const res = calculateRentalDeal({
        purchasePrice: 200000,
        monthlyRent: 2000,
        propertyTaxesAnnual: 2400,
        insuranceAnnual: 1200,
        downPaymentPercent: 20,
        interestRate: 6.0,
        loanTermYears: 30,
      });
      expect(res).toMatchSnapshot();
    });

    it('matches Flip deal full results snapshot', () => {
      const res = calculateFlipDeal({
        purchasePrice: 150000,
        arv: 280000,
        rehabBudget: 50000,
        holdPeriodMonths: 6,
        hardMoneyLTC: 85,
        hardMoneyInterestRate: 12,
        hardMoneyPoints: 2,
        buyClosingCostsPercent: 2,
        sellingCostsPercent: 7,
        monthlyHoldingCosts: 500,
      });
      expect(res).toMatchSnapshot();
    });

    it('matches BRRRR deal full results snapshot', () => {
      const res = calculateBRRRRDeal({
        purchasePrice: 120000,
        rehabBudget: 35000,
        arv: 210000,
        monthlyRentPostRehab: 2100,
        bridgeLTC: 85,
        bridgeInterestRate: 11.5,
        bridgePoints: 2,
        refiLTV: 75,
        refiInterestRate: 8.0,
        refiTermYears: 30,
      });
      expect(res).toMatchSnapshot();
    });
  });

});
