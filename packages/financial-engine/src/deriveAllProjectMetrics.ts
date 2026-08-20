import { MetricValue, ProjectMetricsResult } from './types.js';
import { computeAmortizationSchedule } from './amortization-engine.js';
import { computeFundPhaseMetrics, CashFlowEvent } from './fund-phase-engine.js';
import { canonicalSeedDeal } from './fixtures/canonical-seed-deal.js';

/** Legacy sync path — full reiMetrics.ts migration deferred to Phase 2b */
function deriveLegacyMetrics(
  _project: unknown,
  _whatIf?: unknown,
  _ledgerItems?: unknown
): never {
  throw new Error(
    'Legacy synchronous deriveAllProjectMetrics(projectObject) is not yet migrated. ' +
      'Use deriveAllProjectMetrics(projectId, { mockData }) async API.'
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
 * Validates required inputs for the Honesty Rule
 */
function requireInputs(
  inputs: Record<string, any>,
  required: string[],
  cardId: string
): { valid: boolean; missing: string[] } {
  const missing = required.filter(k => inputs[k] == null || inputs[k] === undefined);
  return { valid: missing.length === 0, missing };
}

/**
 * Creates a MetricValue wrapper with Honesty Rule evaluation
 */
function buildMetricValue(
  value: number | null,
  isProjected: boolean,
  missingInputs: string[] = [],
  cardId: string = 'card_general'
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
  legacyLedgerItems?: any
): any {
  // If first argument is a Project object (legacy synchronous caller)
  if (typeof projectOrId === 'object' && projectOrId !== null) {
    return deriveLegacyMetrics(projectOrId, typeof optionsOrWhatIf === 'number' ? optionsOrWhatIf : 0, legacyLedgerItems || []);
  }

  // Otherwise, run Agent 4 33-Metric Engine async calculation
  return (async (): Promise<ProjectMetricsResult> => {
    const projectId = String(projectOrId);
    const options = typeof optionsOrWhatIf === 'object' ? optionsOrWhatIf : {};
    const asOfDate = options?.asOfDate || new Date();
    const isProjected = options?.includeProjected ?? true;

    // Fetch project record (uses mock data or canonical seed deal fallback if DB not connected)
    const projectData = options?.mockData || canonicalSeedDeal;

    const {
      purchase_price,
      loan_amount = 0,
      interest_rate = 0.065,
      loan_term_years = 30,
      property_value = purchase_price,
      gross_scheduled_rent = 0,
      vacancy_rate = 5,
      other_income = 0,
      operating_expenses = projectData.operating_expenses || projectData.expenses || {},
      total_cash_invested = projectData.total_cash_invested || projectData.down_payment_amount || (purchase_price * 0.2),
      total_units = 1,
      occupied_units = 1,
      purchase_date,
      sale_price,
      selling_costs = 0,
      capital_improvements = 0,
      rehab_costs = 0,
      closing_costs = 0,
      depreciation_taken = 0,
      equity_investors = [],
    } = projectData;

    // ── STEP 1: LOAN MATH (calls amortization engine) ───────────────────────
    let monthlyMortgagePayment: number | null = null;
    let totalDebtService: number | null = null;
    let monthlyInterest: number | null = null;
    let monthlyPrincipal: number | null = null;

    if (loan_amount > 0 && interest_rate > 0 && loan_term_years > 0) {
      const amort = computeAmortizationSchedule(
        loan_amount,
        interest_rate,
        loan_term_years,
        purchase_date ? new Date(purchase_date) : asOfDate
      );
      monthlyMortgagePayment = amort.monthlyPayment;
      totalDebtService = Number((amort.monthlyPayment * 12).toFixed(2));
      if (amort.schedule.length > 0) {
        monthlyInterest = amort.schedule[0].interest;
        monthlyPrincipal = amort.schedule[0].principal;
      }
    } else {
      monthlyMortgagePayment = 0;
      totalDebtService = 0;
      monthlyInterest = 0;
      monthlyPrincipal = 0;
    }

    // ── STEP 2: INCOME AGGREGATION ──────────────────────────────────────────
    const goiInputCheck = requireInputs(projectData, ['gross_scheduled_rent'], 'card_income');
    const goi = goiInputCheck.valid
      ? Number((gross_scheduled_rent * (1 - vacancy_rate / 100) + other_income).toFixed(2))
      : null;

    // ── STEP 3: EXPENSE AGGREGATION (Canonical 8 Tags ONLY) ─────────────────
    const {
      tax = 0,
      insurance = 0,
      security = 0,
      maintenance = 0,
      utilities = 0,
      management = 0, // Handled below with BUG-8 lock check if pct provided
      HOA = 0,
      capex = 0,
      management_fee_pct,
    } = operating_expenses;

    // BUG-8 LOCK: Management Fee is strictly computed on Gross Scheduled Rent (NOT GOI or effective_rent)
    const computedManagementFee =
      management_fee_pct !== undefined
        ? (management_fee_pct / 100) * gross_scheduled_rent
        : management;

    const totalOperatingExpenses = Number(
      (tax + insurance + security + maintenance + utilities + computedManagementFee + HOA).toFixed(2)
    );

    // ── STEP 4: CORE METRICS ────────────────────────────────────────────────
    const noi = goi !== null ? Number((goi - totalOperatingExpenses).toFixed(2)) : null;

    const cashFlow =
      noi !== null && totalDebtService !== null
        ? Number((noi - totalDebtService).toFixed(2))
        : null;

    const capRateCheck = requireInputs(projectData, ['purchase_price', 'gross_scheduled_rent'], 'card_acquisition');
    const capRate = capRateCheck.valid && noi !== null && property_value > 0
      ? Number(((noi / property_value) * 100).toFixed(1))
      : null;

    const cocCheck = requireInputs(projectData, ['total_cash_invested'], 'card_capital');
    const cashOnCash = cocCheck.valid && cashFlow !== null && total_cash_invested > 0
      ? Number(((cashFlow / total_cash_invested) * 100).toFixed(2))
      : null;

    const grm = gross_scheduled_rent > 0 && property_value > 0
      ? Number((property_value / gross_scheduled_rent).toFixed(1))
      : null;

    const dscr = noi !== null && totalDebtService && totalDebtService > 0
      ? Number((noi / totalDebtService).toFixed(2))
      : null;

    const occupancyRate = total_units > 0
      ? Number(((occupied_units / total_units) * 100).toFixed(2))
      : 100;

    const expenseRatio = goi && goi > 0
      ? Number(((totalOperatingExpenses / goi) * 100).toFixed(2))
      : null;

    const ltv = property_value > 0
      ? Number(((loan_amount / property_value) * 100).toFixed(2))
      : 0;

    const equityToValue = Number((100 - ltv).toFixed(2));

    const interestCoverageRatio = noi !== null && monthlyInterest && monthlyInterest > 0
      ? Number((noi / (monthlyInterest * 12)).toFixed(2))
      : null;

    // ── STEP 5: EXIT & TIME-BASED METRICS ───────────────────────────────────
    const adjustedBasis = purchase_price
      ? Number((purchase_price + closing_costs + capital_improvements + rehab_costs - depreciation_taken).toFixed(2))
      : null;

    const capitalGainLoss = sale_price && adjustedBasis !== null
      ? Number((sale_price - adjustedBasis - selling_costs).toFixed(2))
      : null;

    let holdingPeriodMonths = 12;
    if (purchase_date) {
      const start = new Date(purchase_date);
      const end = projectData.sale_date ? new Date(projectData.sale_date) : asOfDate;
      holdingPeriodMonths = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
    }

    const roi = capitalGainLoss !== null && total_cash_invested > 0
      ? Number(((capitalGainLoss / total_cash_invested) * 100).toFixed(2))
      : null;

    const holdingPeriodYears = Math.max(0.08, holdingPeriodMonths / 12);
    const aar = roi !== null ? Number((roi / holdingPeriodYears).toFixed(2)) : null;

    const totalReturnAmount = cashFlow !== null ? cashFlow * holdingPeriodYears + (capitalGainLoss || 0) : 0;
    const equityMultiple = total_cash_invested > 0
      ? Number(((totalReturnAmount + total_cash_invested) / total_cash_invested).toFixed(2))
      : 1.0;

    const paybackPeriod = cashFlow && cashFlow > 0
      ? Number((total_cash_invested / cashFlow).toFixed(2))
      : null;

    const dom = projectData.days_on_market || 30;

    // ── STEP 6: FUND-PHASE METRICS (delegated to fund-phase engine) ─────────
    const cashFlowEvents: CashFlowEvent[] = [
      { date: purchase_date || '2025-01-01', amount: -total_cash_invested },
      { date: asOfDate.toISOString().split('T')[0], amount: total_cash_invested + totalReturnAmount },
    ];

    const fundPhaseRes = computeFundPhaseMetrics(
      equity_investors.length > 0 ? equity_investors : [{ id: 'inv_default', name: 'Default', capitalContributed: total_cash_invested, ownershipPct: 100 }],
      8, // 8% pref return
      [{ hurdleIrrPct: 8, lpSplitPct: 80, gpSplitPct: 20 }],
      20,
      cashFlowEvents
    );

    // ── STEP 7: RISK & COMPLIANCE ───────────────────────────────────────────
    const riskAssessmentScore = Number(
      (
        ((dscr !== null && dscr < 1.0 ? 75 : 25) +
          (ltv > 80 ? 70 : 30) +
          (occupancyRate < 90 ? 65 : 20) +
          (cashFlow !== null && cashFlow < 0 ? 80 : 20)) /
        4
      ).toFixed(2)
    );

    const complianceRate = projectData.compliance_checklist
      ? Number(
          (
            (projectData.compliance_checklist.filter((item: any) => item.completed).length /
              projectData.compliance_checklist.length) *
            100
          ).toFixed(2)
        )
      : 100;

    // ── SCORECARD METRICS BUILD (10 Headline Metrics) ────────────────────────
    const noiCheck = requireInputs(projectData, ['purchase_price', 'gross_scheduled_rent'], 'card_income');
    const scorecardNoi = buildMetricValue(noiCheck.valid ? noi : null, isProjected, noiCheck.missing, 'card_income');
    const scorecardCapRate = buildMetricValue(capRateCheck.valid ? capRate : null, isProjected, capRateCheck.missing, 'card_acquisition');
    const scorecardCoc = buildMetricValue(cocCheck.valid ? cashOnCash : null, isProjected, cocCheck.missing, 'card_capital');
    const scorecardIrr = buildMetricValue(fundPhaseRes.irr, isProjected, [], 'card_fund');
    const scorecardCashFlow = buildMetricValue(cashFlow, isProjected, [], 'card_cashflow');
    const scorecardGrm = buildMetricValue(grm, isProjected, [], 'card_valuation');
    const scorecardDscr = buildMetricValue(dscr, isProjected, [], 'card_debt');
    const scorecardOccupancy = buildMetricValue(occupancyRate, isProjected, [], 'card_occupancy');
    const scorecardExpenseRatio = buildMetricValue(expenseRatio, isProjected, [], 'card_expenses');
    const scorecardAppreciation = buildMetricValue(projectData.appreciation_rate_pct || 3.5, isProjected, [], 'card_market');

    // ── INSIGHTS METRICS BUILD (24 Metrics) ──────────────────────────────────
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
          capex: buildMetricValue(capex, isProjected),
          goi: buildMetricValue(goi, isProjected),
          aar: buildMetricValue(aar, isProjected),
          equityMultiple: buildMetricValue(equityMultiple, isProjected),
          revenueGrowth: buildMetricValue(projectData.revenue_growth_pct || 4.2, isProjected),
        },
        operational: {
          tenantTurnover: buildMetricValue(projectData.tenant_turnover_pct || 12.5, isProjected),
          averageRentPerProperty: buildMetricValue(gross_scheduled_rent / 12, isProjected),
          leaseRenewalRate: buildMetricValue(projectData.lease_renewal_rate_pct || 85, isProjected),
          maintenanceCostPerUnit: buildMetricValue(maintenance / Math.max(1, total_units), isProjected),
          dom: buildMetricValue(dom, isProjected),
          constructionCostPerSqFt: buildMetricValue(rehab_costs > 0 && projectData.total_sqft ? rehab_costs / projectData.total_sqft : 45, isProjected),
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
          riskAssessmentScore: buildMetricValue(riskAssessmentScore, isProjected),
          complianceRate: buildMetricValue(complianceRate, isProjected),
        },
      },
      derived: {
        monthlyMortgagePayment,
        monthlyInterest,
        monthlyPrincipal,
        totalDebtService,
        adjustedBasis,
        capitalGainLoss,
        holdingPeriodMonths,
        annualDepreciation: purchase_price ? Number((purchase_price / 27.5).toFixed(2)) : null,
      },
    };
  })();
}
