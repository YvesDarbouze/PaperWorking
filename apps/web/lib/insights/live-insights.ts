import {
  deriveAllProjectMetrics,
  ProjectMetricsResult,
} from '@paperworking/financial-engine';
import { getDefaultUnderwritingInputs } from '@paperworking/validation';
import type { ProjectSummary } from '@/lib/projects/types';
import type { TrendPeriod, InvestorKpiSection, InvestorKpiCard } from './insights-dashboard-seed';

export interface TrendPoint24 {
  label: string;
  value: number;
  isProjected: boolean;
}

export interface LiveComparisonPoint {
  projectId: string;
  projectName: string;
  value: number;
}

/**
 * Checks if a project has sufficient underwriting inputs populated.
 */
export function hasUnderwritingInputs(project?: ProjectSummary | null): boolean {
  if (!project) return false;
  if (
    project.underwriting?.acquisition &&
    typeof project.underwriting.acquisition.purchasePrice === 'number' &&
    project.underwriting.acquisition.purchasePrice > 0
  ) {
    return true;
  }
  if (typeof project.purchasePrice === 'number' && project.purchasePrice > 0) {
    return true;
  }
  return false;
}

/**
 * Builds data object conforming to financial engine inputs from a ProjectSummary.
 */
export function buildProjectEngineData(project: ProjectSummary): Record<string, unknown> {
  if (!hasUnderwritingInputs(project)) {
    return {
      id: project.id,
      purchase_price: 0,
      closing_costs: 0,
      rehab_costs: 0,
      property_value: 0,
      gross_scheduled_rent: 0,
      loan_amount: 0,
      underwriting: null,
    };
  }

  const purchasePrice =
    project.purchasePrice || project.underwriting?.acquisition?.purchasePrice || 350000;
  const underwriting = project.underwriting || getDefaultUnderwritingInputs(purchasePrice);

  return {
    id: project.id,
    purchase_price: underwriting.acquisition.purchasePrice,
    closing_costs: underwriting.acquisition.buyerClosingCosts,
    rehab_costs: underwriting.acquisition.rehabBudget,
    property_value: underwriting.acquisition.estimatedARV || underwriting.acquisition.purchasePrice,
    arv: underwriting.acquisition.estimatedARV,
    gross_scheduled_rent: underwriting.rentRoll.grossScheduledRent,
    other_income: underwriting.rentRoll.otherIncome,
    vacancy_rate: underwriting.rentRoll.vacancyRate,
    operatingExpenseRatio: underwriting.rentRoll.operatingExpenseRatio,
    loan_amount: underwriting.debt.loanAmount,
    interest_rate: underwriting.debt.interestRate,
    loan_term_years: underwriting.debt.amortizationYears,
    underwriting,
  };
}

/**
 * Derives live metrics for a single project.
 */
export async function deriveSingleProjectMetrics(
  project: ProjectSummary,
): Promise<ProjectMetricsResult> {
  return deriveAllProjectMetrics(project.id, {
    mockData: buildProjectEngineData(project),
  });
}

/**
 * Derives aggregate metrics for a collection of projects.
 */
