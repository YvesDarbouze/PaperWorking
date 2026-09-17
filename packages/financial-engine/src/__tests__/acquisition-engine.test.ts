import {
  computeMAO,
  reconcileAcquisitionUnderwriting,
  transformCalculatorToProject,
  generateUnderContractTasks,
} from '../index.js';

describe('Acquisition Engine Unit Tests', () => {
  describe('computeMAO (Maximum Allowable Offer / 70% Rule)', () => {
    it('computes standard 70% rule MAO accurately with buyer closing costs', () => {
      // ARV $500,000, Rehab $50,000, Closing $10,000 -> (500k * 0.70) - 50k - 10k = $290,000
      const result = computeMAO(500000, 50000, 0.70, 10000);
      expect(result.mao).toBe(290000);
      expect(result.maxAllowablePurchasePrice).toBe(290000);
      expect(result.rawMao).toBe(290000);
      expect(result.isViable).toBe(true);
      expect(result.ruleMultiplier).toBe(0.70);
      expect(result.formulaDescription).toContain('(500,000 × 70%) - 50,000 - 10,000');
    });

    it('computes MAO without closing costs', () => {
      // ARV $400,000, Rehab $60,000 -> (400k * 0.70) - 60k = $220,000
      const result = computeMAO(400000, 60000, 0.70);
      expect(result.mao).toBe(220000);
      expect(result.isViable).toBe(true);
      expect(result.formulaDescription).toBe('(400,000 × 70%) - 60,000');
    });

    it('flags unviable deal when rehab exceeds 70% of ARV', () => {
      // ARV $200,000, Rehab $160,000 -> (200k * 0.70) - 160k = 140k - 160k = -$20,000
      const result = computeMAO(200000, 160000, 0.70);
      expect(result.mao).toBe(0); // Guarded non-negative
      expect(result.rawMao).toBe(-20000);
      expect(result.isViable).toBe(false);
    });

    it('supports custom rule multipliers (e.g. 75% rule for hot markets)', () => {
      // ARV $600,000, Rehab $40,000, Rule 75% -> (600k * 0.75) - 40k = 450k - 40k = $410,000
      const result = computeMAO(600000, 40000, 0.75);
      expect(result.mao).toBe(410000);
      expect(result.ruleMultiplier).toBe(0.75);
    });
  });

  describe('reconcileAcquisitionUnderwriting', () => {
    it('accurately reconciles underwriting parameters and metrics', () => {
      const inputs = {
        purchasePrice: 520000,
        rehabBudget: 65000,
        estimatedARV: 680000,
        grossRentMonthly: 4500,
        operatingExpenseRatioPct: 35.0,
        vacancyRatePct: 5.0,
        targetLtvPct: 75.0,
        interestRatePct: 6.5,
        amortizationYears: 30,
        buyerClosingCostsPct: 2.0,
        terminalValueMethod: 'appreciation_pct' as const,
      };

      const result = reconcileAcquisitionUnderwriting(inputs);

      // Basis: $520k + $10,400 (closing) + $65k (rehab) = $595,400
      expect(result.buyerClosingCostsAmount).toBe(10400);
      expect(result.totalCostBasis).toBe(595400);

      // Loan: 75% of $520,000 = $390,000
      expect(result.loanAmount).toBe(390000);
      expect(result.cashRequired).toBe(205400); // 595,400 - 390,000

      // Income: $54,000/yr gross; 5% vac -> $51,300 GOI; 35% opex ($18,900) -> NOI $32,400
      expect(result.grossOperatingIncome).toBe(51300);
      expect(result.totalOperatingExpenses).toBe(18900);
      expect(result.netOperatingIncome).toBe(32400);

      // Debt Service: $390k at 6.5% for 30 yrs -> $2,465.07/mo ($29,581/yr)
      expect(result.monthlyDebtService).toBeCloseTo(2465.07, 2);
      expect(result.annualDebtService).toBe(29581);
      expect(result.annualNetCashFlow).toBe(2819); // 32,400 - 29,581

      // Financial Ratios
      expect(result.capRateOnCost).toBeCloseTo(5.4, 1); // 32,400 / 595,400 = 5.44%
      expect(result.cashOnCashReturnPct).toBeCloseTo(1.4, 1); // 2,820 / 205,400 = 1.37%
      expect(result.dscr).toBeCloseTo(1.10, 2); // 32,400 / 29,580 = 1.095
      expect(result.ltvPct).toBe(75.0);
      expect(result.grossRentMultiplier).toBeCloseTo(9.6, 1); // 520,000 / 54,000 = 9.63
      expect(result.monthlyNetCashFlow).toBe(Math.round(result.annualNetCashFlow / 12));
      expect(typeof result.projectedFlipProfit).toBe('number');

      // MAO (70% Rule): (680,000 * 0.70) - 65,000 - 10,400 = 476,000 - 75,400 = $400,600
      expect(result.maximumAllowableOffer70Pct).toBe(400600);

      // IRR solver
      expect(result.projectedIrrPct).toBeGreaterThan(0);
    });

    it('reconciles canonical demo deal to exact golden metrics (6.4% Cap, 4.2% CoC, 3.8% True DCF IRR)', () => {
      const canonicalResult = reconcileAcquisitionUnderwriting({
        purchasePrice: 520000,
        rehabBudget: 59800,
        estimatedARV: 680000,
        grossRentMonthly: 5200,
        operatingExpensesAnnual: 21142,
        operatingExpenseRatioPct: (21142 / (5200 * 12)) * 100,
        vacancyRatePct: 5.0,
        targetLtvPct: 75.0,
        interestRatePct: 6.5,
        amortizationYears: 30,
        buyerClosingCostsPct: 3.0,
        holdPeriodYears: 5,
        annualAppreciationPct: 3.0,
        sellingCostsPct: 6.0,
        terminalValueMethod: 'appreciation_pct',
      });

      expect(canonicalResult.totalCostBasis).toBe(595400);
      expect(canonicalResult.loanAmount).toBe(390000);
      expect(canonicalResult.cashRequired).toBe(205400);
      expect(canonicalResult.netOperatingIncome).toBe(38138);
      expect(canonicalResult.annualDebtService).toBe(29581);
      expect(canonicalResult.capRateOnCost).toBe(6.4);
      expect(canonicalResult.cashOnCashReturnPct).toBe(4.2);
      expect(canonicalResult.projectedIrrPct).toBe(3.8);
    });

    it('returns projectedIrrPct: null when cashRequired is 0 or flows do not converge', () => {
      const result = reconcileAcquisitionUnderwriting({
        purchasePrice: 100000,
        rehabBudget: 0,
        estimatedARV: 125000,
        targetLtvPct: 100, // 100% LTV, so cashRequired = buyerClosingCosts
        buyerClosingCostsPct: 0, // cashRequired = 0
        grossRentMonthly: 0,
        terminalValueMethod: 'appreciation_pct',
      });
      expect(result.projectedIrrPct).toBeNull();
    });
  });

  describe('transformCalculatorToProject (Handoff & Lineage)', () => {
    it('transforms deal calculator inputs into a project payload with immutable snapshot and downstream seeding', () => {
      const transformInput = {
        address: '1247 Elm Street, Austin, TX 78702',
        purchasePrice: 485000,
        rehabBudget: 50000,
        estimatedARV: 620000,
        grossRentMonthly: 3800,
        operatingExpenseRatioPct: 35.0,
        targetLtvPct: 75.0,
        interestRatePct: 6.5,
        amortizationYears: 30,
        strategy: 'flip' as const,
        createdByUid: 'user-investor-42',
        organizationId: 'org-austin-1',
        assumptionsNotes: 'High conviction submarket; comparable sales at $620k+.',
      };

      const project = transformCalculatorToProject(transformInput);

      expect(project.id).toMatch(/^proj-/);
      expect(project.propertyName).toBe('1247 Elm Street');
      expect(project.address).toBe('1247 Elm Street, Austin, TX 78702');
      expect(project.currentPhase).toBe(1);
      expect(project.phase).toBe('acquisition');
      expect(project.acquisitionStatus).toBe('analyzing');
      expect(project.ownerUid).toBe('user-investor-42');

      // Underwriting Snapshot Lineage
      expect(project.underwritingSnapshot).toBeDefined();
      expect(project.underwritingSnapshot.source).toBe('deal_calculator');
      expect(project.underwritingSnapshot.inputs.purchasePrice).toBe(485000);
      expect(project.underwritingSnapshot.outputs.loanAmount).toBe(Math.round(485000 * 0.75));
      expect(project.underwritingSnapshot.assumptions.notes).toBe(
        'High conviction submarket; comparable sales at $620k+.',
      );

      // Downstream REIL phase seeding
      expect(project.downstreamSeeding.hold.budget.allocatedTotal).toBe(50000);
      expect(project.downstreamSeeding.fund.loan.targetLoanAmount).toBe(Math.round(485000 * 0.75));
      expect(project.downstreamSeeding.fund.loan.targetLtvPct).toBe(75.0);
      expect(project.downstreamSeeding.fund.loan.interestRatePct).toBe(6.5);
    });
  });

  describe('generateUnderContractTasks', () => {
    it('generates 11 standardized acquisition milestone tasks anchored to contractual dates', () => {
      const config = {
        projectId: 'proj-1247-elm',
        executionDate: '2026-10-01T12:00:00.000Z',
        closingDate: '2026-10-31T17:00:00.000Z',
        inspectionPeriodDays: 10,
        financingContingencyDays: 21,
      };

      const tasks = generateUnderContractTasks(config);

      expect(tasks).toHaveLength(11);
      for (const t of tasks) {
        expect(t.isAutoGenerated).toBe(true);
        expect(t.status).toBe('pending');
        expect(t.projectId).toBe('proj-1247-elm');
      }

      // Check task titles
      const titles = tasks.map((t) => t.title);
      expect(titles).toContain('Wire Earnest Money Deposit (EMD)');
      expect(titles).toContain('Schedule General Property Inspection');
      expect(titles).toContain('Request Title Search & Commitment');
      expect(titles).toContain('Order Property Appraisal');
      expect(titles).toContain('Conduct Contractor Scope of Work (SOW) Walk');
      expect(titles).toContain('Review Environmental & Municipal Records');
      expect(titles).toContain('Collect & Audit Tenant Rent Roll');
      expect(titles).toContain('Satisfy or Waive Inspection Contingency');
      expect(titles).toContain('Confirm Loan Approval / Clear-to-Close');
      expect(titles).toContain('Review Preliminary Closing Disclosure (ALTA)');
      expect(titles).toContain('Initiate Final Closing Wire');

      // Verify EMD due date is 3 days from execution (2026-10-04)
      const emdTask = tasks.find((t) => t.title.includes('Earnest Money'));
      expect(new Date(emdTask!.dueDate).getUTCDate()).toBe(4);

      // Verify Final Wire is 1 day before closing (2026-10-30)
      const wireTask = tasks.find((t) => t.title.includes('Final Closing Wire'));
      expect(new Date(wireTask!.dueDate).getUTCDate()).toBe(30);
    });
  });
});
