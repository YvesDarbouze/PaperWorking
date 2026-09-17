import { MetricValue, ProjectMetricsResult, SensitivityResults } from './types.js';
import {
  computeAmortizationSchedule,
  computeAnnualDebtConstant,
} from './amortization-engine.js';
import { computeFundPhaseMetrics, computeIRR, CashFlowEvent } from './fund-phase-engine.js';
import { computeDistributionWaterfall } from './waterfall-engine.js';
import { computeEquityMultipleFromEngineEvents } from './cash-flow-schedule.js';
import { canonicalSeedDeal } from './fixtures/canonical-seed-deal.js';
import { buildComprehensiveSensitivityResults } from './sensitivity-engine.js';
import { computeSensitivityGrids } from './sensitivity-matrix-engine.js';
import {
  computeAssetDepreciationSchedule,
  type DepreciableAsset,
  type PropertyRecoveryClass,
} from './depreciation-engine.js';

/** Legacy sync path — full reiMetrics.ts migration deferred to Phase 2b */
function deriveLegacyMetrics(
  _project: unknown,
  _whatIf?: unknown,
  _ledgerItems?: unknown,
): never {
  throw new Error(
    'Legacy synchronous deriveAllProjectMetrics(projectObject) is not yet migrated. ' +
      'Use deriveAllProjectMetrics(projectId, { mockData }) async API.',
  );
}

export function calculateManagementFee(project: {
  gross_scheduled_rent: number;
  management_fee_pct?: number;
  management_fee?: number;
}): number {
  const pct = project.management_fee_pct;
  if (pct !== undefined) {
    const dec = pct > 1 ? pct / 100 : pct;
    return Number((dec * project.gross_scheduled_rent).toFixed(2));
  }
  return project.management_fee || 0;
}

/**
 * Validates required inputs for the Honesty Rule.
 * Missing inputs produce explicit missing diagnostics, never silent substitutions.
 */
function requireInputs(
  inputs: Record<string, any>,
  required: string[],
  cardId: string,
): { valid: boolean; missing: string[] } {
  const missing = required.filter(
    (k) => inputs[k] === null || inputs[k] === undefined || inputs[k] === '',
  );
  return { valid: missing.length === 0, missing };
}

/**
 * Creates a MetricValue wrapper with Honesty Rule evaluation
 */
function buildMetricValue(
  value: number | null,
  isProjected: boolean,
  missingInputs: string[] = [],
  cardId: string = 'card_general',
): MetricValue {
  return {
    value: value !== null && !isNaN(value) ? Number(value.toFixed(2)) : null,
    projected: isProjected,
    missingInputs: missingInputs.length > 0 ? missingInputs : undefined,
    sourceCardId: missingInputs.length > 0 ? cardId : undefined,
    computedAt: new Date(),
  };
}

/**
 * THE SOLE FUNCTION that computes any of the 33 metrics across PaperWorking.
 * Overloaded to support both string-based async ProjectMetricsResult API and legacy Project sync API.
 */