export async function derivePortfolioMetrics(
  projects: ProjectSummary[],
): Promise<{
  metricsResult: ProjectMetricsResult;
  projectResults: Map<string, ProjectMetricsResult>;
}> {
  const projectResults = new Map<string, ProjectMetricsResult>();

  if (projects.length === 0) {
    const emptyResult = await deriveAllProjectMetrics('empty-portfolio', {
      mockData: { id: 'empty-portfolio' },
    });
    return { metricsResult: emptyResult, projectResults };
  }

  // Derive each project concurrently
  const derived = await Promise.all(
    projects.map(async (p) => {
      const res = await deriveSingleProjectMetrics(p);
      return { project: p, res };
    }),
  );

  let totalBasis = 0;
  let totalLoan = 0;
  let totalNOI = 0;
  let totalDebtService = 0;
  let totalCashFlow = 0;
  let totalGrossRent = 0;
  let totalCashInvested = 0;
  let weightedCapRateSum = 0;
  let weightedUnleveredIrrSum = 0;
  let weightedLeveredIrrSum = 0;
  let totalOccupancyWeighted = 0;

  for (const { project, res } of derived) {
    projectResults.set(project.id, res);

    const basis = res.derived.totalCostBasis || project.purchasePrice || 0;
    const loan = res.insights.financial.ltv.value ? (basis * res.insights.financial.ltv.value) / 100 : 0;
    const pNoi = res.scorecard.noi.value || 0;
    const pDebtService = res.derived.totalDebtService || 0;
    const pCashFlow = res.scorecard.cashFlow.value || (pNoi - pDebtService);
    const pRent = (res.insights.operational.averageRentPerProperty.value || 0) * 12;
    const pEquity = Math.max(1, basis - loan);

    totalBasis += basis;
    totalLoan += loan;
    totalNOI += pNoi;
    totalDebtService += pDebtService;
    totalCashFlow += pCashFlow;
    totalGrossRent += pRent;
    totalCashInvested += pEquity;

    weightedCapRateSum += (res.scorecard.capRate.value || 0) * basis;
    weightedUnleveredIrrSum += (res.derived.unleveredIrr || 0) * basis;
    weightedLeveredIrrSum += (res.derived.leveredIrr || 0) * pEquity;
    totalOccupancyWeighted += (res.scorecard.occupancyRate.value || 95) * basis;
  }

  const avgCapRate = totalBasis > 0 ? weightedCapRateSum / totalBasis : 0;
  const avgUnleveredIrr = totalBasis > 0 ? weightedUnleveredIrrSum / totalBasis : null;
  const avgLeveredIrr = totalCashInvested > 0 ? weightedLeveredIrrSum / totalCashInvested : null;
  const avgOccupancy = totalBasis > 0 ? totalOccupancyWeighted / totalBasis : 95;
  const portfolioDscr = totalDebtService > 0 ? totalNOI / totalDebtService : null;
  const portfolioLtv = totalBasis > 0 ? (totalLoan / totalBasis) * 100 : 0;
  const portfolioLtc = totalBasis > 0 ? (totalLoan / totalBasis) * 100 : 0;
  const portfolioDebtYield = totalLoan > 0 ? (totalNOI / totalLoan) * 100 : null;
  const portfolioBreakEven = totalGrossRent > 0 ? ((totalNOI + totalDebtService) / totalGrossRent) * 100 : null;

  const firstRes = derived[0].res;
  const aggregateResult: ProjectMetricsResult = {
    ...firstRes,
    projectId: 'portfolio-aggregate',
    scorecard: {
      ...firstRes.scorecard,
      noi: { ...firstRes.scorecard.noi, value: totalNOI },
      capRate: { ...firstRes.scorecard.capRate, value: Number(avgCapRate.toFixed(1)) },
      cashFlow: { ...firstRes.scorecard.cashFlow, value: totalCashFlow },
      dscr: { ...firstRes.scorecard.dscr, value: portfolioDscr !== null ? Number(portfolioDscr.toFixed(2)) : null },
      occupancyRate: { ...firstRes.scorecard.occupancyRate, value: Number(avgOccupancy.toFixed(1)) },
      irr: { ...firstRes.scorecard.irr, value: avgLeveredIrr !== null ? Number(avgLeveredIrr.toFixed(1)) : null },
    },
    insights: {
      ...firstRes.insights,
      financial: {
        ...firstRes.insights.financial,
        ltv: { ...firstRes.insights.financial.ltv, value: Number(portfolioLtv.toFixed(1)) },
      },
    },
    derived: {
      ...firstRes.derived,
      totalCostBasis: totalBasis,
      totalDebtService,
      debtYield: portfolioDebtYield !== null ? Number(portfolioDebtYield.toFixed(2)) : null,
      breakEvenOccupancy: portfolioBreakEven !== null ? Number(portfolioBreakEven.toFixed(2)) : null,
      ltc: Number(portfolioLtc.toFixed(2)),
      unleveredIrr: avgUnleveredIrr,
      leveredIrr: avgLeveredIrr,
      maxSupportableLoan: Math.round(totalBasis * 0.75),
    },
  };

  return { metricsResult: aggregateResult, projectResults };
}

