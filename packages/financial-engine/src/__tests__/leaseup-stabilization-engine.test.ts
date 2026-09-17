import {
  canonicalDemoDeal,
  reconcileAcquisitionUnderwriting,
  transformCalculatorToProject,
} from '../index.js';

describe('MISSION W2-11: Lease-Up Assumptions, Ramp Modeling & Post-Stabilization Vacancy', () => {
  // ── Test 1: Lease-Up OFF Produces Byte-Identical Canonical Outputs ───────────
  it('1. lease-up OFF produces byte-identical canonical outputs (regression golden)', () => {
    // Calling with lease-up explicitly 0 or omitted
    const offDealExplicit = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      stabilizationMonths: 0,
      monthsVacantAtClose: 0,
      concessionsMonths: 0,
      leaseUpRentRampPct: 100,
    });

    const offDealOmitted = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
    });

    // Byte-identical to Round-9 verified baseline
    expect(offDealExplicit.isLeaseUpActive).toBe(false);
    expect(offDealExplicit.grossOperatingIncome).toBe(59280);
    expect(offDealExplicit.totalOperatingExpenses).toBe(21142);
    expect(offDealExplicit.netOperatingIncome).toBe(38138);
    expect(offDealExplicit.annualNetCashFlow).toBe(8557);
    expect(offDealExplicit.monthlyNetCashFlow).toBe(713);
    expect(offDealExplicit.capRateOnCost).toBe(6.4);
    expect(offDealExplicit.cashOnCashReturnPct).toBe(4.2);
    expect(offDealExplicit.dscr).toBe(1.29);
    expect(offDealExplicit.projectedIrrPct).toBe(3.8);
    expect(offDealExplicit.irrStatus).toBe('converged');
    expect(offDealExplicit.irrCashFlowVector).toEqual([-205400, 8557, 8557, 8557, 8557, 210128]);

    // Omitted parameters match explicit 0-month parameters
    expect(offDealOmitted.grossOperatingIncome).toBe(offDealExplicit.grossOperatingIncome);
    expect(offDealOmitted.netOperatingIncome).toBe(offDealExplicit.netOperatingIncome);
    expect(offDealOmitted.annualNetCashFlow).toBe(offDealExplicit.annualNetCashFlow);
    expect(offDealOmitted.projectedIrrPct).toBe(offDealExplicit.projectedIrrPct);
    expect(offDealOmitted.irrCashFlowVector).toEqual(offDealExplicit.irrCashFlowVector);
  });

  // ── Test 2: Canonical Deal + 6-Month Lease-Up at 50% Rent ─────────────────────
  it('2. canonical deal + 6-month lease-up at 50% rent matches hand-computed Y1 CF and 2.4% IRR to the cent', () => {
    // Hand-computation specification:
    // - Gross rent: $5,200/mo ($62,400/yr)
    // - Months 1-6 (Lease-up @ 50% rent, 0% vacancy): 6 * $5,200 * 0.50 = $15,600
    // - Months 7-12 (Post-stabilization @ 100% rent, 5% vacancy): 6 * $5,200 * 0.95 = $29,640
    // - Year 1 GOI: $15,600 + $29,640 = $45,240
    // - Year 1 OpEx: $21,142
    // - Year 1 NOI: $45,240 - $21,142 = $24,098
    // - Year 1 Debt Service: $29,581 ($2,465.07/mo)
    // - Year 1 Net Cash Flow: $24,098 - $29,581 = -$5,483 (-$457/mo)
    // - Stabilized NOI: $38,138
    // - Stabilized Cash Flow: $8,557
    // - Multi-year cash flow vector: [-205400, -5483, 8557, 8557, 8557, 210128]
    // - Solved IRR root: 2.3784% -> 2.4%
    const leaseUpDeal = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      stabilizationMonths: 6,
      leaseUpRentRampPct: 50,
      monthsVacantAtClose: 0,
      concessionsMonths: 0,
    });

    expect(leaseUpDeal.isLeaseUpActive).toBe(true);
    expect(leaseUpDeal.stabilizationMonths).toBe(6);
    expect(leaseUpDeal.leaseUpRentRampPct).toBe(50);

    // Year 1 Operations reflect ramp
    expect(leaseUpDeal.grossOperatingIncome).toBe(45240);
    expect(leaseUpDeal.totalOperatingExpenses).toBe(21142);
    expect(leaseUpDeal.netOperatingIncome).toBe(24098);
    expect(leaseUpDeal.annualNetCashFlow).toBe(-5483);
    expect(leaseUpDeal.monthlyNetCashFlow).toBe(-457);

    // Stabilized run-rate metrics preserved
    expect(leaseUpDeal.stabilizedGrossOperatingIncome).toBe(59280);
    expect(leaseUpDeal.stabilizedNetOperatingIncome).toBe(38138);
    expect(leaseUpDeal.stabilizedAnnualCashFlow).toBe(8557);

    // Multi-year projection schedule
    expect(leaseUpDeal.annualProjections).toBeDefined();
    const projections = leaseUpDeal.annualProjections!;
    expect(projections).toHaveLength(5);

    // Year 1 reflects lease-up ramp
    expect(projections[0].year).toBe(1);
    expect(projections[0].grossRent).toBe(62400);
    expect(projections[0].vacancyAmount).toBe(17160); // Total downtime & ramp discount
    expect(projections[0].goi).toBe(45240);
    expect(projections[0].opex).toBe(21142);
    expect(projections[0].noi).toBe(24098);
    expect(projections[0].debtService).toBe(29581);
    expect(projections[0].operatingCashFlow).toBe(-5483);

    // Years 2-5 are fully stabilized
    for (let yr = 2; yr <= 5; yr++) {
      expect(projections[yr - 1].year).toBe(yr);
      expect(projections[yr - 1].goi).toBe(59280);
      expect(projections[yr - 1].noi).toBe(38138);
      expect(projections[yr - 1].operatingCashFlow).toBe(8557);
    }

    // Exact equity cash flow vector
    expect(leaseUpDeal.irrCashFlowVector).toEqual([-205400, -5483, 8557, 8557, 8557, 210128]);

    // Solved Projected IRR
    expect(leaseUpDeal.irrStatus).toBe('converged');
    expect(leaseUpDeal.projectedIrrPct).toBe(2.4);
    expect(leaseUpDeal.irrRoots).toHaveLength(1);
    expect(leaseUpDeal.irrRoots[0].ratePct).toBeCloseTo(2.3784, 3);
    expect(leaseUpDeal.irrRoots[0].npvResidual).toBeLessThan(1e-7);
  });

  // ── Test 3: Concessions Reduce Effective Rent Correctly ───────────────────────
  it('3. concessions reduce effective rent correctly by exact free rent amount', () => {
    // 1 month free concession on $5,200/mo rent with 6-month lease-up at 100%
    // - Months 1-6 rent: 6 * $5,200 = $31,200
    // - Concession: -$5,200 -> $26,000
    // - Months 7-12 (5% vacancy): 6 * $5,200 * 0.95 = $29,640
    // - Total Year 1 Rent: $26,000 + $29,640 = $55,640
    const withConcession = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      stabilizationMonths: 6,
      leaseUpRentRampPct: 100,
      concessionsMonths: 1,
    });

    const withoutConcession = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      stabilizationMonths: 6,
      leaseUpRentRampPct: 100,
      concessionsMonths: 0,
    });

    expect(withConcession.grossOperatingIncome).toBe(55640);
    expect(withoutConcession.grossOperatingIncome).toBe(60840);
    expect(withoutConcession.grossOperatingIncome - withConcession.grossOperatingIncome).toBe(5200);

    // 2 months free concession
    const withTwoConcessions = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      stabilizationMonths: 6,
      leaseUpRentRampPct: 100,
      concessionsMonths: 2,
    });
    expect(withTwoConcessions.grossOperatingIncome).toBe(55640 - 5200);
  });

  // ── Test 4: Vacancy Applies Only Post-Stabilization ───────────────────────────
  it('4. vacancy applies only post-stabilization and does not double-count during lease-up', () => {
    // During 6-month lease-up at 100% rent with 0 concessions:
    // - Months 1-6: 6 * $5,200 = $31,200 (NO vacancy subtracted)
    // - Months 7-12: 6 * $5,200 * (1 - vacancy) = $29,640 (at 5% vacancy)
    // Total: $60,840
    const deal5PctVacancy = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      stabilizationMonths: 6,
      leaseUpRentRampPct: 100,
      concessionsMonths: 0,
      monthsVacantAtClose: 0,
      vacancyRatePct: 5.0,
    });

    expect(deal5PctVacancy.grossOperatingIncome).toBe(60840);

    // Changing post-stabilization vacancy to 10% ONLY impacts Months 7-12:
    // - Months 1-6: $31,200 (identical!)
    // - Months 7-12: 6 * $5,200 * 0.90 = $28,080
    // Total: $31,200 + $28,080 = $59,280
    const deal10PctVacancy = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      stabilizationMonths: 6,
      leaseUpRentRampPct: 100,
      concessionsMonths: 0,
      monthsVacantAtClose: 0,
      vacancyRatePct: 10.0,
    });

    expect(deal10PctVacancy.grossOperatingIncome).toBe(59280);
    // Difference between 5% and 10% vacancy on 6 months is exactly: 6 * 5200 * 0.05 = $1,560
    expect(deal5PctVacancy.grossOperatingIncome - deal10PctVacancy.grossOperatingIncome).toBe(1560);
  });

  // ── Test 5: Sealed Calculation Manifest Completeness ─────────────────────────
  it('5. manifest completeness: seals all lease-up inputs in underwritingSnapshot and outputs', () => {
    const payload = transformCalculatorToProject({
      address: '1247 Elm Street, Austin, TX',
      purchasePrice: 520000,
      rehabBudget: 59800,
      buyerClosingCostsPct: 3.0,
      estimatedARV: 680000,
      grossRentMonthly: 5200,
      operatingExpenseRatioPct: 33.88,
      targetLtvPct: 75,
      interestRatePct: 6.5,
      amortizationYears: 30,
      terminalValueMethod: 'appreciation_pct',
      stabilizationMonths: 6,
      monthsVacantAtClose: 1,
      concessionsMonths: 1,
      leaseUpRentRampPct: 60,
      createdByUid: 'investor-uuid-123',
    });

    const inputs = payload.underwritingSnapshot.inputs as Record<string, unknown>;
    expect(inputs.stabilizationMonths).toBe(6);
    expect(inputs.monthsVacantAtClose).toBe(1);
    expect(inputs.concessionsMonths).toBe(1);
    expect(inputs.leaseUpRentRampPct).toBe(60);

    const outputs = payload.underwritingSnapshot.outputs;
    expect(outputs.isLeaseUpActive).toBe(true);
    expect(outputs.stabilizationMonths).toBe(6);
    expect(outputs.monthsVacantAtClose).toBe(1);
    expect(outputs.concessionsMonths).toBe(1);
    expect(outputs.leaseUpRentRampPct).toBe(60);
    expect(outputs.stabilizedGrossOperatingIncome).toBeDefined();
    expect(outputs.stabilizedNetOperatingIncome).toBeDefined();
    expect(outputs.stabilizedAnnualCashFlow).toBeDefined();
  });
});
