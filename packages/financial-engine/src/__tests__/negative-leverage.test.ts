import {
  reconcileAcquisitionUnderwriting,
  canonicalDemoDeal,
} from '../index.js';

describe('MISSION W2-08: Negative-Leverage Badge & Institutional Analysis', () => {
  /**
   * Test 1: Canonical fixture arithmetic hand-check
   *
   * Canonical Demo Deal (1247 Elm Street):
   * Purchase Price: $520,000, 75% LTV -> Loan Amount: $390,000
   * 6.5% interest, 30-year amort -> Monthly Payment: $2,465.07 -> Annual Debt Service: $29,581 (or $29,580)
   * Loan Constant = Annual Debt Service / Loan Amount = $29,581 / $390,000 = 0.075848... -> 7.585% (~7.59%)
   * Total Cost Basis = $520,000 + $15,600 + $59,800 = $595,400
   * Net Operating Income = $38,138
   * Yield on Cost (Cap Rate on Cost) = $38,138 / $595,400 = 6.405% -> 6.4%
   *
   * Comparison:
   * Yield on Cost (6.4%) < Loan Constant (7.585%)
   * Because the debt costs more than the asset yields, negative leverage is active.
   * isNegativeLeverage MUST be true.
   */
  it('1. canonical fixture triggers negative leverage badge (YoC 6.4% < Loan Constant 7.59%)', () => {
    const result = reconcileAcquisitionUnderwriting(canonicalDemoDeal);

    expect(result.capRateOnCost).toBe(6.4);
    expect(result.yieldOnCostPct).toBe(6.4);
    expect(result.loanConstantPct).toBeCloseTo(7.585, 2);
    expect(result.loanConstantPct).toBeGreaterThan(result.yieldOnCostPct);
    expect(result.isNegativeLeverage).toBe(true);
  });

  /**
   * Test 1B: Seed Deal-1 (1247 Elm Street snapshot from seed data)
   * Loan Amount: $363,750, Annual Debt Service: $27,589.80
   * Loan Constant = 27,589.80 / 363,750 = 0.075848... -> 7.585% (~7.59%)
   * Yield on Cost = 5.53%
   * 5.53% < 7.585% -> Negative leverage active
   */
  it('1b. seed deal-1 triggers negative leverage badge (27,589.80 / 363,750 = 7.589% vs YoC 5.53%)', () => {
    const seedDeal1 = {
      purchasePrice: 485000,
      rehabBudget: 62000,
      estimatedARV: 620000,
      grossRentMonthly: 4600,
      operatingExpensesAnnual: 21646,
      vacancyRatePct: 5.0,
      targetLtvPct: 75.0, // Loan = 363,750
      interestRatePct: 6.5,
      amortizationYears: 30,
      buyerClosingCostsPct: 2.0, // Closing = 9,700 => Basis = 556,700
      holdPeriodYears: 5,
      annualAppreciationPct: 3.0,
      sellingCostsPct: 6.0,
      terminalValueMethod: 'appreciation_pct' as const,
    };

    const result = reconcileAcquisitionUnderwriting(seedDeal1);
    expect(result.loanAmount).toBe(363750);
    expect(result.loanConstantPct).toBeCloseTo(7.585, 2);
    expect(result.yieldOnCostPct).toBeLessThan(result.loanConstantPct);
    expect(result.isNegativeLeverage).toBe(true);
  });

  /**
   * Test 2: High-yield fixture -> no badge
   * Commercial value-add deal with 9.5% YoC and 6.0% loan constant
   */
  it('2. high-yield fixture does not trigger negative leverage badge (YoC > Loan Constant)', () => {
    const highYieldDeal = {
      purchasePrice: 1000000,
      rehabBudget: 100000,
      estimatedARV: 1500000,
      grossRentMonthly: 15000, // $180k/yr
      operatingExpenseRatioPct: 30.0, // $54k OpEx -> $126k NOI
      vacancyRatePct: 5.0, // $171k GOI -> $117k NOI
      targetLtvPct: 60.0, // Loan = $600k
      interestRatePct: 4.5, // low rate
      amortizationYears: 30, // low debt service
      buyerClosingCostsPct: 2.0,
      holdPeriodYears: 5,
      terminalValueMethod: 'appreciation_pct' as const,
    };

    const result = reconcileAcquisitionUnderwriting(highYieldDeal);
    expect(result.yieldOnCostPct).toBeGreaterThan(result.loanConstantPct);
    expect(result.cashOnCashReturnPct).toBeGreaterThan(0);
    expect(result.isNegativeLeverage).toBe(false);
  });

  /**
   * Test 3: Cash-on-Cash < 0 -> badge renders regardless of YoC
   */
  it('3. negative cash-on-cash return triggers badge regardless of yield on cost', () => {
    const negativeCashFlowDeal = {
      purchasePrice: 500000,
      rehabBudget: 50000,
      estimatedARV: 650000,
      grossRentMonthly: 3000, // Low rent -> low NOI
      operatingExpenseRatioPct: 40.0,
      vacancyRatePct: 5.0,
      targetLtvPct: 80.0, // High leverage loan = $400k
      interestRatePct: 8.5, // High interest rate -> large debt service exceeds NOI
      amortizationYears: 30,
      buyerClosingCostsPct: 2.0,
      holdPeriodYears: 5,
      terminalValueMethod: 'appreciation_pct' as const,
    };

    const result = reconcileAcquisitionUnderwriting(negativeCashFlowDeal);
    expect(result.cashOnCashReturnPct).toBeLessThan(0);
    expect(result.isNegativeLeverage).toBe(true);
  });

  /**
   * Test 4: Comparison payload carries both loanConstantPct and yieldOnCostPct
   */
  it('4. output payload carries both compared values with explicit labeling', () => {
    const result = reconcileAcquisitionUnderwriting(canonicalDemoDeal);

    expect(result).toHaveProperty('loanConstantPct');
    expect(result).toHaveProperty('yieldOnCostPct');
    expect(result).toHaveProperty('isNegativeLeverage');

    expect(typeof result.loanConstantPct).toBe('number');
    expect(typeof result.yieldOnCostPct).toBe('number');
    expect(typeof result.isNegativeLeverage).toBe('boolean');
  });
});