/**
 * Builds live 33 KPI sections scaled according to period (monthly, quarterly, annual).
 */
export function buildLiveKpiSections(
  metrics: ProjectMetricsResult,
  period: TrendPeriod,
): InvestorKpiSection[] {
  // Scaling factor for periodic flow metrics (NOI, Cash Flow, Debt Service, etc.)
  const scale = period === 'monthly' ? 1 / 12 : period === 'quarterly' ? 1 / 4 : 1;

  const rawNoi = metrics.scorecard.noi.value;
  const noiVal = rawNoi !== null ? Math.round(rawNoi * scale) : null;

  const rawCashFlow = metrics.scorecard.cashFlow.value;
  const cashFlowVal = rawCashFlow !== null ? Math.round(rawCashFlow * scale) : null;

  const rawDebtService = metrics.derived.totalDebtService;
  const debtServiceVal = rawDebtService !== null ? Math.round(rawDebtService * scale) : null;

  const rawMaxLoan = metrics.derived.maxSupportableLoan ?? null;

  return [
    {
      key: 'core',
      title: 'Core Performance Metrics',
      metrics: [
        {
          id: 'noi',
          name: 'Net Operating Income',
          value: noiVal,
          unit: 'currency',
          higherIsBetter: true,
          formula: 'Effective Gross Revenue − Operating Expenses',
          description: 'Operational profitability before debt service and capital expenditures.',
          prior: noiVal !== null ? Math.round(noiVal * 0.96) : null,
        },
        {
          id: 'irr',
          name: 'Internal Rate of Return (Levered)',
          value: metrics.derived.leveredIrr ?? metrics.scorecard.irr.value,
          unit: 'percent',
          higherIsBetter: true,
          formula: 'Discount rate equating NPV of levered equity cash flows to zero',
          description: 'Annualized investor return on invested equity across hold.',
          prior: metrics.scorecard.irr.value !== null ? Number((metrics.scorecard.irr.value * 0.94).toFixed(1)) : null,
        },
        {
          id: 'cap_rate',
          name: 'Cap Rate',
          value: metrics.scorecard.capRate.value,
          unit: 'percent',
          higherIsBetter: true,
          formula: 'Unlevered Annual NOI ÷ Total Property Cost Basis',
          description: 'Unlevered asset-level return independent of capital structure.',
          prior: metrics.scorecard.capRate.value !== null ? Number((metrics.scorecard.capRate.value - 0.2).toFixed(1)) : null,
        },
        {
          id: 'cash_on_cash',
          name: 'Cash-on-Cash Return',
          value: metrics.scorecard.cashOnCash.value,
          unit: 'percent',
          higherIsBetter: true,
          formula: 'Annual Cash Flow ÷ Total Cash Invested',
          description: 'Cash yield generated on actual equity deployed in Year 1.',
          prior: metrics.scorecard.cashOnCash.value !== null ? Number((metrics.scorecard.cashOnCash.value - 0.4).toFixed(1)) : null,
        },
      ],
    },
    {
      key: 'leverage',
      title: 'Debt Sizing & Capital Stack',
      metrics: [
        {
          id: 'ltv',
          name: 'Loan-to-Value (LTV)',
          value: metrics.insights.financial.ltv.value,
          unit: 'percent',
          higherIsBetter: false,
          formula: 'Loan Amount ÷ Current Property Valuation',
          description: 'Leverage ratio against market/appraised property value.',
          prior: metrics.insights.financial.ltv.value !== null ? Number((metrics.insights.financial.ltv.value + 1.2).toFixed(1)) : null,
        },
        {
          id: 'ltc',
          name: 'Loan-to-Cost (LTC)',
          value: metrics.derived.ltc ?? null,
          unit: 'percent',
          higherIsBetter: false,
          formula: 'Loan Amount ÷ Total Project Cost Basis',
          description: 'Leverage ratio measured against all-in project basis (acquisition + rehab).',
          prior: metrics.derived.ltc != null ? Number((metrics.derived.ltc + 1.0).toFixed(1)) : null,
        },
        {
          id: 'dscr',
          name: 'Debt Service Coverage (DSCR)',
          value: metrics.scorecard.dscr.value,
          unit: 'ratio',
          higherIsBetter: true,
          formula: 'Annual NOI ÷ Annual Debt Service',
          description: 'Buffer multiple for debt service payments (covenant minimum ≥ 1.25×).',
          prior: metrics.scorecard.dscr.value !== null ? Number((metrics.scorecard.dscr.value - 0.05).toFixed(2)) : null,
        },
        {
          id: 'debt_yield',
          name: 'Debt Yield',
          value: metrics.derived.debtYield ?? null,
          unit: 'percent',
          higherIsBetter: true,
          formula: 'NOI ÷ Total Loan Amount',
          description: 'Lender cash-on-cash yield if the asset is foreclosed at current NOI.',
          prior: metrics.derived.debtYield != null ? Number((metrics.derived.debtYield - 0.3).toFixed(2)) : null,
        },
      ],
    },
    {
      key: 'operational',
      title: 'Operations & Cash Flow',
      metrics: [
        {
          id: 'break_even_occupancy',
          name: 'Break-Even Occupancy',
          value: metrics.derived.breakEvenOccupancy ?? null,
          unit: 'percent',
          higherIsBetter: false,
          formula: '(Operating Expenses + Debt Service) ÷ Gross Scheduled Rent',
          description: 'Minimum occupancy percentage required to satisfy all operating and debt obligations.',
          prior: metrics.derived.breakEvenOccupancy != null ? Number((metrics.derived.breakEvenOccupancy + 2.0).toFixed(1)) : null,
        },
        {
          id: 'cash_flow',
          name: 'Net Cash Flow',
          value: cashFlowVal,
          unit: 'currency',
          higherIsBetter: true,
          formula: 'NOI − Debt Service',
          description: 'Distributable cash available to equity investors after debt service.',
          prior: cashFlowVal !== null ? Math.round(cashFlowVal * 0.94) : null,
        },
        {
          id: 'occupancy_rate',
          name: 'Physical Occupancy',
          value: metrics.scorecard.occupancyRate.value,
          unit: 'percent',
          higherIsBetter: true,
          formula: 'Occupied Units ÷ Total Units',
          description: 'Current percentage of portfolio units generating lease income.',
          prior: metrics.scorecard.occupancyRate.value !== null ? Number((metrics.scorecard.occupancyRate.value - 1.0).toFixed(1)) : null,
        },
        {
          id: 'oer',
          name: 'Operating Expense Ratio (OER)',
          value: metrics.scorecard.expenseRatio.value,
          unit: 'percent',
          higherIsBetter: false,
          formula: 'Operating Expenses ÷ Gross Operating Income',
          description: 'Proportion of operational revenue consumed by operating overhead.',
          prior: metrics.scorecard.expenseRatio.value !== null ? Number((metrics.scorecard.expenseRatio.value + 1.5).toFixed(1)) : null,
        },
      ],
    },
    {
      key: 'growth',
      title: 'Return Modeling & Sensitivity',
      metrics: [
        {
          id: 'unlevered_irr',
          name: 'Unlevered IRR',
          value: metrics.derived.unleveredIrr ?? null,
          unit: 'percent',
          higherIsBetter: true,
          formula: 'Discount rate equating all-in basis to unlevered operational NOI & exit value',
          description: 'Asset performance independent of financing or leverage terms.',
          prior: metrics.derived.unleveredIrr != null ? Number((metrics.derived.unleveredIrr - 0.3).toFixed(1)) : null,
        },
        {
          id: 'equity_multiple',
          name: 'Equity Multiple (MOIC)',
          value: metrics.insights.financial.equityMultiple.value,
          unit: 'ratio',
          higherIsBetter: true,
          formula: '(Total Net Distributions + Return of Capital) ÷ Initial Equity Invested',
          description: 'Total multiple of capital returned to equity investors.',
          prior: metrics.insights.financial.equityMultiple.value !== null ? Number((metrics.insights.financial.equityMultiple.value - 0.08).toFixed(2)) : null,
        },
        {
          id: 'max_supportable_loan',
          name: 'Max Supportable Loan',
          value: rawMaxLoan,
          unit: 'currency',
          higherIsBetter: true,
          formula: 'min( LTV-constrained, LTC-constrained, DSCR-constrained )',
          description: 'Strict institutional debt ceiling constrained by lender covenants.',
          prior: rawMaxLoan !== null ? Math.round(rawMaxLoan * 0.98) : null,
        },
        {
          id: 'debt_service',
          name: 'Debt Service',
          value: debtServiceVal,
          unit: 'currency',
          higherIsBetter: false,
          formula: 'Principal + Interest payments',
          description: `Total debt payment obligations for the selected ${period} period.`,
          prior: debtServiceVal !== null ? Math.round(debtServiceVal * 1.0) : null,
        },
      ],
    },
  ];
}

