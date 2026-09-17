import { describe, expect, it } from '@jest/globals';
import {
  reconcileAcquisitionUnderwriting,
  transformCalculatorToProject,
} from '../acquisition-engine.js';
import { canonicalDemoDeal } from '../fixtures/canonical-demo-deal.js';

describe('MISSION W2-10: Loan Structures & Payment-Shock Transparency', () => {
  // ── Test 1: IO Golden Hand-Check ──────────────────────────────────────────
  it('1. IO golden: computes exact hand-calculated payment ($390,000 × 6.5% / 12 = $2,112.50/mo)', () => {
    // Hand-computation check:
    // Loan: $390,000
    // Rate: 6.5% annual = 0.065
    // Monthly IO: 390,000 * 0.065 / 12 = 25,350 / 12 = $2,112.50
    // Annual IO Debt Service: $2,112.50 * 12 = $25,350.00
    const expectedMonthlyIO = 2112.5;
    const expectedAnnualIO = 25350;

    const ioDeal = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      loanType: 'interest_only',
      ioPeriodYears: 5,
    });

    expect(ioDeal.loanType).toBe('interest_only');
    expect(ioDeal.ioPeriodYears).toBe(5);
    expect(ioDeal.monthlyDebtService).toBe(expectedMonthlyIO);
    expect(ioDeal.annualDebtService).toBe(expectedAnnualIO);
  });

  // ── Test 2: DSCR, CoC, and IRR Recompute Under IO ─────────────────────────
  it('2. DSCR, CoC, and IRR recompute under IO with unreduced loan balance at exit', () => {
    // Canonical NOI: $38,138
    // Annual Debt Service: $25,350
    // DSCR: 38,138 / 25,350 = 1.5044... -> 1.50
    // Net Cash Flow: 38,138 - 25,350 = $12,788/yr ($1,065.67/mo)
    // Cash Required: $205,400
    // CoC: 12,788 / 205,400 = 6.2259% -> 6.2%
    const ioDeal = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      loanType: 'interest_only',
      ioPeriodYears: 5,
    });

    expect(ioDeal.dscr).toBe(1.5);
    expect(ioDeal.cashOnCashReturnPct).toBe(6.2);
    expect(ioDeal.annualNetCashFlow).toBe(12788);
    expect(ioDeal.monthlyNetCashFlow).toBe(1066);

    // Multi-Year DCF Verification under IO:
    expect(ioDeal.annualProjections).toBeDefined();
    const projections = ioDeal.annualProjections!;
    expect(projections.length).toBe(5);

    // Years 1-5 debt service is flat IO $25,350
    for (let yr = 1; yr <= 5; yr++) {
      expect(projections[yr - 1].debtService).toBe(25350);
      expect(projections[yr - 1].operatingCashFlow).toBe(12788);
      // Principal is unreduced during IO period: full $390,000 balance
      expect(projections[yr - 1].loanBalance).toBe(390000);
    }

    // At Exit (Year 5):
    // Gross Exit Value: $520,000 * (1.03)^5 = $602,823
    // Selling Costs (6%): $36,169
    // Net Sale Proceeds = 602,823 - 36,169 - 390,000 = $176,654
    expect(projections[4].netSaleProceeds).toBe(176654);
    expect(projections[4].totalCashFlow).toBe(12788 + 176654);

    // Solved Projected IRR is positive and fully converged
    expect(ioDeal.irrStatus).toBe('converged');
    expect(ioDeal.projectedIrrPct).toBeGreaterThan(0);
    expect(ioDeal.irrRoots.length).toBe(1);
    expect(ioDeal.irrRoots[0].npvResidual).toBeLessThan(1e-7);
  });

  // ── Test 3: Payment-Shock Disclosure Renders Correct $X and Year N ────────
  it('3. payment-shock disclosure renders with correct $X and year N for IO transition', () => {
    // 5-year IO on 30-year loan: transitions in Year 6
    // Remaining term: 25 years (300 months)
    // Re-amortized payment: $390,000 @ 6.5% over 25 years = $2,633.31/mo
    const io5Deal = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      loanType: 'interest_only',
      ioPeriodYears: 5,
    });

    expect(io5Deal.paymentShock).not.toBeNull();
    const shock5 = io5Deal.paymentShock!;
    expect(shock5.year).toBe(6);
    expect(shock5.previousMonthlyPayment).toBe(2112.5);
    expect(shock5.newMonthlyPayment).toBeCloseTo(2633.31, 2);
    expect(shock5.monthlyIncreaseAmount).toBeCloseTo(520.81, 2);
    expect(shock5.percentageIncrease).toBeCloseTo(24.7, 1);
    expect(shock5.disclosureLabel).toContain('Payment rises to $2,633 in year 6');
    expect(shock5.disclosureLabel).toContain('+$521/mo');

    // 3-year IO on 30-year loan: transitions in Year 4
    // Remaining term: 27 years (324 months)
    // Re-amortized payment: $390,000 @ 6.5% over 27 years = $2,556.66/mo
    const io3Deal = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      loanType: 'interest_only',
      ioPeriodYears: 3,
    });

    expect(io3Deal.paymentShock).not.toBeNull();
    const shock3 = io3Deal.paymentShock!;
    expect(shock3.year).toBe(4);
    expect(shock3.newMonthlyPayment).toBeCloseTo(2556.66, 2);
    expect(shock3.monthlyIncreaseAmount).toBeCloseTo(444.16, 2);
    expect(shock3.disclosureLabel).toContain('Payment rises to $2,557 in year 4');
  });

  // ── Test 4: ARM Adjustment Disclosure ─────────────────────────────────────
  it('4. ARM adjustment disclosure calculates reset payment and year N reset', () => {
    // 5/1 ARM on canonical deal:
    // Fixed period: 5 years @ 6.5% -> initial payment $2,465.07/mo
    // At month 60: principal balance amortized to $365,082.52
    // Reset in Year 6: rate adjusts by +2.0% to 8.5% over remaining 25 years
    // New payment: $2,939.74/mo
    const armDeal = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      loanType: 'arm',
      armFixedPeriodYears: 5,
      armAdjustmentPct: 2.0,
    });

    expect(armDeal.loanType).toBe('arm');
    expect(armDeal.armFixedPeriodYears).toBe(5);
    expect(armDeal.armAdjustmentPct).toBe(2.0);
    expect(armDeal.monthlyDebtService).toBeCloseTo(2465.07, 2);

    expect(armDeal.paymentShock).not.toBeNull();
    const armShock = armDeal.paymentShock!;
    expect(armShock.year).toBe(6);
    expect(armShock.previousMonthlyPayment).toBeCloseTo(2465.07, 2);
    expect(armShock.newMonthlyPayment).toBeCloseTo(2939.74, 1);
    expect(armShock.monthlyIncreaseAmount).toBeCloseTo(474.67, 1);
    expect(armShock.disclosureLabel).toContain('Payment rises to $2,940 in year 6');
    expect(armShock.disclosureLabel).toContain('+2% rate adjustment');
  });

  // ── Test 5: Amortizing Path Unchanged (Regression Golden) ─────────────────
  it('5. amortizing path unchanged: reproduces canonical verified golden numbers to the cent', () => {
    const amortizingDeal = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
      loanType: 'amortizing',
    });

    // Exact match to Round-9 / Round-10 verified numbers
    expect(amortizingDeal.loanType).toBe('amortizing');
    expect(amortizingDeal.paymentShock).toBeNull();
    expect(amortizingDeal.monthlyDebtService).toBeCloseTo(2465.07, 2);
    expect(amortizingDeal.annualDebtService).toBe(29581);
    expect(amortizingDeal.dscr).toBe(1.29);
    expect(amortizingDeal.cashOnCashReturnPct).toBe(4.2);
    expect(amortizingDeal.projectedIrrPct).toBe(3.8);

    // Exact cash flow vector match
    expect(amortizingDeal.irrCashFlowVector).toEqual([
      -205400, 8557, 8557, 8557, 8557, 210128,
    ]);
  });

  // ── Test 6: Manifest Completeness and Provenance ───────────────────────────
  it('6. manifest completeness: loan structure inputs are sealed and preserved in project handoff', () => {
    // Verify default attribution when omitted
    const defaultDeal = reconcileAcquisitionUnderwriting({
      ...canonicalDemoDeal,
    });
    expect(defaultDeal.loanType).toBe('amortizing');
    expect(defaultDeal.paymentShock).toBeNull();

    // Verify Deal Calculator -> Project handoff preserves loan structure
    const projectPayload = transformCalculatorToProject({
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
      loanType: 'interest_only',
      ioPeriodYears: 5,
      createdByUid: 'investor-uuid-123',
    });

    const inputs = projectPayload.underwritingSnapshot.inputs as Record<string, unknown>;
    expect(inputs.loanType).toBe('interest_only');
    expect(inputs.ioPeriodYears).toBe(5);

    const outputs = projectPayload.underwritingSnapshot.outputs;
    expect(outputs.loanType).toBe('interest_only');
    expect(outputs.ioPeriodYears).toBe(5);
    expect(outputs.monthlyDebtService).toBe(2112.5);
    expect(outputs.dscr).toBe(1.5);
    expect(outputs.cashOnCashReturnPct).toBe(6.2);
    expect(outputs.paymentShock).toBeDefined();
    expect(outputs.paymentShock?.year).toBe(6);
    expect(outputs.paymentShock?.disclosureLabel).toContain('Payment rises to $2,633 in year 6');
  });
});
