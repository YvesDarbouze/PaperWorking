import { deriveAllProjectMetrics } from '../deriveAllProjectMetrics.js';
import { canonicalSeedDeal } from '../fixtures/canonical-seed-deal.js';
import {
  computeAmortizationSchedule,
  computeAnnualDebtConstant,
} from '../amortization-engine.js';
import {
  computeExitCapSensitivity,
  computeRentGrowthSensitivity,
  computeVacancyStressTest,
  computeHoldPeriodSensitivity,
} from '../sensitivity-engine.js';

describe('Audit Suite 2: Golden Value Validation — Canonical Seed Deal (Reconciled)', () => {
  test('Canonical seed deal produces exact spec golden outputs', async () => {
    const result = await deriveAllProjectMetrics('canonical-seed-deal-id', {
      mockData: canonicalSeedDeal,
    });

    // 1. NOI = $12,485/yr
    expect(result.scorecard.noi.value).toBeCloseTo(12485, 0);

    // 2. Cap Rate = 4.5%
    expect(result.scorecard.capRate.value).toBeCloseTo(4.5, 1);

    // 3. Cash-on-Cash Return = -7.96%
    expect(result.scorecard.cashOnCash.value).toBeCloseTo(-7.96, 1);

    // 4. Monthly Mortgage Payment = $1,410.78
    expect(result.derived.monthlyMortgagePayment).toBeCloseTo(1410.78, 2);

    // 5. Cash Flow = -$4,444/yr
    expect(result.scorecard.cashFlow.value).toBeCloseTo(-4444, 0);

    // 6. DSCR = 0.74
    expect(result.scorecard.dscr.value).toBeCloseTo(0.74, 2);

    // 7. GRM = 11.6
    expect(result.scorecard.grm.value).toBeCloseTo(11.6, 1);

    // 8. Occupancy Rate = 100% (1/1 unit occupied)
    expect(result.scorecard.occupancyRate.value).toBe(100);

    // 9. Expense Ratio = 46.37%
    expect(result.scorecard.expenseRatio.value).toBeCloseTo(46.37, 1);

    // 10. Long-Term Appreciation = 3.5%
    expect(result.scorecard.longTermAppreciation.value).toBe(3.5);

    // 11. Canonical MACRS Depreciation = $8,116.36/yr ($223,200 improvement basis / 27.5 yrs)
    expect(result.derived.annualDepreciation).toBe(8116.36);
  });

  test('F-R1: Surfaces INSUFFICIENT_INPUTS (annualDepreciation: null) when land/improvement split is missing', async () => {
    // Deal without landValue or improvementBasis must not fall back to naive purchasePrice / 27.5
    const dealWithoutLandSplit = {
      ...canonicalSeedDeal,
      land_value: undefined,
      improvement_basis: undefined,
      depreciation: undefined,
    };

    const result = await deriveAllProjectMetrics('deal-no-land-split', {
      mockData: dealWithoutLandSplit,
    });

    // Must be null — NOT naive $279,000 / 27.5 = $10,145.45
    expect(result.derived.annualDepreciation).toBeNull();
  });
});