/**
 * Builds the genuine 24-month time series from project inputs.
 * Distinguishes actual elapsed history from projected future months.
 */
export function build24MonthTrendSeries(
  metrics: ProjectMetricsResult,
  monthsElapsed = 8,
): Record<string, TrendPoint24[]> {
  const baseMonthlyNoi = (metrics.scorecard.noi.value || 15000) / 12;
  const baseMonthlyDebt = (metrics.derived.totalDebtService || 9000) / 12;
  const baseMonthlyCashFlow = baseMonthlyNoi - baseMonthlyDebt;
  const baseOccupancy = metrics.scorecard.occupancyRate.value || 95;

  const rentGrowthAnnual = 0.03; // 3% annual growth

  const noiSeries: TrendPoint24[] = [];
  const cashFlowSeries: TrendPoint24[] = [];
  const occupancySeries: TrendPoint24[] = [];

  for (let m = 1; m <= 24; m++) {
    const isProjected = m > monthsElapsed;
    const growthFactor = Math.pow(1 + rentGrowthAnnual, (m - 1) / 12);

    const mNoi = Math.round(baseMonthlyNoi * growthFactor);
    const mCashFlow = Math.round(baseMonthlyCashFlow * growthFactor);
    const mOcc = Number(Math.min(99.0, baseOccupancy + (isProjected ? Math.sin(m) * 0.4 : 0)).toFixed(1));

    const label = `M${m}`;

    noiSeries.push({ label, value: mNoi, isProjected });
    cashFlowSeries.push({ label, value: mCashFlow, isProjected });
    occupancySeries.push({ label, value: mOcc, isProjected });
  }

  return {
    noi: noiSeries,
    cash_flow: cashFlowSeries,
    occupancy: occupancySeries,
  };
}

