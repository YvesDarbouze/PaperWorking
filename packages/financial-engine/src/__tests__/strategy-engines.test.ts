import {
  computeShortTermRentalMetrics,
  computeFixAndFlipMetrics,
  computeBrrrrMetrics,
  computeCommercialMetrics,
  computeWholesalingMetrics,
  computeDealStructuringMetrics,
  evaluatePurchaseCriteria,
} from '../strategy-engines.js';
import { reconcileAcquisitionUnderwriting } from '../acquisition-engine.js';

describe('Strategy Calculation Engines', () => {
  describe('computeFixAndFlipMetrics', () => {
    it('accurately computes flip holding costs, basis, net profits, and annualized ROI', () => {
      const result = computeFixAndFlipMetrics({
        purchasePrice: 300000,
        rehabBudget: 50000,
        buyerClosingCosts: 6000,
        estimatedARV: 450000,
        holdPeriodMonths: 6,
        sellingCostsPct: 6.0,
        monthlyDebtService: 2000,
        monthlyHoldingCosts: 500,
        hardMoneyPoints: 2.0,
        loanAmount: 240000,
      });

      // Holding costs: debt ($12,000) + operations ($3,000) + points (2% on $240k = $4,800) = $19,800
      expect(result.holdingCostDebtTotal).toBe(12000);
      expect(result.holdingCostOperationsTotal).toBe(3000);
      expect(result.loanOriginationPointsAmount).toBe(4800);
      expect(result.totalHoldingCosts).toBe(19800);

      // Basis: 300k + 6k + 50k + 19.8k = 375,800
      expect(result.totalCostBasis).toBe(375800);

      // Net proceeds: 450,000 - 27,000 (6%) = 423,000
      expect(result.estimatedSellingCosts).toBe(27000);
      expect(result.netSalesProceeds).toBe(423000);

      // Net profit: 423,000 - 375,800 = 47,200
      expect(result.netFlipProfit).toBe(47200);
      expect(result.profitMarginOnArvPct).toBe(10.5);
      expect(result.isProfitable).toBe(true);

      // Short-term capital gains tax projection (25% default bracket)
      // Tax: $47,200 * 25% = $11,800. After-tax profit = $35,400.
      expect(result.shortTermTaxRatePct).toBe(25.0);
      expect(result.estimatedShortTermTax).toBe(11800);
      expect(result.afterTaxNetFlipProfit).toBe(35400);

      // Total cash invested = 375,800 - 240,000 = 135,800
      // Annualized ROI = (47,200 / 135,800) * (12 / 6) * 100 = 69.5%
      expect(result.annualizedRoiPct).toBe(69.5);
    });
  });

  describe('computeShortTermRentalMetrics', () => {
    it('accurately computes ADR, occupancy, platform fees, cleaning revenue, and STR CoC', () => {
      const result = computeShortTermRentalMetrics({
        purchasePrice: 400000,
        totalCostBasis: 420000,
        cashRequired: 100000,
        annualDebtService: 24000,
        averageDailyRate: 250,
        occupancyRatePct: 70.0,
        cleaningFeePerStay: 150,
        averageStayNights: 3.5,
        cleaningCostPerStay: 120,
        platformFeePct: 3.0,
        annualPropertyTax: 4000,
        annualInsurance: 1500,
        annualUtilities: 3000,
        annualMaintenance: 2000,
        strFurnishingCapex: 20000,
      });

      // 365 * 0.70 = 256 nights
      expect(result.bookedNightsYear).toBe(256);
      // 256 / 3.5 = 73 stays
      expect(result.estimatedStaysCount).toBe(73);
      // Nightly revenue = 256 * 250 = 64,000
      expect(result.grossNightlyRevenue).toBe(64000);
      // Cleaning revenue = 73 * 150 = 10,950
      expect(result.cleaningFeeRevenue).toBe(10950);
      // Total gross revenue = 74,950
      expect(result.grossAnnualRevenue).toBe(74950);

      // Platform fees = 64,000 * 0.03 = 1,920
      expect(result.platformFeesAnnual).toBe(1920);
      // Cleaning costs = 73 * 120 = 8,760
      expect(result.cleaningCostsAnnual).toBe(8760);

      // Total OpEx = 1,920 + 8,760 + 10,500 = 21,180
      expect(result.totalOperatingExpenses).toBe(21180);
      // NOI = 74,950 - 21,180 = 53,770
      expect(result.netOperatingIncome).toBe(53770);

      // Annual cash flow = 53,770 - 24,000 = 29,770
      expect(result.annualNetCashFlow).toBe(29770);
      expect(result.monthlyNetCashFlow).toBe(Math.round(29770 / 12));

      // Cash invested = 100,000 + 20,000 = 120,000
      // CoC = (29,770 / 120,000) * 100 = 24.8%
      expect(result.cashOnCashReturnPct).toBe(24.8);
      // Cap rate on cost = (53,770 / 420,000) * 100 = 12.8%
      expect(result.capRateOnCost).toBe(12.8);
    });
  });

  describe('computeBrrrrMetrics', () => {
    it('correctly models capital recovery, cash-out refinance, and post-refi yield', () => {
      const result = computeBrrrrMetrics({
        purchasePrice: 200000,
        rehabBudget: 40000,
        buyerClosingCosts: 4000,
        initialLoanAmount: 150000,
        estimatedARV: 320000,
        refinanceLtvPct: 75.0,
        refinanceInterestRatePct: 6.5,
        refinanceAmortizationYears: 30,
        refinanceClosingCostsPct: 2.0,
        postRefiGrossMonthlyRent: 2600,
        postRefiMonthlyOperatingExpenses: 700,
      });

      // Initial basis = 200k + 40k + 4k = 244,000
      // Initial cash required = 244,000 - 150,000 = 94,000
      expect(result.initialTotalCostBasis).toBe(244000);
      expect(result.initialCashRequired).toBe(94000);

      // New refi loan: 320,000 * 0.75 = 240,000
      expect(result.newRefinanceLoanAmount).toBe(240000);
      // Refi closing costs: 240,000 * 0.02 = 4,800
      expect(result.refinanceClosingCostsAmount).toBe(4800);
      // Cash out = 240,000 - 150,000 - 4,800 = 85,200
      expect(result.cashOutGrossProceeds).toBe(85200);

      // Net cash left in deal = 94,000 - 85,200 = 8,800
      expect(result.netCashLeftInDeal).toBe(8800);
      expect(result.capitalRecoveredPct).toBe(90.6);
      expect(result.isPerfectBrrrr).toBe(false);

      // Post-refi debt service on 240k @ 6.5% 30yr = ~$1,516.96
      expect(result.postRefiMonthlyDebtService).toBeCloseTo(1516.96, 0);
      expect(result.postRefiMonthlyNetCashFlow).toBe(Math.round(2600 - 700 - result.postRefiMonthlyDebtService));
      expect(result.postRefiCashOnCashReturnPct).not.toBeNull();
    });

    it('identifies perfect BRRRR (infinite return) when refi cash-out exceeds initial cash required', () => {
      const perfectResult = computeBrrrrMetrics({
        purchasePrice: 200000,
        rehabBudget: 40000,
        buyerClosingCosts: 4000,
        initialLoanAmount: 150000,
        estimatedARV: 360000, // Higher ARV
        refinanceLtvPct: 75.0,
        refinanceInterestRatePct: 6.5,
        refinanceAmortizationYears: 30,
        refinanceClosingCostsPct: 2.0,
        postRefiGrossMonthlyRent: 2800,
        postRefiMonthlyOperatingExpenses: 700,
      });

      // Refi loan = 360,000 * 0.75 = 270,000
      // Refi costs = 5,400
      // Cash out = 270,000 - 150,000 - 5,400 = 114,600
      // Initial cash = 94,000
      expect(perfectResult.isPerfectBrrrr).toBe(true);
      expect(perfectResult.netCashLeftInDeal).toBe(0);
      expect(perfectResult.capitalRecoveredPct).toBe(100);
      expect(perfectResult.postRefiCashOnCashReturnPct).toBeNull(); // Infinite!
    });
  });

  describe('computeCommercialMetrics', () => {
    it('computes DCR, Debt Yield, GRM, and Break-Even Occupancy for multi-family assets', () => {
      const result = computeCommercialMetrics({
        purchasePrice: 1200000,
        unitCount: 8,
        averageRentPerUnitMonthly: 1500,
        otherIncomeMonthly: 400,
        vacancyRatePct: 5.0,
        operatingExpenseRatioPct: 38.0,
        loanAmount: 840000,
        annualDebtService: 55000,
        marketCapRatePct: 6.5,
        totalCostBasis: 1250000,
        cashRequired: 410000,
      });

      // Scheduled rent = 8 * 1500 * 12 = 144,000
      // Other income = 400 * 12 = 4,800
      // PGI = 148,800
      expect(result.potentialGrossIncomeAnnual).toBe(148800);
      // Vacancy loss = 148,800 * 0.05 = 7,440 -> EGI = 141,360
      expect(result.effectiveGrossIncomeAnnual).toBe(141360);
      // OpEx = 141,360 * 0.38 = 53,717
      expect(result.totalOperatingExpensesAnnual).toBe(53717);
      // NOI = 141,360 - 53,717 = 87,643
      expect(result.netOperatingIncome).toBe(87643);

      // DCR = 87,643 / 55,000 = 1.59x
      expect(result.debtCoverageRatio).toBe(1.59);
      // Debt Yield = (87,643 / 840,000) * 100 = 10.43%
      expect(result.debtYieldPct).toBe(10.43);
      // GRM = 1,200,000 / 144,000 = 8.3x
      expect(result.grossRentMultiplier).toBe(8.3);

      // Cash flow = 87,643 - 55,000 = 32,643
      expect(result.annualNetCashFlow).toBe(32643);
      // CoC = (32,643 / 410,000) * 100 = 8.0%
      expect(result.cashOnCashReturnPct).toBe(8.0);
    });
  });

  describe('computeWholesalingMetrics', () => {
    it('evaluates buyer MAO, assignment fee spread, double closing costs, and deal viability', () => {
      const viableDeal = computeWholesalingMetrics({
        contractPurchasePrice: 150000,
        estimatedARV: 300000,
        estimatedRehabCost: 40000,
        targetBuyerMaoMultiplier: 0.70,
        buyerClosingCostsEstimate: 3000,
        targetAssignmentFee: 15000,
        isDoubleClosing: false,
      });

      // MAO = (300k * 0.70) - 40k - 3k = 167,000
      expect(viableDeal.buyerMaximumAllowableOffer).toBe(167000);
      expect(viableDeal.recommendedMaxContractOffer).toBe(152000);
      expect(viableDeal.endBuyerPurchasePrice).toBe(165000);
      expect(viableDeal.netWholesaleProfit).toBe(15000);
      expect(viableDeal.isDealViable).toBe(true);
      expect(viableDeal.spreadPctOfContract).toBe(10.0);

      // Unviable deal when contract price exceeds buyer MAO
      const unviableDeal = computeWholesalingMetrics({
        contractPurchasePrice: 175000,
        estimatedARV: 300000,
        estimatedRehabCost: 40000,
        targetBuyerMaoMultiplier: 0.70,
        buyerClosingCostsEstimate: 3000,
        targetAssignmentFee: 10000,
      });

      expect(unviableDeal.isDealViable).toBe(false);
    });
  });

  describe('computeDealStructuringMetrics', () => {
    it('correctly allocates cash requirements and returns between partner and operator', () => {
      const structuring = computeDealStructuringMetrics({
        financingModality: 'conventional',
        capitalSeekingIntent: 'partner_down_payment',
        totalCashRequired: 100000,
        annualNetCashFlow: 12000,
        partnerEquitySplitPct: 50.0,
      });

      expect(structuring.partnerCashInvested).toBe(100000);
      expect(structuring.operatorCashInvested).toBe(0);
      expect(structuring.partnerAnnualCashFlow).toBe(6000);
      expect(structuring.operatorAnnualCashFlow).toBe(6000);
      expect(structuring.partnerCoCReturnPct).toBe(6.0);
      expect(structuring.operatorCoCReturnPct).toBeNull(); // Infinite return
    });
  });

  describe('evaluatePurchaseCriteria', () => {
    it('evaluates green light rules and generates correct scorecard summary', () => {
      const greenDeal = evaluatePurchaseCriteria(
        {
          minCashOnCashPct: 8.0,
          minDscr: 1.25,
          minCapRatePct: 6.0,
        },
        {
          strategy: 'buy_and_hold_rental',
          cashOnCashReturnPct: 9.5,
          dscr: 1.35,
          capRateOnCost: 7.2,
          isNegativeLeverage: false,
        },
      );

      expect(greenDeal.overallStatus).toBe('GREEN_LIGHT');
      expect(greenDeal.failedCount).toBe(0);
      expect(greenDeal.passedCount).toBe(4); // CoC, DSCR, Cap Rate, Positive Leverage

      const redDeal = evaluatePurchaseCriteria(
        {
          minCashOnCashPct: 8.0,
          minDscr: 1.25,
        },
        {
          strategy: 'buy_and_hold_rental',
          cashOnCashReturnPct: 4.0, // Fails
          dscr: 1.10, // Warn
          capRateOnCost: 5.0,
          isNegativeLeverage: true, // Fails
        },
      );

      expect(redDeal.overallStatus).toBe('RED_LIGHT');
      expect(redDeal.failedCount).toBeGreaterThan(0);
    });
  });

  describe('reconcileAcquisitionUnderwriting multi-strategy integration', () => {
    it('populates all strategy engine results and purchase criteria evaluations', () => {
      const reconciled = reconcileAcquisitionUnderwriting({
        purchasePrice: 400000,
        estimatedARV: 520000,
        rehabBudget: 35000,
        grossRentMonthly: 3400,
        targetLtvPct: 75,
        interestRatePct: 6.5,
        holdPeriodYears: 5,
        strategy: 'buy_and_hold_rental',
        terminalValueMethod: 'appreciation_pct',
        financingModality: 'conventional',
        capitalSeekingIntent: 'solo',
        purchaseCriteria: {
          minCashOnCashPct: 7.0,
          minDscr: 1.20,
        },
      });

      expect(reconciled.shortTermRental).toBeDefined();
      expect(reconciled.fixAndFlip).toBeDefined();
      expect(reconciled.brrrr).toBeDefined();
      expect(reconciled.commercial).toBeDefined();
      expect(reconciled.wholesaling).toBeDefined();
      expect(reconciled.dealStructuring).toBeDefined();
      expect(reconciled.purchaseCriteriaResult).toBeDefined();
      expect(reconciled.purchaseCriteriaResult?.overallStatus).toBeDefined();
      expect(reconciled.fixAndFlip?.isProfitable).toBe(true);
      expect(reconciled.dealStructuring?.operatorCashInvested).toBe(reconciled.cashRequired);
    });
  });
});
