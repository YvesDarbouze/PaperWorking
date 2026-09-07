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
      loan_amount,
      interest_rate,
      loan_term_years,
      property_value = purchase_price,
      gross_scheduled_rent,
      other_income = 0,
      operating_expenses = projectData.operating_expenses || projectData.expenses || {},
      total_cash_invested = projectData.total_cash_invested || projectData.down_payment_amount,
      total_units,
      occupied_units,
      purchase_date,
      sale_price,
      selling_costs = 0,
      capital_improvements = 0,
      rehab_costs = 0,
      closing_costs = 0,
      depreciation_taken = 0,
      equity_investors = [],
      ppe_previous_year,
      ppe_current_year,
      depreciation_current_year,
    } = projectData;

    const hasPotentialRentalIncome =
      typeof gross_scheduled_rent === 'number' && Number.isFinite(gross_scheduled_rent);
    const hasLoanAmount = typeof loan_amount === 'number' && Number.isFinite(loan_amount);
    const loanAmountValue = hasLoanAmount ? loan_amount : 0;
    const hasLoanTerms =
      hasLoanAmount &&
      loanAmountValue > 0 &&
      typeof interest_rate === 'number' &&
      interest_rate > 0 &&
      typeof loan_term_years === 'number' &&
      loan_term_years > 0;

    // ── STEP 1: LOAN MATH (calls amortization engine) ───────────────────────
    let monthlyMortgagePayment: number | null = null;
    let totalDebtService: number | null = null;
    let monthlyInterest: number | null = null;
    let monthlyPrincipal: number | null = null;

    if (hasLoanTerms) {
      const amort = computeAmortizationSchedule(
        loanAmountValue,
        interest_rate as number,
        loan_term_years as number,
        purchase_date ? new Date(purchase_date) : asOfDate
      );
      monthlyMortgagePayment = amort.monthlyPayment;
      totalDebtService = Number((amort.monthlyPayment * 12).toFixed(2));
      if (amort.schedule.length > 0) {
        monthlyInterest = amort.schedule[0].interest;
        monthlyPrincipal = amort.schedule[0].principal;
      }
    }

    // ── STEP 2: INCOME AGGREGATION (NetSuite GOI) ───────────────────────────
    // GOI = Potential Rental Income + Other Income (vacancy is NOT deducted)
    const goiInputCheck = requireInputs(projectData, ['gross_scheduled_rent'], 'card_income');
    const goi = goiInputCheck.valid
      ? Number(((gross_scheduled_rent as number) + (other_income ?? 0)).toFixed(2))
      : null;

    const totalIncome = goi;

    // ── STEP 3: EXPENSE AGGREGATION (Canonical 8 Tags ONLY) ─────────────────
    const {
      tax = 0,
      insurance = 0,
      security = 0,
      maintenance = 0,
      utilities = 0,
      management = 0, // Handled below with BUG-8 lock check if pct provided
      HOA = 0,
      management_fee_pct,
    } = operating_expenses;

    // BUG-8 LOCK: Management Fee is strictly computed on Gross Scheduled Rent (NOT GOI)
    const computedManagementFee =
      management_fee_pct !== undefined && hasPotentialRentalIncome
        ? (management_fee_pct / 100) * (gross_scheduled_rent as number)
        : management;

    // Operating expenses for NOI — excludes CapEx reserve tag and financing
    const totalOperatingExpenses = Number(
      (tax + insurance + security + maintenance + utilities + computedManagementFee + HOA).toFixed(2)
    );

    // NetSuite CapEx KPI: PP&E current − PP&E previous + Depreciation current year
    const hasPpeInputs =
      typeof ppe_previous_year === 'number' &&
      Number.isFinite(ppe_previous_year) &&
      typeof ppe_current_year === 'number' &&
      Number.isFinite(ppe_current_year) &&
      typeof depreciation_current_year === 'number' &&
      Number.isFinite(depreciation_current_year);
    const capexKpi = hasPpeInputs
      ? Number(
          (
            (ppe_current_year as number) -
            (ppe_previous_year as number) +
            (depreciation_current_year as number)
          ).toFixed(2),
        )
      : null;

    // ── STEP 4: CORE METRICS (NetSuite NOI & Cash Flow) ─────────────────────
    // NOI = Revenue − Operating Expenses (excludes financing and CapEx)
    const noi = goi !== null ? Number((goi - totalOperatingExpenses).toFixed(2)) : null;

    // Cash Flow = Total Income − Total Expenses (OpEx + debt service + CapEx)
    const cashFlowMissing: string[] = [];
    if (totalIncome === null) cashFlowMissing.push('gross_scheduled_rent');

    let debtServiceForCashFlow: number | null = null;
    if (hasLoanAmount && loanAmountValue > 0) {
      if (hasLoanTerms && totalDebtService !== null) {
        debtServiceForCashFlow = totalDebtService;
      } else {
        cashFlowMissing.push('interest_rate', 'loan_term_years');
      }
    } else {
      debtServiceForCashFlow = 0;
    }

    if (capexKpi === null) {
      cashFlowMissing.push('ppe_previous_year', 'ppe_current_year', 'depreciation_current_year');
    }

    const cashFlow =
      totalIncome !== null &&
      debtServiceForCashFlow !== null &&
      capexKpi !== null &&
      cashFlowMissing.length === 0
        ? Number(
            (totalIncome - totalOperatingExpenses - debtServiceForCashFlow - capexKpi).toFixed(2),
          )
        : null;

    const capRateCheck = requireInputs(projectData, ['purchase_price', 'gross_scheduled_rent'], 'card_acquisition');
    const capRate = capRateCheck.valid && noi !== null && property_value > 0
      ? Number(((noi / property_value) * 100).toFixed(1))
      : null;

    const cocCheck = requireInputs(projectData, ['total_cash_invested'], 'card_capital');
    const cashOnCash =
      cocCheck.valid && cashFlow !== null && typeof total_cash_invested === 'number' && total_cash_invested > 0
        ? Number(((cashFlow / total_cash_invested) * 100).toFixed(2))
        : null;

    const grm =
      hasPotentialRentalIncome && (gross_scheduled_rent as number) > 0 && property_value > 0
        ? Number((property_value / (gross_scheduled_rent as number)).toFixed(1))
        : null;

    const dscr =
      noi !== null && totalDebtService !== null && totalDebtService > 0
        ? Number((noi / totalDebtService).toFixed(2))
        : null;

    const occupancyRate =
      typeof total_units === 'number' && total_units > 0 && typeof occupied_units === 'number'
        ? Number(((occupied_units / total_units) * 100).toFixed(2))
        : null;

    const expenseRatio = goi && goi > 0
      ? Number(((totalOperatingExpenses / goi) * 100).toFixed(2))
      : null;

    const ltv =
      hasLoanAmount &&
      loanAmountValue > 0 &&
      typeof property_value === 'number' &&
      property_value > 0
        ? Number(((loanAmountValue / property_value) * 100).toFixed(2))
        : null;

    const equityToValue =
      ltv !== null ? Number((100 - ltv).toFixed(2)) : null;

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

    const roi =
      capitalGainLoss !== null &&
      typeof total_cash_invested === 'number' &&
      total_cash_invested > 0
        ? Number(((capitalGainLoss / total_cash_invested) * 100).toFixed(2))
        : null;

    const holdingPeriodYears = Math.max(0.08, holdingPeriodMonths / 12);
    const aar = roi !== null ? Number((roi / holdingPeriodYears).toFixed(2)) : null;

    const totalReturnAmount =
      cashFlow !== null
        ? cashFlow * holdingPeriodYears + (capitalGainLoss || 0)
        : capitalGainLoss ?? 0;
    const hasRealCashFlowEvents =
      Array.isArray(projectData.cash_flow_events) && projectData.cash_flow_events.length >= 2;
    const cashFlowEvents: CashFlowEvent[] = hasRealCashFlowEvents
      ? (projectData.cash_flow_events as CashFlowEvent[])
      : [];

    const totalInvestedFromEvents = cashFlowEvents
      .filter((cf) => cf.amount < 0)
      .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
    const totalReturnedFromEvents = cashFlowEvents
      .filter((cf) => cf.amount > 0)
      .reduce((sum, cf) => sum + cf.amount, 0);
    const equityMultipleFromEvents =
      hasRealCashFlowEvents &&
      totalInvestedFromEvents > 0 &&
      totalReturnedFromEvents > 0 &&
      cashFlowEvents.some((cf) => cf.amount < 0) &&
      cashFlowEvents.some((cf) => cf.amount > 0)
        ? Number((totalReturnedFromEvents / totalInvestedFromEvents).toFixed(2))
        : null;

    const equityMultiple =
      equityMultipleFromEvents ??
      (hasRealCashFlowEvents &&
      typeof total_cash_invested === 'number' &&
      total_cash_invested > 0 &&
      cashFlow !== null
        ? Number(((totalReturnAmount + total_cash_invested) / total_cash_invested).toFixed(2))
        : null);

    const paybackPeriod =
      cashFlow && cashFlow > 0 && typeof total_cash_invested === 'number' && total_cash_invested > 0
        ? Number((total_cash_invested / cashFlow).toFixed(2))
        : null;

    const dom =
      typeof projectData.days_on_market === 'number' ? projectData.days_on_market : null;

    // ── STEP 6: FUND-PHASE METRICS (delegated to fund-phase engine) ─────────
    const fundPhaseRes =
      cashFlowEvents.length >= 2
        ? computeFundPhaseMetrics(
            equity_investors.length > 0
              ? equity_investors
              : typeof total_cash_invested === 'number' && total_cash_invested > 0
                ? [
                    {
                      id: 'inv_default',
                      name: 'Default',
                      capitalContributed: total_cash_invested,
                      ownershipPct: 100,
                    },
                  ]
                : [],
            8,
            [{ hurdleIrrPct: 8, lpSplitPct: 80, gpSplitPct: 20 }],
            20,
            cashFlowEvents,
          )
        : { irr: null, gpPromoteAmount: 0, totalPreferredReturnAccrued: 0, investorResults: [], tierDistributions: [] };

    // ── STEP 7: RISK & COMPLIANCE (NetSuite Risk Assessment) ────────────────
    const financialRisk = projectData.financial_risk_score;
    const marketRisk = projectData.market_risk_score;
    const operationalRisk = projectData.operational_risk_score;
    const complianceRisk = projectData.compliance_risk_score;
    const hasAllRiskScores =
      typeof financialRisk === 'number' &&
      Number.isFinite(financialRisk) &&
      typeof marketRisk === 'number' &&
      Number.isFinite(marketRisk) &&
      typeof operationalRisk === 'number' &&
      Number.isFinite(operationalRisk) &&
      typeof complianceRisk === 'number' &&
      Number.isFinite(complianceRisk);

    const riskAssessmentScore = hasAllRiskScores
      ? Number(
          (
            ((financialRisk as number) +
              (marketRisk as number) +
              (operationalRisk as number) +
              (complianceRisk as number)) /
            4
          ).toFixed(2),
        )
      : null;

    const complianceRate = projectData.compliance_checklist
      ? Number(
          (
            (projectData.compliance_checklist.filter((item: any) => item.completed).length /
              projectData.compliance_checklist.length) *
            100
          ).toFixed(2),
        )
      : null;

    // ── SCORECARD METRICS BUILD (10 Headline Metrics) ────────────────────────
    const noiCheck = requireInputs(projectData, ['gross_scheduled_rent'], 'card_income');
    const scorecardNoi = buildMetricValue(noiCheck.valid ? noi : null, isProjected, noiCheck.missing, 'card_income');
    const scorecardCapRate = buildMetricValue(capRateCheck.valid ? capRate : null, isProjected, capRateCheck.missing, 'card_acquisition');
    const scorecardCoc = buildMetricValue(cocCheck.valid ? cashOnCash : null, isProjected, cocCheck.missing, 'card_capital');
    const scorecardIrr = buildMetricValue(
      fundPhaseRes.irr,
      isProjected,
      hasRealCashFlowEvents ? [] : ['cash_flow_events'],
      'card_fund',
    );
    const scorecardCashFlow = buildMetricValue(
      cashFlow,
      isProjected,
      cashFlowMissing,
      'card_cashflow',
    );
    const scorecardGrm = buildMetricValue(grm, isProjected, [], 'card_valuation');
    const scorecardDscr = buildMetricValue(dscr, isProjected, [], 'card_debt');
    const scorecardOccupancy = buildMetricValue(occupancyRate, isProjected, [], 'card_occupancy');
    const scorecardExpenseRatio = buildMetricValue(expenseRatio, isProjected, [], 'card_expenses');
    const scorecardAppreciation = buildMetricValue(
      typeof projectData.appreciation_rate_pct === 'number'
        ? projectData.appreciation_rate_pct
        : null,
      isProjected,
      projectData.appreciation_rate_pct == null ? ['appreciation_rate_pct'] : [],
      'card_market',
    );

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
          capex: buildMetricValue(
            capexKpi,
            isProjected,
            hasPpeInputs
              ? []
              : ['ppe_previous_year', 'ppe_current_year', 'depreciation_current_year'],
            'card_capex',
          ),
          goi: buildMetricValue(goi, isProjected, goiInputCheck.missing, 'card_income'),
          aar: buildMetricValue(aar, isProjected),
          equityMultiple: buildMetricValue(equityMultiple, isProjected),
          revenueGrowth: buildMetricValue(
            typeof projectData.revenue_growth_pct === 'number' ? projectData.revenue_growth_pct : null,
            isProjected,
          ),
        },
        operational: {
          tenantTurnover: buildMetricValue(
            typeof projectData.tenant_turnover_pct === 'number' ? projectData.tenant_turnover_pct : null,
            isProjected,
          ),
          averageRentPerProperty: buildMetricValue(
            gross_scheduled_rent > 0 ? gross_scheduled_rent / 12 : null,
            isProjected,
          ),
          leaseRenewalRate: buildMetricValue(
            typeof projectData.lease_renewal_rate_pct === 'number'
              ? projectData.lease_renewal_rate_pct
              : null,
            isProjected,
          ),
          maintenanceCostPerUnit: buildMetricValue(
            typeof total_units === 'number' && total_units > 0 ? maintenance / total_units : null,
            isProjected,
          ),
          dom: buildMetricValue(dom, isProjected),
          constructionCostPerSqFt: buildMetricValue(
            rehab_costs > 0 && projectData.total_sqft
              ? rehab_costs / projectData.total_sqft
              : null,
            isProjected,
          ),
        },
        assetPortfolio: {
          portfolioValueGrowth: buildMetricValue(
            typeof projectData.portfolio_value_growth_pct === 'number'
              ? projectData.portfolio_value_growth_pct
              : null,
            isProjected,
          ),
          paybackPeriod: buildMetricValue(paybackPeriod, isProjected),
          yoyVarianceAvgSoldPrice: buildMetricValue(
            typeof projectData.yoy_avg_sold_price_pct === 'number'
              ? projectData.yoy_avg_sold_price_pct
              : null,
            isProjected,
          ),
          soldHomesPerInventory: buildMetricValue(
            typeof projectData.sold_homes_per_inventory === 'number'
              ? projectData.sold_homes_per_inventory
              : null,
            isProjected,
          ),
          demandGrowth: buildMetricValue(
            typeof projectData.demand_growth_pct === 'number' ? projectData.demand_growth_pct : null,
            isProjected,
          ),
        },
        marketingSales: {
          listingToMeetingRatio: buildMetricValue(
            typeof projectData.listing_to_meeting_ratio === 'number'
              ? projectData.listing_to_meeting_ratio
              : null,
            isProjected,
          ),
          averageCommissionPerSale: buildMetricValue(
            typeof projectData.average_commission_per_sale === 'number'
              ? projectData.average_commission_per_sale
              : null,
            isProjected,
          ),
        },
        riskCompliance: {
          riskAssessmentScore: buildMetricValue(
            riskAssessmentScore,
            isProjected,
            hasAllRiskScores
              ? []
              : [
                  'financial_risk_score',
                  'market_risk_score',
                  'operational_risk_score',
                  'compliance_risk_score',
                ],
            'card_risk',
          ),
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