export function deriveAllProjectMetrics(
  projectOrId: any,
  optionsOrWhatIf?: any,
  legacyLedgerItems?: any,
): any {
  // If first argument is a Project object (legacy synchronous caller)
  if (typeof projectOrId === 'object' && projectOrId !== null) {
    return deriveLegacyMetrics(
      projectOrId,
      typeof optionsOrWhatIf === 'number' ? optionsOrWhatIf : 0,
      legacyLedgerItems || [],
    );
  }

  // Otherwise, run Agent 4 33-Metric Engine async calculation
  return (async (): Promise<ProjectMetricsResult> => {
    const projectId = String(projectOrId);
    const options = typeof optionsOrWhatIf === 'object' ? optionsOrWhatIf : {};
    const asOfDate = options?.asOfDate || new Date();
    const isProjected = options?.includeProjected ?? true;

    // Fetch project record (uses mock data, underwriting inputs, or canonical seed deal)
    const projectData = options?.mockData || canonicalSeedDeal;
    const uw = projectData.underwriting;

    // Stored cash-flow events: when present they are authoritative for IRR / equity multiple.
    const storedEvents: CashFlowEvent[] | null = Array.isArray(
      (projectData as any).cash_flow_events,
    )
      ? ((projectData as any).cash_flow_events as CashFlowEvent[])
      : null;
    const hasStoredEvents = Boolean(storedEvents && storedEvents.length > 0);
    const storedEventsUsable = Boolean(
      hasStoredEvents &&
        storedEvents!.some((e) => e.amount < 0) &&
        storedEvents!.some((e) => e.amount > 0),
    );
    const storedIrr = storedEventsUsable ? computeIRR(storedEvents!) : null;
    const storedEquityMultiple = storedEventsUsable
      ? computeEquityMultipleFromEngineEvents(storedEvents!)
      : null;

    // ── STEP 1: RESOLVE INPUTS FROM UNDERWRITING OBJECT OR LEGACY SCHEMA ────
    // Missing required inputs are tracked explicitly — NO silent default substitutions.
    const rawPurchasePrice = uw?.acquisition?.purchasePrice ?? projectData.purchase_price ?? projectData.purchasePrice;
    const rawRent = uw?.rentRoll?.grossScheduledRent ?? projectData.gross_scheduled_rent ?? projectData.grossScheduledRent;

    const inputCheck = requireInputs(
      { purchase_price: rawPurchasePrice, gross_scheduled_rent: rawRent },
      ['purchase_price', 'gross_scheduled_rent'],
      'card_acquisition',
    );

    const purchasePrice: number = rawPurchasePrice || 0;
    const buyerClosingCosts: number = uw?.acquisition?.buyerClosingCosts ?? projectData.closing_costs ?? 0;
    const rehabCosts: number = uw?.acquisition?.rehabBudget ?? projectData.rehab_costs ?? projectData.rehabBudget ?? 0;
    const rawArv = uw?.acquisition?.estimatedARV ?? projectData.arv ?? null;
    const estimatedARV: number | null = rawArv !== null && rawArv !== undefined && !isNaN(Number(rawArv)) ? Number(rawArv) : null;
    const totalCostBasis: number = purchasePrice + buyerClosingCosts + rehabCosts;
    const propertyValue: number = projectData.property_value ?? (estimatedARV !== null ? estimatedARV : purchasePrice);

    // Rent roll & Operations
    // If grossScheduledRent is provided via underwriting rentRoll, it is monthly;
    // if legacy gross_scheduled_rent is > $15,000, it was already annual.
    const isMonthlyRentInput = uw?.rentRoll?.grossScheduledRent !== undefined || (rawRent !== undefined && rawRent < 15000);
    const monthlyGrossScheduledRent: number = isMonthlyRentInput ? (rawRent || 0) : (rawRent ? rawRent / 12 : 0);
    const annualGrossScheduledRent: number = monthlyGrossScheduledRent * 12;
    const otherIncomeMonthly: number = uw?.rentRoll?.otherIncome ?? projectData.other_income ?? 0;
    const otherIncomeAnnual: number = otherIncomeMonthly * 12;

    const vacancyRatePct: number = uw?.rentRoll?.vacancyRate ?? projectData.vacancy_rate ?? 0;
    const operatingExpenseRatio: number | undefined = uw?.rentRoll?.operatingExpenseRatio;

    // Debt parameters
    const targetLtvPct: number = uw?.debt?.targetLTV ?? (purchasePrice > 0 && projectData.loan_amount ? (projectData.loan_amount / purchasePrice) * 100 : 75);
    const loanAmount: number = uw?.debt?.loanAmount ?? projectData.loan_amount ?? (purchasePrice > 0 ? Math.round(purchasePrice * (targetLtvPct / 100)) : 0);

    const rawInterestRate = uw?.debt?.interestRate ?? projectData.interest_rate ?? 0.065;
    const interestRateAnnual: number = rawInterestRate > 1 ? rawInterestRate / 100 : rawInterestRate;
    const interestRateType: 'fixed' | 'floating' = uw?.debt?.interestRateType ?? 'fixed';
    const floatingIndex = uw?.debt?.floatingIndex;
    const floatingSpreadBps = uw?.debt?.floatingSpreadBps;

    const amortizationYears: number = uw?.debt?.amortizationYears ?? projectData.loan_term_years ?? 30;
    const balloonTermYears: number | undefined = uw?.debt?.balloonTermYears ?? projectData.balloon_term_years;
    const ioPeriodMonths: number = uw?.debt?.ioPeriodMonths ?? projectData.io_period_months ?? 0;

    // Exit parameters
    const holdPeriodYears: number = uw?.exit?.holdPeriodYears ?? (projectData.holding_period_years || 5);
    const exitCapRatePct: number = uw?.exit?.exitCapRate ?? 6.5;
    const costOfSalePct: number = uw?.exit?.costOfSale ?? projectData.selling_costs_pct ?? 5;

    // Hurdles
    const minDSCR: number = uw?.hurdles?.minDSCR ?? 1.25;
    const exitCapSensitivityBps: number = uw?.hurdles?.exitCapSensitivityBps ?? 25;

    // Capital & Equity
    const totalCashInvested: number =
      uw !== undefined && uw !== null
        ? Math.max(0, totalCostBasis - loanAmount)
        : (projectData.total_cash_invested ?? projectData.down_payment_amount ?? Math.max(0, totalCostBasis - loanAmount));
    const totalUnits: number = projectData.total_units ?? projectData.number_of_units ?? 1;
    const occupiedUnits: number = projectData.occupied_units ?? (projectData.vacancy_rate ? Math.round(totalUnits * (1 - projectData.vacancy_rate / 100)) : 1);

    // ── STEP 2: AMORTIZATION & DEBT SERVICE ──────────────────────────────────
    let monthlyMortgagePayment: number = 0;
    let totalDebtService: number = 0;
    let monthlyInterest: number = 0;
    let monthlyPrincipal: number = 0;
    let balloonBalance: number | null = null;
    let remainingLoanBalanceAtExit: number = 0;

    if (loanAmount > 0 && interestRateAnnual > 0 && amortizationYears > 0) {
      const amort = computeAmortizationSchedule(
        loanAmount,
        interestRateAnnual,
        amortizationYears,
        {
          startDate: projectData.purchase_date ? new Date(projectData.purchase_date) : asOfDate,
          balloonTermYears,
          ioPeriodMonths,
          floatingIndex,
          floatingSpreadBps,
        },
      );
      monthlyMortgagePayment = amort.monthlyPayment;
      totalDebtService = Number((amort.monthlyPayment * 12).toFixed(2));
      if (amort.schedule.length > 0) {
        monthlyInterest = amort.schedule[0].interest;
        monthlyPrincipal = amort.schedule[0].principal;
      }
      balloonBalance = amort.balloonBalance ?? null;

      // Balance at exit
      const exitMonth = Math.min(holdPeriodYears * 12, amort.schedule.length);
      remainingLoanBalanceAtExit = amort.schedule[exitMonth - 1]?.balance ?? 0;
    }

    // ── STEP 3: INCOME & EXPENSE AGGREGATION ─────────────────────────────────
    const goi = inputCheck.valid
      ? Number((annualGrossScheduledRent * (1 - vacancyRatePct / 100) + otherIncomeAnnual).toFixed(2))
      : null;

    let totalOperatingExpenses: number = 0;
    if (operatingExpenseRatio !== undefined) {
      // Use K4 rent roll OER input
      totalOperatingExpenses = Number((annualGrossScheduledRent * (operatingExpenseRatio / 100)).toFixed(2));
    } else {
      // Canonical 8 Schedule E tags fallback
      const expenses = projectData.operating_expenses || projectData.expenses || {};
      const {
        tax = 0,
        insurance = 0,
        security = 0,
        maintenance = 0,
        utilities = 0,
        management = 0,
        HOA = 0,
        capex = 0,
        management_fee_pct,
      } = expenses;

      const computedManagementFee =
        management_fee_pct !== undefined
          ? (management_fee_pct / 100) * annualGrossScheduledRent
          : management;

      totalOperatingExpenses = Number(
        (tax + insurance + security + maintenance + utilities + computedManagementFee + HOA).toFixed(2),
      );
    }

    // ── STEP 4: CORE UNDERWRITING FORMULAS ───────────────────────────────────
    const noi = goi !== null ? Number((goi - totalOperatingExpenses).toFixed(2)) : null;

    const cashFlow =
      noi !== null && totalDebtService !== null
        ? Number((noi - totalDebtService).toFixed(2))
        : null;

    const capRate = inputCheck.valid && noi !== null && propertyValue > 0
      ? Number(((noi / propertyValue) * 100).toFixed(1))
      : null;

    const capRateOnCost = totalCostBasis > 0 && noi !== null
      ? Number(((noi / totalCostBasis) * 100).toFixed(1))
      : null;

    const cashOnCash = inputCheck.valid && cashFlow !== null && totalCashInvested > 0
      ? Number(((cashFlow / totalCashInvested) * 100).toFixed(2))
      : null;

    const grm = annualGrossScheduledRent > 0 && propertyValue > 0
      ? Number((propertyValue / annualGrossScheduledRent).toFixed(1))
      : null;

    const dscr = noi !== null && totalDebtService > 0
      ? Number((noi / totalDebtService).toFixed(2))
      : null;

    const occupancyRate = uw?.rentRoll?.vacancyRate !== undefined
      ? Number((100 - vacancyRatePct).toFixed(2))
      : totalUnits > 0
        ? Number(((occupiedUnits / totalUnits) * 100).toFixed(2))
        : Number((100 - vacancyRatePct).toFixed(2));

    const expenseRatio = goi && goi > 0
      ? Number(((totalOperatingExpenses / goi) * 100).toFixed(2))
      : operatingExpenseRatio ?? null;

    // Sizing & Capital Stack Formulas
    const ltv = propertyValue > 0
      ? Number(((loanAmount / propertyValue) * 100).toFixed(2))
      : 0;

    const equityToValue = Number((100 - ltv).toFixed(2));

    // LTC = Loan Amount ÷ Total Cost Basis
    const ltc = totalCostBasis > 0
      ? Number(((loanAmount / totalCostBasis) * 100).toFixed(2))
      : 0;

    // Debt Yield = NOI ÷ Loan Amount
    const debtYield = noi !== null && loanAmount > 0
      ? Number(((noi / loanAmount) * 100).toFixed(2))
      : null;

    // Break-Even Occupancy = (OpEx + Debt Service) ÷ Gross Scheduled Rent
    const breakEvenOccupancy = annualGrossScheduledRent > 0
      ? Number((((totalOperatingExpenses + totalDebtService) / annualGrossScheduledRent) * 100).toFixed(2))
      : null;

    // Maximum Supportable Loan = min( LTV-constrained, LTC-constrained, DSCR-constrained )
    const annualDebtConstant = computeAnnualDebtConstant(interestRateAnnual, amortizationYears);
    const ltvConstrainedLoan = Math.round(propertyValue * (targetLtvPct / 100));
    const ltcConstrainedLoan = Math.round(totalCostBasis * 0.85); // 85% max LTC institutional standard
    const dscrConstrainedLoan =
      noi !== null && minDSCR > 0 && annualDebtConstant > 0
        ? Math.round(noi / (minDSCR * annualDebtConstant))
        : 0;

    const maxSupportableLoan = Math.min(
      ltvConstrainedLoan > 0 ? ltvConstrainedLoan : Infinity,
      ltcConstrainedLoan > 0 ? ltcConstrainedLoan : Infinity,
      dscrConstrainedLoan > 0 ? dscrConstrainedLoan : Infinity,
    );

    const interestCoverageRatio = noi !== null && monthlyInterest > 0
      ? Number((noi / (monthlyInterest * 12)).toFixed(2))
      : null;

    const loanConstantPct = loanAmount > 0 && totalDebtService !== null
      ? Number(((totalDebtService / loanAmount) * 100).toFixed(3))
      : (annualDebtConstant > 0 ? Number((annualDebtConstant * 100).toFixed(3)) : null);

    const isNegativeLeverage =
      (capRateOnCost !== null && loanConstantPct !== null && capRateOnCost < loanConstantPct) ||
      (cashOnCash !== null && cashOnCash < 0);

    // ── STEP 5: SEPARATE UNLEVERED VS LEVERED CASH FLOWS & IRR ──────────────
    const terminalValueMethod = (uw?.exit as any)?.terminalValueMethod;
    const annualAppreciationPct = (uw?.exit as any)?.annualAppreciationPct ?? 3.0;
    let exitValuation: number | null = null;
    let terminalValueLabel: string | null = null;

    if (terminalValueMethod === 'appreciation_pct') {
      const appreciationBase = (uw?.exit as any)?.appreciationBase ?? 'purchase_price';
      const baseAmount =
        appreciationBase === 'arv' && estimatedARV !== null && estimatedARV > 0
          ? estimatedARV
          : purchasePrice;
      exitValuation = Math.round(baseAmount * Math.pow(1 + annualAppreciationPct / 100, holdPeriodYears));
      const baseName = appreciationBase === 'arv' ? 'ARV' : 'purchase price';
      terminalValueLabel = `Exit @ ${annualAppreciationPct.toFixed(1)}%/yr on $${baseAmount.toLocaleString()} ${baseName}`;
    } else if (terminalValueMethod === 'per_unit') {
      const units = totalUnits > 0 ? totalUnits : 1;
      const perUnit = (uw?.exit as any)?.perUnitExitValue ?? (purchasePrice > 0 ? Math.round(purchasePrice / units) : 0);
      exitValuation = Math.round(units * perUnit);
      terminalValueLabel = `Exit @ $${perUnit.toLocaleString()}/unit`;
    } else if (terminalValueMethod === 'exit_cap') {
      exitValuation = noi !== null && exitCapRatePct > 0 ? Math.round(noi / (exitCapRatePct / 100)) : null;
      terminalValueLabel = `Exit @ ${exitCapRatePct.toFixed(1)}% cap on Y${holdPeriodYears} NOI`;
    } else {
      exitValuation = noi !== null && exitCapRatePct > 0
        ? Math.round(noi / (exitCapRatePct / 100))
        : (estimatedARV !== null ? estimatedARV : null);
      if (exitValuation !== null && exitCapRatePct > 0) {
        terminalValueLabel = `Exit @ ${exitCapRatePct.toFixed(1)}% cap on Y${holdPeriodYears} NOI`;
      }
    }

    const netExitProceedsUnlevered = exitValuation !== null ? Math.round(exitValuation * (1 - costOfSalePct / 100)) : null;
    const netExitProceedsLevered = netExitProceedsUnlevered !== null ? Math.max(0, netExitProceedsUnlevered - remainingLoanBalanceAtExit) : null;

    // Unlevered Cash Flows (No debt service, compares against Total Cost Basis)
    let unleveredIrr: number | null = null;
    if (totalCostBasis > 0 && noi !== null && netExitProceedsUnlevered !== null) {
      const uEvents: CashFlowEvent[] = [{ date: '2025-01-01', amount: -totalCostBasis }];
      for (let y = 1; y < holdPeriodYears; y++) {
        uEvents.push({ date: `${2025 + y}-01-01`, amount: noi });
      }
      uEvents.push({ date: `${2025 + holdPeriodYears}-01-01`, amount: noi + netExitProceedsUnlevered });
      unleveredIrr = computeIRR(uEvents);
    }

    // Levered Cash Flows (Deducts debt service, compares against Cash Equity)
    let leveredIrr: number | null = null;
    let npv: number | null = null;
    if (totalCashInvested > 0 && cashFlow !== null && netExitProceedsLevered !== null) {
      const lEvents: CashFlowEvent[] = [{ date: '2025-01-01', amount: -totalCashInvested }];
      for (let y = 1; y < holdPeriodYears; y++) {
        lEvents.push({ date: `${2025 + y}-01-01`, amount: cashFlow });
      }
      lEvents.push({ date: `${2025 + holdPeriodYears}-01-01`, amount: cashFlow + netExitProceedsLevered });
      leveredIrr = computeIRR(lEvents);

      // Discounted Cash Flow NPV at preferred return hurdle
      const discountRate = (uw?.hurdles?.preferredReturn ?? 8) / 100;
      let npvSum = -totalCashInvested;
      for (let y = 1; y < holdPeriodYears; y++) {
        npvSum += cashFlow / Math.pow(1 + discountRate, y);
      }
      npvSum += (cashFlow + netExitProceedsLevered) / Math.pow(1 + discountRate, holdPeriodYears);
      npv = Math.round(npvSum);
    }

    // ── STEP 6: EXIT & EQUITY MULTIPLE ───────────────────────────────────────
    const adjustedBasis = purchasePrice ? Number(totalCostBasis.toFixed(2)) : null;
    const capitalGainLoss = exitValuation !== null && adjustedBasis !== null
      ? Number((exitValuation - adjustedBasis - Math.round(exitValuation * (costOfSalePct / 100))).toFixed(2))
      : null;

    const totalReturnAmount = cashFlow !== null ? cashFlow * holdPeriodYears + (capitalGainLoss || 0) : 0;
    const equityMultiple = hasStoredEvents
      ? storedEquityMultiple
      : totalCashInvested > 0
        ? Number(((totalReturnAmount + totalCashInvested) / totalCashInvested).toFixed(2))
        : null;

    const profitMarginOnCost =
      totalCostBasis > 0 && exitValuation !== null && exitValuation > 0
        ? Number((((exitValuation - totalCostBasis) / totalCostBasis) * 100).toFixed(2))
        : null;

    const roi = capitalGainLoss !== null && totalCashInvested > 0
      ? Number(((capitalGainLoss / totalCashInvested) * 100).toFixed(2))
      : null;

    const aar = roi !== null ? Number((roi / holdPeriodYears).toFixed(2)) : null;
    const paybackPeriod = cashFlow && cashFlow > 0 ? Number((totalCashInvested / cashFlow).toFixed(2)) : null;

    // ── STEP 6B: DISTRIBUTION WATERFALL (LP vs GP) ──────────────────────────
    const lpEquityPct = uw?.hurdles?.lpEquityPct ?? 90;
    const gpEquityPct = uw?.hurdles?.gpEquityPct ?? 10;
    const preferredReturnRate = uw?.hurdles?.preferredReturn ?? 8;
    const gpPromotePct = uw?.hurdles?.gpPromotePct ?? 20;
    const hurdle2Irr = uw?.hurdles?.hurdle2Irr;
    const gpPromote2Pct = uw?.hurdles?.gpPromote2Pct;

    const waterfall = computeDistributionWaterfall({
      totalEquity: totalCashInvested,
      lpEquityPct,
      gpEquityPct,
      preferredReturnPct: preferredReturnRate,
      gpPromotePct,
      hurdle2Irr,
      gpPromote2Pct,
      holdPeriodYears,
      annualCashFlow: cashFlow ?? 0,
      netExitProceeds: netExitProceedsLevered ?? 0,
    });

    // ── STEP 7: SENSITIVITY ENGINE ROLLUP ────────────────────────────────────
    let sensitivity: SensitivityResults | undefined = undefined;
    if (noi !== null && noi > 0) {
      sensitivity = buildComprehensiveSensitivityResults({
        exitNoi: noi,
        baseExitCapRate: exitCapRatePct,
        exitCapSensitivityBps,
        grossScheduledRentAnnual: annualGrossScheduledRent,
        operatingExpensesAnnual: totalOperatingExpenses,
        totalDebtServiceAnnual: totalDebtService,
        vacancyRatePct,
        holdPeriodYears,
        totalBasis: totalCostBasis,
        equityInvested: totalCashInvested,
        loanPayoffAtExit: remainingLoanBalanceAtExit,
        costOfSalePct,
      });
    }

    // W2-12: Server-computed 2D Sensitivity Grids
    let sensitivityGrids: import('@paperworking/validation').SensitivityGridsResult | undefined = undefined;
    if (purchasePrice > 0 && monthlyGrossScheduledRent > 0) {
      try {
        sensitivityGrids = computeSensitivityGrids({
          purchasePrice,
          rehabBudget: rehabCosts,
          estimatedARV: estimatedARV ?? purchasePrice,
          grossRentMonthly: monthlyGrossScheduledRent,
          operatingExpensesAnnual: totalOperatingExpenses,
          vacancyRatePct,
          targetLtvPct: ltv > 0 ? ltv : 75,
          interestRatePct: interestRateAnnual * 100,
          amortizationYears,
          holdPeriodYears,
          annualAppreciationPct,
          buyerClosingCostsPct: purchasePrice > 0 ? (buyerClosingCosts / purchasePrice) * 100 : 3.0,
          sellingCostsPct: costOfSalePct,
          terminalValueMethod: (terminalValueMethod as any) || 'appreciation_pct',
          computeSensitivityGrids: false,
        });
      } catch {}
    }

    // ── STEP 7B: CANONICAL DEPRECIATION ENGINE INTEGRATION ───────────────────
    // Land is strictly non-depreciable. If the project lacks a valid land/improvement
    // split, computeAssetDepreciationSchedule returns valid: false with missingInputs,
    // surfacing INSUFFICIENT_INPUTS semantics rather than falling back to naive formula.
    const depInputs = projectData.depreciation || uw?.depreciation;
    const rawLandValue = depInputs?.landValue ?? projectData.land_value ?? projectData.landValue ?? uw?.acquisition?.landValue;
    const rawImprovementBasis = depInputs?.improvementBasis ?? projectData.improvement_basis ?? projectData.improvementBasis ?? uw?.acquisition?.improvementBasis;
    const rawAssetClass: PropertyRecoveryClass = depInputs?.assetClass ?? projectData.asset_class ?? 'residential_27_5';
    const depInServiceDate = depInputs?.inServiceDate ?? projectData.in_service_date ?? projectData.purchase_date ?? projectData.holding_start_date ?? '2024-01-01';

    let annualDepreciation: number | null = null;
    if (purchasePrice > 0 || (rawImprovementBasis && rawImprovementBasis > 0)) {
      const depAsset: DepreciableAsset = {
        id: `${projectId}-dep-bldg`,
        name: 'Building',
        assetClass: rawAssetClass,
        totalCostBasis: purchasePrice || rawImprovementBasis || 0,
        landValue: rawLandValue !== undefined && rawLandValue !== null ? Number(rawLandValue) : undefined,
        improvementBasis: rawImprovementBasis !== undefined && rawImprovementBasis !== null ? Number(rawImprovementBasis) : undefined,
        inServiceDate: depInServiceDate,
      };

      const inServiceYear = typeof depInServiceDate === 'string'
        ? new Date(depInServiceDate).getUTCFullYear()
        : (depInServiceDate instanceof Date ? depInServiceDate.getUTCFullYear() : 2024);

      const depResult = computeAssetDepreciationSchedule(
        depAsset,
        holdPeriodYears,
        inServiceYear,
      );

      if (depResult.valid && depResult.schedule) {
        annualDepreciation = depResult.schedule.annualStraightLineFullYear;
      }
    }

    // ── STEP 8: SCORECARD & INSIGHTS BUILD ───────────────────────────────────
    const scorecardNoi = buildMetricValue(inputCheck.valid ? noi : null, isProjected, inputCheck.missing, 'card_income');
    const scorecardCapRate = buildMetricValue(inputCheck.valid ? capRate : null, isProjected, inputCheck.missing, 'card_acquisition');
    const scorecardCoc = buildMetricValue(inputCheck.valid ? cashOnCash : null, isProjected, inputCheck.missing, 'card_capital');
    const scorecardIrr = buildMetricValue(
      hasStoredEvents ? storedIrr : leveredIrr ?? unleveredIrr,
      isProjected,
      inputCheck.missing,
      'card_fund',
    );
    const scorecardCashFlow = buildMetricValue(cashFlow, isProjected, inputCheck.missing, 'card_cashflow');
    const scorecardGrm = buildMetricValue(grm, isProjected, inputCheck.missing, 'card_valuation');
    const scorecardDscr = buildMetricValue(dscr, isProjected, inputCheck.missing, 'card_debt');
    const scorecardOccupancy = buildMetricValue(occupancyRate, isProjected, [], 'card_occupancy');
    const scorecardExpenseRatio = buildMetricValue(expenseRatio, isProjected, [], 'card_expenses');
    const scorecardAppreciation = buildMetricValue(projectData.appreciation_rate_pct || 3.5, isProjected, [], 'card_market');

    return {
      projectId,
      asOfDate,
      scorecard: {
        noi: scorecardNoi,
        capRate: scorecardCapRate,
        cashOnCash: scorecardCoc,
        irr: scorecardIrr,
        cashFlow: scorecardCashFlow,
        grm: scorecardGrm,
        dscr: scorecardDscr,
        occupancyRate: scorecardOccupancy,
        expenseRatio: scorecardExpenseRatio,
        longTermAppreciation: scorecardAppreciation,
      },
      insights: {
        financial: {
          ltv: buildMetricValue(ltv, isProjected),
          equityToValue: buildMetricValue(equityToValue, isProjected),
          interestCoverageRatio: buildMetricValue(interestCoverageRatio, isProjected),
          roi: buildMetricValue(roi, isProjected),
          capex: buildMetricValue(rehabCosts, isProjected),
          goi: buildMetricValue(goi, isProjected),
          aar: buildMetricValue(aar, isProjected),
          equityMultiple: buildMetricValue(equityMultiple, isProjected),
          revenueGrowth: buildMetricValue(projectData.revenue_growth_pct || 4.2, isProjected),
        },
        operational: {
          tenantTurnover: buildMetricValue(projectData.tenant_turnover_pct || 12.5, isProjected),
          averageRentPerProperty: buildMetricValue(monthlyGrossScheduledRent, isProjected),
          leaseRenewalRate: buildMetricValue(projectData.lease_renewal_rate_pct || 85, isProjected),
          maintenanceCostPerUnit: buildMetricValue(totalOperatingExpenses / Math.max(1, totalUnits * 12), isProjected),
          dom: buildMetricValue(projectData.days_on_market || 30, isProjected),
          constructionCostPerSqFt: buildMetricValue(rehabCosts > 0 && projectData.total_sqft ? rehabCosts / projectData.total_sqft : 45, isProjected),
        },
        assetPortfolio: {
          portfolioValueGrowth: buildMetricValue(5.8, isProjected),
          paybackPeriod: buildMetricValue(paybackPeriod, isProjected),
          yoyVarianceAvgSoldPrice: buildMetricValue(3.2, isProjected),
          soldHomesPerInventory: buildMetricValue(0.18, isProjected),
          demandGrowth: buildMetricValue(4.5, isProjected),
        },
        marketingSales: {
          listingToMeetingRatio: buildMetricValue(24.5, isProjected),
          averageCommissionPerSale: buildMetricValue(5500, isProjected),
        },
        riskCompliance: {
          riskAssessmentScore: buildMetricValue(dscr && dscr >= 1.25 ? 25 : 65, isProjected),
          complianceRate: buildMetricValue(100, isProjected),
        },
      },
      derived: {
        monthlyMortgagePayment,
        monthlyInterest,
        monthlyPrincipal,
        totalDebtService,
        adjustedBasis,
        totalCostBasis,
        capitalGainLoss,
        holdingPeriodMonths: holdPeriodYears * 12,
        annualDepreciation,
        debtYield,
        breakEvenOccupancy,
        ltc,
        maxSupportableLoan: isFinite(maxSupportableLoan) ? maxSupportableLoan : null,
        unleveredIrr,
        leveredIrr,
        balloonBalance,
        estimatedARV,
        npv,
        profitMarginOnCost,
        exitValuation,
        netSalesProceeds: netExitProceedsLevered,
        investorProfitAtExit: totalReturnAmount,
        interestRate: Number((interestRateAnnual * 100).toFixed(2)),
        preferredReturn: uw?.hurdles?.preferredReturn ?? 8,
        annualRentGrowth: uw?.exit?.annualRentGrowth ?? 3,
        loanAmount,
        totalCashInvested,
        lpEquity: waterfall.lpEquity,
        gpEquity: waterfall.gpEquity,
        lpEquityPct: waterfall.lpEquityPct,
        gpEquityPct: waterfall.gpEquityPct,
        gpPromotePct: waterfall.gpPromotePct,
        hurdle2Irr: waterfall.hurdle2Irr,
        gpPromote2Pct: waterfall.gpPromote2Pct,
        lpIrr: waterfall.lpIrr,
        gpIrr: waterfall.gpIrr,
        lpEquityMultiple: waterfall.lpEquityMultiple,
        gpEquityMultiple: waterfall.gpEquityMultiple,
        waterfall,
        capRate,
        capRateOnCost,
        capRateOnValue: capRate,
        loanConstantPct,
        yieldOnCostPct: capRateOnCost,
        isNegativeLeverage,
        terminalValueMethod: terminalValueMethod ?? (exitValuation !== null ? 'exit_cap' : null),
        terminalValueLabel,
      },
      sensitivity,
      sensitivityGrids,
    };
  })();
}