describe('Audit Suite 3: 33 Underwriting KPIs Completed Math Formulations', () => {
  test('Debt Yield = NOI ÷ Loan Amount', async () => {
    const result = await deriveAllProjectMetrics('deal-debt-yield', {
      mockData: {
        ...canonicalSeedDeal,
        purchase_price: 500000,
        loan_amount: 350000,
        gross_scheduled_rent: 48000,
        operating_expenses: {
          tax: 5000,
          insurance: 2500,
          security: 0,
          maintenance: 2500,
          utilities: 1000,
          management: 2000,
          HOA: 0,
        },
      },
    });

    // GOI = $48,000 * (1 - 0.03) = $46,560
    // OpEx = 5000 + 2500 + 2500 + 1000 + 2000 = $13,000
    // NOI = $46,560 - $13,000 = $33,560
    // Debt Yield = (33,560 / 350,000) * 100 = 9.59%
    expect(result.derived.debtYield).toBeCloseTo(9.59, 1);
  });

  test('Break-Even Occupancy = (OpEx + Debt Service) ÷ Gross Scheduled Rent', async () => {
    const result = await deriveAllProjectMetrics('deal-break-even', {
      mockData: {
        ...canonicalSeedDeal,
        purchase_price: 300000,
        loan_amount: 200000,
        gross_scheduled_rent: 36000, // $3,000/mo
        operating_expenses: {
          tax: 3000,
          insurance: 1500,
          security: 0,
          maintenance: 2000,
          utilities: 1500,
          management: 1000,
          HOA: 0,
        },
      },
    });

    // OpEx = $9,000
    // Monthly Debt at 6.5%, 30yr on $200k = $1,264.14 -> Annual Debt Service = $15,169.68
    // Total Outflows = 9000 + 15169.68 = $24,169.68
    // Break-Even Occupancy = (24,169.68 / 36,000) * 100 = 67.14%
    expect(result.derived.breakEvenOccupancy).toBeCloseTo(67.14, 1);
  });

  test('LTC (Loan-to-Cost) alongside LTV', async () => {
    const result = await deriveAllProjectMetrics('deal-ltc', {
      mockData: {
        ...canonicalSeedDeal,
        purchase_price: 400000,
        closing_costs: 10000,
        rehab_costs: 90000, // Total Basis = $500,000
        loan_amount: 375000,
        property_value: 600000, // ARV
      },
    });

    // Total Cost Basis = 400k + 10k + 90k = $500,000
    // LTC = (375,000 / 500,000) * 100 = 75.00%
    // LTV = (375,000 / 600,000) * 100 = 62.50%
    expect(result.derived.totalCostBasis).toBe(500000);
    expect(result.derived.ltc).toBe(75);
    expect(result.insights.financial.ltv.value).toBe(62.5);
  });

  test('Maximum Supportable Loan = min(LTV, LTC, DSCR constrained)', async () => {
    const annualRate = 0.065;
    const termYears = 30;
    const debtConstant = computeAnnualDebtConstant(annualRate, termYears);
    expect(debtConstant).toBeCloseTo(0.07584, 4);

    const result = await deriveAllProjectMetrics('deal-max-loan', {
      mockData: {
        ...canonicalSeedDeal,
        purchase_price: 500000,
        closing_costs: 10000,
        rehab_costs: 50000, // Basis = $560,000; LTC 85% = $476,000
        property_value: 650000, // ARV; LTV 75% = $487,500
        gross_scheduled_rent: 40000,
        underwriting: {
          hurdles: { minDSCR: 1.25 },
        },
      },
    });

    // NOI is ~$27,405
    // DSCR constrained = NOI / (1.25 * 0.07584) ~= $289,067
    // LTC constrained = 560,000 * 0.85 = $476,000
    // LTV constrained = 650,000 * 0.75 = $487,500
    // Min is DSCR constrained (~$289,067)
    expect(result.derived.maxSupportableLoan).toBeLessThan(result.derived.totalCostBasis!);
    expect(result.derived.maxSupportableLoan).toBeGreaterThan(250000);
  });

  test('Unlevered IRR and Levered IRR are computed independently without conflation', async () => {
    const result = await deriveAllProjectMetrics('deal-irr-test', {
      mockData: {
        ...canonicalSeedDeal,
        purchase_price: 300000,
        loan_amount: 225000,
        interest_rate: 0.065,
        total_cash_invested: 75000,
        gross_scheduled_rent: 36000,
        expenses: { tax: 3000, insurance: 1500, maintenance: 2000, utilities: 1000, management: 1500 },
        underwriting: {
          exit: { holdPeriodYears: 5, exitCapRate: 6.5, costOfSale: 5 },
        },
      },
    });

    expect(result.derived.unleveredIrr).not.toBeNull();
    expect(result.derived.leveredIrr).not.toBeNull();
    // With positive leverage, levered IRR differs distinctly from unlevered IRR
    expect(result.derived.unleveredIrr).not.toBe(result.derived.leveredIrr);
    expect(typeof result.derived.unleveredIrr).toBe('number');
    expect(typeof result.derived.leveredIrr).toBe('number');
  });

  test('Amortization schedule handles Interest-Only period and Balloon term', () => {
    const schedule = computeAmortizationSchedule(200000, 0.06, 30, {
      ioPeriodMonths: 12,
      balloonTermYears: 5,
    });

    // First month is interest only: $200,000 * 0.06 / 12 = $1,000.00
    expect(schedule.schedule[0].isInterestOnly).toBe(true);
    expect(schedule.schedule[0].interest).toBe(1000);
    expect(schedule.schedule[0].principal).toBe(0);
    expect(schedule.schedule[0].balance).toBe(200000);

    // Month 12 is still IO
    expect(schedule.schedule[11].isInterestOnly).toBe(true);
    expect(schedule.schedule[11].balance).toBe(200000);

    // Month 13 begins amortizing
    expect(schedule.schedule[12].isInterestOnly).toBe(false);
    expect(schedule.schedule[12].principal).toBeGreaterThan(0);

    // Total payments capped at 5 years * 12 = 60 months
    expect(schedule.totalPayments).toBe(60);
    expect(schedule.balloonBalance).toBeDefined();
    expect(schedule.balloonBalance).toBeGreaterThan(180000);
    expect(schedule.balloonBalance).toBeLessThan(200000);
  });

  test('Floating rate modeling with index and spread', () => {
    // SOFR (5.30%) + 250 bps = 7.80%
    const schedule = computeAmortizationSchedule(300000, 0.05, 30, {
      floatingIndex: 'SOFR',
      floatingSpreadBps: 250,
    });

    // Initial monthly rate = 7.80% / 12 = 0.0065
    // Monthly payment on $300k at 7.80% for 30 years = $2,159.61
    expect(schedule.monthlyPayment).toBeCloseTo(2159.61, 1);
  });

  test('Sensitivity Engine produces correct matrix dimensions and stress points', () => {
    // Exit Cap Sensitivity (5 points: -50, -25, base, +25, +50 bps)
    const exitCapPoints = computeExitCapSensitivity(30000, 6.5, 25, 2);
    expect(exitCapPoints.length).toBe(5);
    expect(exitCapPoints[0].capRatePct).toBe(6.0); // 6.5 - 0.50%
    expect(exitCapPoints[2].capRatePct).toBe(6.5); // base
    expect(exitCapPoints[4].capRatePct).toBe(7.0); // 6.5 + 0.50%
    expect(exitCapPoints[0].exitValuation).toBe(500000); // 30k / 0.06

    // Rent Growth Sensitivity (5 shock levels)
    const rentGrowthPoints = computeRentGrowthSensitivity(40000, 15000, 18000, 5);
    expect(rentGrowthPoints.length).toBe(5);
    expect(rentGrowthPoints[0].rentShockPct).toBe(-5);
    expect(rentGrowthPoints[4].rentShockPct).toBe(5);

    // Vacancy Stress Test (4 points: 5, 10, 15, 20%)
    const vacancyPoints = computeVacancyStressTest(50000, 20000, 20000);
    expect(vacancyPoints.length).toBe(4);
    expect(vacancyPoints[0].vacancyPct).toBe(5);
    expect(vacancyPoints[3].vacancyPct).toBe(20);

    // Hold Period Sensitivity (4 horizons: 3, 5, 7, 10 years)
    const holdPoints = computeHoldPeriodSensitivity(25000, 15000, 400000, 350000, 100000);
    expect(holdPoints.length).toBe(4);
    expect(holdPoints.map((h) => h.holdPeriodYears)).toEqual([3, 5, 7, 10]);
  });

  test('Missing inputs return explicit missingInputs diagnostics without silent substitution', async () => {
    const result = await deriveAllProjectMetrics('empty-project', {
      mockData: {
        id: 'empty-project',
        // No purchase_price, no gross_scheduled_rent
      },
    });

    expect(result.scorecard.noi.value).toBeNull();
    expect(result.scorecard.noi.missingInputs).toContain('purchase_price');
    expect(result.scorecard.noi.missingInputs).toContain('gross_scheduled_rent');
  });

  test('Waterfall Engine: Single-Tier Golden Values ($100k equity, 90/10, 8% pref, 20% promote)', async () => {
    const { computeDistributionWaterfall } = await import('../waterfall-engine.js');
    const result = computeDistributionWaterfall({
      totalEquity: 100000,
      lpEquityPct: 90,
      gpEquityPct: 10,
      preferredReturnPct: 8,
      gpPromotePct: 20,
      holdPeriodYears: 5,
      annualCashFlow: 8000,
      netExitProceeds: 160000,
    });

    // 1. Capitalization:
    // Total Equity = $100,000 (LP 90%: $90,000 | GP 10%: $10,000)
    expect(result.lpEquity).toBe(90000);
    expect(result.gpEquity).toBe(10000);

    // 2. Exact Hand-Computed Single-Tier Golden Derivation:
    // Parameterization:
    // - Hold period: 5 years
    // - Annual operating cash flow: $8,000/yr (Years 1-4: 4 * $8,000 = $32,000)
    // - Year 5 exit cash available: $8,000 (operating) + $160,000 (net sales proceeds) = $168,000
    // - Total cash distributed across hold = $32,000 + $168,000 = $200,000
    // - Total net profit = $200,000 total cash - $100,000 capital returned = $100,000
    //
    // Distribution Sequence:
    // A. 8% Non-Compounding Annual Preferred Return across 5 years = $40,000 total:
    //    - Annual LP Pref (8% of $90k) = $7,200/yr -> 5-year total = $36,000
    //    - Annual GP Yield (8% of $10k) = $800/yr -> 5-year total = $4,000
    //    - Years 1-4: $8,000 annual cash flow exactly pays annual pref ($7,200 LP, $800 GP); accrued unpaid pref = $0.
    //    - Year 5: first $8,000 pays Year 5 pref ($7,200 LP, $800 GP). Total pref paid = $40,000.
    // B. Pro-Rata Return of Capital:
    //    - $100,000 returned from Year 5 exit cash ($90,000 LP, $10,000 GP).
    // C. Residual Profit Split above Pref & Capital:
    //    - Residual exit cash = $200,000 total - $40,000 pref - $100,000 capital = $60,000.
    //    - Split via Tier 1 Promote (80% LP / 20% GP):
    //      - LP share (80% of $60,000) = $48,000
    //      - GP share (20% of $60,000) = $12,000
    //
    // Final Golden Totals:
    // - LP = $36,000 (pref) + $90,000 (capital) + $48,000 (promote) = $174,000
    // - GP = $4,000 (yield) + $10,000 (capital) + $12,000 (promote) = $26,000
    // - Total Distributed = $174,000 + $26,000 = $200,000 (Exact tie-out)
    expect(result.lpTotalDistributed).toBe(174000);
    expect(result.gpTotalDistributed).toBe(26000);
    expect(result.totalDistributed).toBe(200000);

    // 3. Equity Multiples (MOIC):
    // - LP MOIC: $174,000 / $90,000 = 1.93x
    // - GP MOIC: $26,000 / $10,000 = 2.60x
    expect(result.lpEquityMultiple).toBe(1.93);
    expect(result.gpEquityMultiple).toBe(2.6);

    // 4. IRRs
    expect(result.lpIrr).toBeDefined();
    expect(result.lpIrr).toBeGreaterThan(15);
    expect(result.gpIrr).toBeDefined();
    expect(result.gpIrr).toBeGreaterThan(20);
  });

  test('Waterfall Engine: Two-Tier Golden Values ($100k equity, 90/10, 8% pref, 20% promote, 15% hurdle 2, 35% promote 2)', async () => {
    const { computeDistributionWaterfall } = await import('../waterfall-engine.js');
    const result = computeDistributionWaterfall({
      totalEquity: 100000,
      lpEquityPct: 90,
      gpEquityPct: 10,
      preferredReturnPct: 8,
      gpPromotePct: 20,
      hurdle2Irr: 15,
      gpPromote2Pct: 35,
      holdPeriodYears: 5,
      annualCashFlow: 8000,
      netExitProceeds: 160000,
    });

    // Exact Hand-Computed Two-Tier Golden Derivation:
    // Parameterization:
    // - Same baseline: $100k equity (LP $90k, GP $10k), 5-yr hold, $8k annual cash flow, $160k net exit proceeds.
    // - Total cash = $200,000. Total net profit = $100,000.
    // - Secondary hurdle: hurdle2Irr = 15.0%, gpPromote2Pct = 35% (LP 65% / GP 35%).
    //
    // LP Cash-Flow Vector:
    // - t0 (Year 0): -$90,000 (initial equity investment)
    // - t1 (Year 1): +$7,200 (operating pref)
    // - t2 (Year 2): +$7,200 (operating pref)
    // - t3 (Year 3): +$7,200 (operating pref)
    // - t4 (Year 4): +$7,200 (operating pref)
    //
    // Hurdle 2 (15% LP IRR) Boundary Math at Exit (t5):
    // At discount rate r = 0.15:
    // - PV(Years 1-4 operating pref) = 7200/1.15^1 + 7200/1.15^2 + 7200/1.15^3 + 7200/1.15^4
    //                               = $6,260.87 + $5,444.23 + $4,734.12 + $4,116.62 = $20,555.84
    // - PV needed from Year 5 cash flow = $90,000 - $20,555.84 = $69,444.16
    // - Future Value (t5 target cash flow for LP to reach exactly 15% IRR):
    //   Target Exit LP Cash = $69,444.16 * (1.15)^5 = $69,444.16 * 2.011357 = $139,677.01
    // - Guaranteed Year 5 LP cash prior to promote:
    //   Year 5 pref ($7,200) + return of capital ($90,000) = $97,200.00
    // - LP profit needed in Tier 1 to reach 15% IRR:
    //   $139,677.01 - $97,200.00 = $42,477.01
    // - Total Tier 1 profit capacity (at 80% LP / 20% GP):
    //   $42,477.01 / 0.80 = $53,096.26
    //   - LP Tier 1 share = $42,477.01
    //   - GP Tier 1 share = $10,619.25
    //
    // Excess Profit into Tier 2 (35% GP promote / 65% LP):
    // - Total residual profit above pref & capital = $60,000.00
    // - Excess above Tier 1 threshold = $60,000.00 - $53,096.26 = $6,903.74
    //   - LP Tier 2 share (65% of $6,903.74) = $4,487.43
    //   - GP Tier 2 share (35% of $6,903.74) = $2,416.31
    //
    // Final Reconciled Totals:
    // - LP Total = $28,800 (Y1-4 pref) + $7,200 (Y5 pref) + $90,000 (capital) + $42,477.01 (Tier 1) + $4,487.43 (Tier 2)
    //            = $172,964.44 -> ~$172,964
    // - GP Total = $3,200 (Y1-4 pref) + $800 (Y5 pref) + $10,000 (capital) + $10,619.25 (Tier 1) + $2,416.31 (Tier 2)
    //            = $27,035.56 -> ~$27,036
    // - Total Distributed = $172,964.44 + $27,035.56 = $200,000.00 (Exact tie-out)
    expect(result.totalDistributed).toBe(200000);
    expect(result.lpTotalDistributed).toBeCloseTo(172964, -2);
    expect(result.gpTotalDistributed).toBeCloseTo(27036, -2);
    expect(result.lpTotalDistributed + result.gpTotalDistributed).toBe(200000);

    // LP IRR is constrained by the secondary promote
    expect(result.lpIrr).toBeDefined();
    expect(result.lpEquityMultiple).toBe(1.92);
    expect(result.gpEquityMultiple).toBe(2.7);

    // Verify 4 tiers present in result
    expect(result.tiers.length).toBe(4);
    expect(result.tiers[0].name).toBe('Return of Capital');
    expect(result.tiers[1].name).toContain('Preferred Return');
    expect(result.tiers[2].name).toContain('Tier 1 Promote');
    expect(result.tiers[3].name).toContain('Tier 2 Promote');
  });

  test('deriveAllProjectMetrics populates derived waterfall and LP/GP splits', async () => {
    const result = await deriveAllProjectMetrics('test-waterfall-deal', {
      mockData: {
        ...canonicalSeedDeal,
        purchase_price: 500000,
        underwriting: {
          acquisition: { purchasePrice: 500000, buyerClosingCosts: 10000, rehabBudget: 0, estimatedARV: 600000 },
          rentRoll: { grossScheduledRent: 50000, otherIncome: 0, vacancyRate: 5, operatingExpenseRatio: 35 },
          debt: { loanAmount: 375000, targetLTV: 75, interestRateType: 'fixed', interestRate: 6.5, amortizationYears: 30 },
          exit: { holdPeriodYears: 5, exitCapRate: 6.5, annualRentGrowth: 3, annualExpenseGrowth: 2, costOfSale: 5 },
          hurdles: {
            minDSCR: 1.25,
            preferredReturn: 8,
            exitCapSensitivityBps: 25,
            rentShockPct: 5,
            vacancyStressRange: [5, 20],
            equityRequiredGpVsLp: '10% GP / 90% LP',
            lpEquityPct: 90,
            gpEquityPct: 10,
            gpPromotePct: 20,
          },
        },
      },
    });

    // Total cost basis = 500k + 10k = $510k
    // Loan = $375k -> Equity = $135k
    expect(result.derived.totalCashInvested).toBe(135000);
    expect(result.derived.lpEquity).toBe(121500); // 90% of $135k
    expect(result.derived.gpEquity).toBe(13500);  // 10% of $135k
    expect(result.derived.lpIrr).not.toBeNull();
    expect(result.derived.gpIrr).not.toBeNull();
    expect(result.derived.lpEquityMultiple).not.toBeNull();
    expect(result.derived.gpEquityMultiple).not.toBeNull();
    expect(result.derived.waterfall).toBeDefined();
    expect(result.derived.waterfall?.tiers.length).toBe(3);
  });
});
