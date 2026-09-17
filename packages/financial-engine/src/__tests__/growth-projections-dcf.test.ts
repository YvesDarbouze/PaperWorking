import {
  calculateProjectedIrrDetails,
  canonicalDemoDeal,
  reconcileAcquisitionUnderwriting,
  transformCalculatorToProject,
} from '../index.js';

describe('MISSION W2-09: Growth-Vector Projections & DCF Progression', () => {
  // ── Test 1: 0%-growth golden vs Round-9 verified vector (exact match to the cent) ──
  it('1. 0%-growth golden reproduces verified vector and IRR to the cent', () => {
    const reconciled = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      rentGrowthPct: 0.0,
      expenseGrowthPct: 0.0,
      annualAppreciationPct: 3.0,
    });

    // Zero growth must reproduce verified numbers to the cent
    expect(reconciled.irrCashFlowVector).toEqual([-205400, 8557, 8557, 8557, 8557, 210128]);
    expect(reconciled.projectedIrrPct).toBe(3.8);
    expect(reconciled.irrStatus).toBe('converged');
    expect(reconciled.irrRoots).toHaveLength(1);
    expect(reconciled.irrRoots[0].ratePct).toBeCloseTo(3.82, 2);
    expect(reconciled.irrRoots[0].npvResidual).toBeLessThan(1e-7);

    // Verify annualProjections schedule parity
    expect(reconciled.annualProjections).toHaveLength(5);
    for (let yr = 1; yr <= 5; yr++) {
      const proj = reconciled.annualProjections[yr - 1];
      expect(proj.year).toBe(yr);
      expect(proj.grossRent).toBe(62400);
      expect(proj.vacancyAmount).toBe(3120);
      expect(proj.goi).toBe(59280);
      expect(proj.opex).toBe(21142);
      expect(proj.noi).toBe(38138);
      expect(proj.debtService).toBe(29581);
      expect(proj.operatingCashFlow).toBe(8557);
      if (yr < 5) {
        expect(proj.netSaleProceeds).toBe(0);
        expect(proj.totalCashFlow).toBe(8557);
      } else {
        expect(proj.netSaleProceeds).toBe(201571);
        expect(proj.totalCashFlow).toBe(210128);
      }
    }
  });

  // ── Test 2: 3%-rent-growth golden matching hand-computed walkthrough table ──────
  it('2. 3%-rent-growth golden matches hand-computed year-by-year table and 5.5% IRR', () => {
    const details = calculateProjectedIrrDetails({
      totalCashInvested: 205400,
      annualPreTaxCashFlow: 8557,
      purchasePrice: 520000,
      loanAmount: 390000,
      interestRatePct: 6.5,
      amortizationYears: 30,
      holdPeriodYears: 5,
      annualAppreciationPct: 3.0,
      sellingCostsPct: 6.0,
      rentGrowthPct: 3.0,
      expenseGrowthPct: 0.0,
      grossAnnualRent: 62400,
      vacancyRatePct: 5.0,
      totalOperatingExpenses: 21142,
      annualDebtService: 29581,
    });

    expect(details.annualProjections).toHaveLength(5);

    // Year 1: Rent 62,400, Vac 3,120, GOI 59,280, OpEx 21,142, NOI 38,138, OpCF 8,557
    const y1 = details.annualProjections[0];
    expect(y1.grossRent).toBe(62400);
    expect(y1.vacancyAmount).toBe(3120);
    expect(y1.goi).toBe(59280);
    expect(y1.opex).toBe(21142);
    expect(y1.noi).toBe(38138);
    expect(y1.operatingCashFlow).toBe(8557);
    expect(y1.totalCashFlow).toBe(8557);

    // Year 2: Rent 64,272.00, Vac 3,213.60, GOI 61,058.40, OpEx 21,142.00, NOI 39,916.40, OpCF 10,335.40
    const y2 = details.annualProjections[1];
    expect(y2.grossRent).toBe(64272);
    expect(y2.vacancyAmount).toBe(3213.6);
    expect(y2.goi).toBe(61058.4);
    expect(y2.opex).toBe(21142);
    expect(y2.noi).toBe(39916.4);
    expect(y2.operatingCashFlow).toBe(10335.4);
    expect(y2.totalCashFlow).toBe(10335.4);

    // Year 3: Rent 66,200.16, Vac 3,310.01, GOI 62,890.15, OpEx 21,142.00, NOI 41,748.15, OpCF 12,167.15
    const y3 = details.annualProjections[2];
    expect(y3.grossRent).toBe(66200.16);
    expect(y3.vacancyAmount).toBe(3310.01);
    expect(y3.goi).toBe(62890.15);
    expect(y3.opex).toBe(21142);
    expect(y3.noi).toBe(41748.15);
    expect(y3.operatingCashFlow).toBe(12167.15);
    expect(y3.totalCashFlow).toBe(12167.15);

    // Year 4: Rent 68,186.16, Vac 3,409.31, GOI 64,776.85, OpEx 21,142.00, NOI 43,634.85, OpCF 14,053.85
    const y4 = details.annualProjections[3];
    expect(y4.grossRent).toBe(68186.16);
    expect(y4.vacancyAmount).toBe(3409.31);
    expect(y4.goi).toBe(64776.85);
    expect(y4.opex).toBe(21142);
    expect(y4.noi).toBe(43634.85);
    expect(y4.operatingCashFlow).toBe(14053.85);
    expect(y4.totalCashFlow).toBe(14053.85);

    // Year 5: Rent 70,231.75, Vac 3,511.59, GOI 66,720.16, OpEx 21,142.00, NOI 45,578.16, OpCF 15,997.16, NetExit 201,571, Total 217,568.16
    const y5 = details.annualProjections[4];
    expect(y5.grossRent).toBe(70231.75);
    expect(y5.vacancyAmount).toBe(3511.59);
    expect(y5.goi).toBe(66720.16);
    expect(y5.opex).toBe(21142);
    expect(y5.noi).toBe(45578.16);
    expect(y5.operatingCashFlow).toBe(15997.16);
    expect(y5.netSaleProceeds).toBe(201571);
    expect(y5.totalCashFlow).toBe(217568.16);

    // Check cashFlowVector
    expect(details.cashFlowVector).toEqual([
      -205400,
      8557,
      10335.4,
      12167.15,
      14053.85,
      217568.16,
    ]);

    // Check IRR
    expect(details.projectedIrrPct).toBe(5.5);
    expect(details.irrStatus).toBe('converged');
    expect(details.roots).toHaveLength(1);
    expect(details.roots[0].ratePct).toBeCloseTo(5.52, 2);
    expect(details.roots[0].npvResidual).toBeLessThan(1e-7);
  });

  // ── Test 3: Expense-growth progression path ────────────────────────────────────
  it('3. expense-growth escalates operating expenses and moderates cash flow and IRR', () => {
    const flatExp = calculateProjectedIrrDetails({
      totalCashInvested: 205400,
      annualPreTaxCashFlow: 8558,
      purchasePrice: 520000,
      loanAmount: 390000,
      interestRatePct: 6.5,
      amortizationYears: 30,
      holdPeriodYears: 5,
      annualAppreciationPct: 3.0,
      sellingCostsPct: 6.0,
      rentGrowthPct: 3.0,
      expenseGrowthPct: 0.0,
      grossAnnualRent: 62400,
      vacancyRatePct: 5.0,
      totalOperatingExpenses: 21142,
      annualDebtService: 29580,
    });

    const growingExp = calculateProjectedIrrDetails({
      totalCashInvested: 205400,
      annualPreTaxCashFlow: 8558,
      purchasePrice: 520000,
      loanAmount: 390000,
      interestRatePct: 6.5,
      amortizationYears: 30,
      holdPeriodYears: 5,
      annualAppreciationPct: 3.0,
      sellingCostsPct: 6.0,
      rentGrowthPct: 3.0,
      expenseGrowthPct: 3.0, // 3% expense escalation matches 3% rent growth
      grossAnnualRent: 62400,
      vacancyRatePct: 5.0,
      totalOperatingExpenses: 21142,
      annualDebtService: 29580,
    });

    // OpEx in year 2 must escalate: 21,142 * 1.03 = 21,776.26
    expect(growingExp.annualProjections[1].opex).toBe(21776.26);
    // OpEx in year 5: 21,142 * 1.03^4 = 23,795.51
    expect(growingExp.annualProjections[4].opex).toBe(23795.51);

    // Higher expenses must strictly decrease NOI and cash flow relative to 0% expense growth
    for (let yr = 2; yr <= 5; yr++) {
      expect(growingExp.annualProjections[yr - 1].noi).toBeLessThan(
        flatExp.annualProjections[yr - 1].noi,
      );
      expect(growingExp.annualProjections[yr - 1].operatingCashFlow).toBeLessThan(
        flatExp.annualProjections[yr - 1].operatingCashFlow,
      );
    }

    // Growing expense IRR must be lower than flat expense IRR
    expect(growingExp.projectedIrrPct!).toBeLessThan(flatExp.projectedIrrPct!);
    expect(growingExp.irrStatus).toBe('converged');
    expect(growingExp.roots[0].npvResidual).toBeLessThan(1e-7);
  });

  // ── Test 4: Appreciation feeding W2-06 method label dynamically ───────────────
  it('4. appreciation rate dynamically feeds terminal value calculation and method label', () => {
    const reconciled45 = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      terminalValueMethod: 'appreciation_pct',
      appreciationPct: 4.5,
      rentGrowthPct: 0,
      expenseGrowthPct: 0,
    });

    expect(reconciled45.terminalValueLabel).toBe('Exit @ 4.5%/yr on $520,000 purchase price');
    // 520,000 * (1.045)^5 = 648,015 (rounds to nearest integer)
    expect(reconciled45.estimatedExitValue).toBe(648015);
    expect(reconciled45.annualAppreciationPct).toBe(4.5);

    // Check with default (omitted) appreciationPct
    const reconciledDefault = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      terminalValueMethod: 'appreciation_pct',
      rentGrowthPct: 0,
      expenseGrowthPct: 0,
    });

    expect(reconciledDefault.terminalValueLabel).toBe('Exit @ 3.0%/yr on $520,000 purchase price');
    expect(reconciledDefault.estimatedExitValue).toBe(602823);
    expect(reconciledDefault.annualAppreciationPct).toBe(3.0);
  });

  // ── Test 5: Manifest completeness for all new inputs ───────────────────────────
  it('5. assumption manifest registers growth inputs with proper default attribution and handoff preservation', () => {
    // When omitted, defaults are registered
    const defaultReconciled = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
    });

    expect(defaultReconciled.rentGrowthPct).toBe(0.0);
    expect(defaultReconciled.expenseGrowthPct).toBe(0.0);
    expect(defaultReconciled.annualAppreciationPct).toBe(3.0);
    expect(defaultReconciled.appreciationBase).toBe('purchase_price');
    expect(defaultReconciled.annualProjections).toBeDefined();
    expect(defaultReconciled.annualProjections.length).toBe(5);

    // Verify Deal Calculator -> Project handoff preserves growth inputs and appreciationBase
    const projectPayload = transformCalculatorToProject({
      address: '1247 Elm Street, Austin, TX',
      purchasePrice: 520000,
      rehabBudget: 59800,
      estimatedARV: 680000,
      grossRentMonthly: 5200,
      operatingExpenseRatioPct: 33.88,
      targetLtvPct: 75,
      interestRatePct: 6.5,
      amortizationYears: 30,
      terminalValueMethod: 'appreciation_pct',
      appreciationBase: 'arv',
      rentGrowthPct: 2.5,
      expenseGrowthPct: 1.5,
      appreciationPct: 4.0,
      createdByUid: 'investor-uuid-123',
    });

    const inputs = projectPayload.underwritingSnapshot.inputs as Record<string, unknown>;
    expect(inputs.rentGrowthPct).toBe(2.5);
    expect(inputs.expenseGrowthPct).toBe(1.5);
    expect(inputs.appreciationPct).toBe(4.0);
    expect(inputs.appreciationBase).toBe('arv');

    const outputs = projectPayload.underwritingSnapshot.outputs;
    expect(outputs.rentGrowthPct).toBe(2.5);
    expect(outputs.expenseGrowthPct).toBe(1.5);
    expect(outputs.annualAppreciationPct).toBe(4.0);
    expect(outputs.appreciationBase).toBe('arv');
    expect(outputs.annualProjections).toBeDefined();
    expect(outputs.annualProjections).toHaveLength(5);
  });

  // ── Test 6: Flag-off / zero-growth byte-identical output vs v3 baseline ─────────
  it('6. zero-growth produces byte-identical output to v3 baseline without drift', () => {
    const baseResult = reconcileAcquisitionUnderwriting(canonicalDemoDeal);
    const zeroGrowthResult = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      rentGrowthPct: 0.0,
      expenseGrowthPct: 0.0,
    });

    expect(zeroGrowthResult.totalCostBasis).toBe(baseResult.totalCostBasis);
    expect(zeroGrowthResult.loanAmount).toBe(baseResult.loanAmount);
    expect(zeroGrowthResult.cashRequired).toBe(baseResult.cashRequired);
    expect(zeroGrowthResult.netOperatingIncome).toBe(baseResult.netOperatingIncome);
    expect(zeroGrowthResult.monthlyDebtService).toBe(baseResult.monthlyDebtService);
    expect(zeroGrowthResult.annualDebtService).toBe(baseResult.annualDebtService);
    expect(zeroGrowthResult.annualNetCashFlow).toBe(baseResult.annualNetCashFlow);
    expect(zeroGrowthResult.capRateOnCost).toBe(baseResult.capRateOnCost);
    expect(zeroGrowthResult.cashOnCashReturnPct).toBe(baseResult.cashOnCashReturnPct);
    expect(zeroGrowthResult.projectedIrrPct).toBe(baseResult.projectedIrrPct);
    expect(zeroGrowthResult.irrStatus).toBe(baseResult.irrStatus);
    expect(zeroGrowthResult.irrCashFlowVector).toEqual(baseResult.irrCashFlowVector);
    expect(zeroGrowthResult.estimatedExitValue).toBe(baseResult.estimatedExitValue);
    expect(zeroGrowthResult.isNegativeLeverage).toBe(baseResult.isNegativeLeverage);
  });

  // ── Test 7: Growth path and base path share identical ADS derivation ─────────
  it('7. asserts growth-projection path and base path emit identical debt service for identical loan terms', () => {
    const baseResult = reconcileAcquisitionUnderwriting(canonicalDemoDeal);
    const growthResult = calculateProjectedIrrDetails({
      totalCashInvested: canonicalDemoDeal.cashRequired,
      annualPreTaxCashFlow: baseResult.annualNetCashFlow,
      purchasePrice: canonicalDemoDeal.purchasePrice,
      loanAmount: canonicalDemoDeal.loanAmount,
      interestRatePct: canonicalDemoDeal.interestRatePct,
      amortizationYears: canonicalDemoDeal.amortizationYears,
      holdPeriodYears: 5,
      annualAppreciationPct: canonicalDemoDeal.annualAppreciationPct,
      sellingCostsPct: canonicalDemoDeal.sellingCostsPct,
      rentGrowthPct: 3.0,
      expenseGrowthPct: 0.0,
      grossAnnualRent: canonicalDemoDeal.annualGrossRent,
      vacancyRatePct: canonicalDemoDeal.vacancyRatePct,
      totalOperatingExpenses: canonicalDemoDeal.operatingExpensesAnnual,
      annualDebtService: baseResult.annualDebtService,
    });

    // Both paths must emit identical annual debt service ($29,581)
    expect(baseResult.annualDebtService).toBe(29581);
    expect(growthResult.annualProjections[0].debtService).toBe(baseResult.annualDebtService);
    for (const yr of growthResult.annualProjections) {
      expect(yr.debtService).toBe(baseResult.annualDebtService);
    }
  });
});