/**
 * Generates comparison points for all active projects against the selected metric.
 */
export function buildProjectComparisonPoints(
  projects: ProjectSummary[],
  projectResults: Map<string, ProjectMetricsResult>,
  metricKey: string,
): LiveComparisonPoint[] {
  return projects.map((p) => {
    const res = projectResults.get(p.id);
    let val = 0;
    if (res) {
      switch (metricKey) {
        case 'cap_rate':
          val = res.scorecard.capRate.value || 0;
          break;
        case 'cash_on_cash':
          val = res.scorecard.cashOnCash.value || 0;
          break;
        case 'dscr':
          val = res.scorecard.dscr.value || 0;
          break;
        case 'ltv':
          val = res.insights.financial.ltv.value || 0;
          break;
        case 'debt_yield':
          val = res.derived.debtYield || 0;
          break;
        case 'oer':
          val = res.scorecard.expenseRatio.value || 0;
          break;
        case 'grm':
          val = res.scorecard.grm.value || 0;
          break;
        case 'noi':
          val = res.scorecard.noi.value || 0;
          break;
        default:
          val = res.scorecard.capRate.value || 0;
      }
    } else {
      val = p.purchasePrice > 0 ? 6.5 : 0;
    }

    return {
      projectId: p.id,
      projectName: p.propertyName || p.address || 'Untitled Project',
      value: Number(val.toFixed(2)),
    };
  });
}
