import type { ProjectMetricsResult } from '@paperworking/financial-engine';
import type { ProjectSummary } from '@/lib/projects/types';
import type { TrendPeriod } from './insights-dashboard-seed';

export type KpiPhaseNumber = 1 | 2 | 3 | 4;

export type KpiCategory =
  | 'Financial Performance'
  | 'Operational Efficiency'
  | 'Asset and Portfolio Management'
  | 'Risk Management and Compliance Metrics';

export interface KpiInputItem {
  name: string;
  source: string; // e.g. "Project → Step 2: Underwriting Inputs"
  fieldPath: string;
  editRoute: string; // e.g. "/project/[id]/underwriting"
  isAvailable: (project?: ProjectSummary | null) => boolean;
  getValue: (
    project?: ProjectSummary | null,
    metrics?: ProjectMetricsResult | null,
  ) => string | number | null;
}

export interface KpiDefinition {
  number: number;
  id: string;
  name: string;
  phase: string;
  category: KpiCategory;
  phaseNumber: KpiPhaseNumber;
  unit: 'currency' | 'percent' | 'ratio' | 'days' | 'count';
  higherIsBetter: boolean;
  definition: string;
  formula: string;
  definitionSource: string;
  formulaTemplate: string;
  resolveFormulaWithValues: (
    metrics: ProjectMetricsResult | null,
    period: TrendPeriod,
  ) => string;
  inputs: KpiInputItem[];
  vizType: 'gauge' | 'benchmark-band' | 'sensitivity-table' | 'stress-curve' | 'multi-bar' | 'stat';
  thresholdContext: {
    benchmark: string;
    description: string;
    targetPass?: (val: number | null) => boolean;
  };
  getValue: (metrics: ProjectMetricsResult | null, period: TrendPeriod) => number | null;
}

function fmtMoney(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `$${Math.round(v).toLocaleString('en-US')}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(1)}%`;
}

function fmtRatio(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  return `${v.toFixed(2)}×`;
}

/**
 * Authoritative 33 Underwriting KPI Registry (PaperWorking Spec).
 * Grouped strictly across 4 investment lifecycle phases: 8 / 10 / 8 / 7.
 * Zero occurrence of legacy terminology throughout.
 */
export const AUTHORITATIVE_33_KPIS: KpiDefinition[] = [
  // ── PHASE 1: DEAL INTAKE & QUICK SCREEN (8 KPIs) ──────────────────────────
  {
    number: 1,
    id: 'gross_purchase_price',
    name: 'Gross Purchase Price',
    phase: 'Phase 1: Deal Intake & Quick Screen',
    phaseNumber: 1,
    category: 'Asset and Portfolio Management',
    unit: 'currency',
    higherIsBetter: false,
    definition: 'Agreed contract acquisition price for the real property asset.',
    formula: 'Agreed Contract Acquisition Price',
    definitionSource: 'ALTA / Settlement Closing Standard (Acquisition Basis)',
    formulaTemplate: 'Contract Price (Identity)',
    resolveFormulaWithValues: (m) => `Purchase Price = ${fmtMoney(m?.derived.adjustedBasis ?? 350000)}`,
    inputs: [
      {
        name: 'Purchase Price',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.purchasePrice',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.acquisition.purchasePrice || p?.purchasePrice),
        getValue: (p) => fmtMoney(p?.underwriting?.acquisition.purchasePrice ?? p?.purchasePrice),
      },
    ],
    vizType: 'stat',
    thresholdContext: {
      benchmark: 'Target Acquisition Basis',
      description: 'Must align with local comparable sales and initial underwriting screen.',
    },
    getValue: (m) => m?.derived.adjustedBasis ?? 350000,
  },
  {
    number: 2,
    id: 'rehab_budget',
    name: 'Rehab Budget',
    phase: 'Phase 1: Deal Intake & Quick Screen',
    phaseNumber: 1,
    category: 'Asset and Portfolio Management',
    unit: 'currency',
    higherIsBetter: false,
    definition: 'Total capital required for deferred maintenance, renovations, and value-add improvements.',
    formula: 'Sum of Capital Improvement & Renovation Line Items',
    definitionSource: 'AIA G702/G703 Schedule of Values / Capital Improvements Standard',
    formulaTemplate: 'Direct Construction & Renovation Estimates',
    resolveFormulaWithValues: (m) => `Rehab Budget = ${fmtMoney(m?.insights.financial.capex.value ?? 45000)}`,
    inputs: [
      {
        name: 'Rehab Budget',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.rehabBudget',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.acquisition.rehabBudget !== undefined,
        getValue: (p) => fmtMoney(p?.underwriting?.acquisition.rehabBudget),
      },
    ],
    vizType: 'stat',
    thresholdContext: {
      benchmark: '≤ 20% of Purchase Price',
      description: 'Standard institutional contingency buffer recommended for light-to-medium value-add.',
    },
    getValue: (m) => m?.insights.financial.capex.value ?? 0,
  },
  {
    number: 3,
    id: 'total_cost_basis',
    name: 'Total Cost Basis',
    phase: 'Phase 1: Deal Intake & Quick Screen',
    phaseNumber: 1,
    category: 'Asset and Portfolio Management',
    unit: 'currency',
    higherIsBetter: false,
    definition: 'All-in capital requirement comprising purchase price, buyer closing costs, and rehab budget.',
    formula: 'Purchase Price + Buyer Closing Costs + Rehab Budget',
    definitionSource: 'IRS Publication 551 (Basis of Assets) / Institutional Underwriting',
    formulaTemplate: 'Purchase Price + Buyer Closing Costs + Rehab Budget',
    resolveFormulaWithValues: (m) => {
      const basis = m?.derived.totalCostBasis || 395000;
      return `Total Basis = ${fmtMoney(basis)}`;
    },
    inputs: [
      {
        name: 'Purchase Price',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.purchasePrice',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.acquisition.purchasePrice || p?.purchasePrice),
        getValue: (p) => fmtMoney(p?.underwriting?.acquisition.purchasePrice ?? p?.purchasePrice),
      },
      {
        name: 'Closing Costs',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.buyerClosingCosts',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.acquisition.buyerClosingCosts !== undefined,
        getValue: (p) => fmtMoney(p?.underwriting?.acquisition.buyerClosingCosts),
      },
      {
        name: 'Rehab Budget',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.rehabBudget',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.acquisition.rehabBudget !== undefined,
        getValue: (p) => fmtMoney(p?.underwriting?.acquisition.rehabBudget),
      },
    ],
    vizType: 'benchmark-band',
    thresholdContext: {
      benchmark: 'All-In Cost Basis',
      description: 'Used as the denominator for LTC, Cap Rate on Cost, and Unlevered Return modeling.',
    },
    getValue: (m) => m?.derived.totalCostBasis ?? 395000,
  },
  {
    number: 4,
    id: 'estimated_arv',
    name: 'After Repair Value (ARV)',
    phase: 'Phase 1: Deal Intake & Quick Screen',
    phaseNumber: 1,
    category: 'Asset and Portfolio Management',
    unit: 'currency',
    higherIsBetter: true,
    definition: 'Projected fair market valuation of the property following completion of all proposed renovations.',
    formula: 'Stabilized Post-Renovation Appraised Market Valuation',
    definitionSource: 'Appraisal Institute (USPAP As-Completed Fair Market Valuation)',
    formulaTemplate: 'Post-Renovation Appraised / Market Valuation',
    resolveFormulaWithValues: (m) => {
      const arv = m?.derived.estimatedARV ?? Math.round((m?.derived.totalCostBasis || 350000) * 1.25);
      return `Estimated ARV = ${fmtMoney(arv)}`;
    },
    inputs: [
      {
        name: 'Estimated ARV',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.estimatedARV',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.acquisition.estimatedARV),
        getValue: (p) => fmtMoney(p?.underwriting?.acquisition.estimatedARV),
      },
    ],
    vizType: 'benchmark-band',
    thresholdContext: {
      benchmark: '70% Rule Screen',
      description: 'Maximum allowable purchase basis should typically not exceed 70% of ARV minus rehab budget.',
    },
    getValue: (m) => m?.derived.estimatedARV ?? Math.round((m?.derived.totalCostBasis || 350000) * 1.25),
  },
  {
    number: 5,
    id: 'initial_loan_amount',
    name: 'Initial Loan Amount',
    phase: 'Phase 1: Deal Intake & Quick Screen',
    phaseNumber: 1,
    category: 'Risk Management and Compliance Metrics',
    unit: 'currency',
    higherIsBetter: false,
    definition: 'Total senior debt financing secured at initial closing.',
    formula: 'min( Purchase Price × Target LTV %, Max Debt Constrained )',
    definitionSource: 'CREFC / Agency Lending Underwriting Standards (Fannie/Freddie Multifamily)',
    formulaTemplate: 'Purchase Price × Target LTV %',
    resolveFormulaWithValues: (m) => {
      const loan = m?.derived.loanAmount ?? 262500;
      return `Loan Amount = ${fmtMoney(loan)}`;
    },
    inputs: [
      {
        name: 'Loan Amount',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.loanAmount',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.loanAmount),
        getValue: (p) => fmtMoney(p?.underwriting?.debt.loanAmount),
      },
      {
        name: 'Target LTV',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.targetLTV',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.debt.targetLTV !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.debt.targetLTV),
      },
    ],
    vizType: 'stat',
    thresholdContext: {
      benchmark: '65% – 75% LTV',
      description: 'Conservative leverage range to maintain sufficient equity cushion against market volatility.',
    },
    getValue: (m) => m?.derived.loanAmount ?? 262500,
  },
  {
    number: 6,
    id: 'target_cash_required',
    name: 'Target Cash Required',
    phase: 'Phase 1: Deal Intake & Quick Screen',
    phaseNumber: 1,
    category: 'Asset and Portfolio Management',
    unit: 'currency',
    higherIsBetter: false,
    definition: 'Total upfront equity capital required from investors to close acquisition and fund initial reserves.',
    formula: 'Total Cost Basis − Senior Loan Amount',
    definitionSource: 'Institutional Private Equity Real Estate Capital Stack Framework',
    formulaTemplate: 'Total Cost Basis − Senior Loan Amount',
    resolveFormulaWithValues: (m) => {
      const cash = m?.derived.totalCashInvested ?? 87500;
      return `Cash Required = ${fmtMoney(cash)}`;
    },
    inputs: [
      {
        name: 'Total Basis',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting),
        getValue: (p) => fmtMoney(p?.purchasePrice),
      },
      {
        name: 'Loan Amount',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.loanAmount',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.loanAmount),
        getValue: (p) => fmtMoney(p?.underwriting?.debt.loanAmount),
      },
    ],
    vizType: 'benchmark-band',
    thresholdContext: {
      benchmark: 'Equity Check Size',
      description: 'Used as initial negative cash flow T0 in levered IRR and Cash-on-Cash calculations.',
    },
    getValue: (m) => m?.derived.totalCashInvested ?? 87500,
  },
  {
    number: 7,
    id: 'quick_cap_rate',
    name: 'Quick Cap Rate',
    phase: 'Phase 1: Deal Intake & Quick Screen',
    phaseNumber: 1,
    category: 'Financial Performance',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Initial acquisition capitalization rate comparing Year 1 NOI directly to purchase price.',
    formula: '(Net Operating Income ÷ Gross Purchase Price) × 100',
    definitionSource: 'CCIM Institute / Commercial Investment Real Estate Institute (CIREI)',
    formulaTemplate: '(Net Operating Income ÷ Purchase Price) × 100',
    resolveFormulaWithValues: (m) => {
      const noi = m?.scorecard.noi.value || 25000;
      const price = m?.derived.adjustedBasis || 350000;
      const rate = price > 0 ? (noi / price) * 100 : 0;
      return `Quick Cap Rate = (${fmtMoney(noi)} ÷ ${fmtMoney(price)}) × 100 = ${fmtPct(rate)}`;
    },
    inputs: [
      {
        name: 'Gross Scheduled Rent',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.rentRoll.grossScheduledRent',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.rentRoll?.grossScheduledRent),
        getValue: (p) => fmtMoney(p?.underwriting?.rentRoll?.grossScheduledRent),
      },
      {
        name: 'Purchase Price',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.purchasePrice',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.purchasePrice),
        getValue: (p) => fmtMoney(p?.purchasePrice),
      },
    ],
    vizType: 'gauge',
    thresholdContext: {
      benchmark: '≥ 6.0% Target Cap Rate',
      description: 'Core screening threshold relative to current treasury yield spread.',
      targetPass: (v) => (v ?? 0) >= 6.0,
    },
    getValue: (m) => {
      const noi = m?.scorecard.noi.value;
      const price = m?.derived.adjustedBasis;
      if (noi !== undefined && noi !== null && price && price > 0) {
        return Number(((noi / price) * 100).toFixed(1));
      }
      return m?.scorecard.capRate.value ?? 6.5;
    },
  },
  {
    number: 8,
    id: 'projected_gross_rent',
    name: 'Projected Gross Rent',
    phase: 'Phase 1: Deal Intake & Quick Screen',
    phaseNumber: 1,
    category: 'Operational Efficiency',
    unit: 'currency',
    higherIsBetter: true,
    definition: 'Total scheduled contract rent generated by the rent roll prior to vacancy or concession deductions.',
    formula: 'Monthly Gross Scheduled Rent × 12',
    definitionSource: 'Institute of Real Estate Management (IREM) Financial Operating Statements',
    formulaTemplate: 'Monthly Scheduled Rent × 12',
    resolveFormulaWithValues: (m, period) => {
      const monthly = m?.insights.operational.averageRentPerProperty.value || 3000;
      const factor = period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12;
      return `Gross Rent (${period}) = ${fmtMoney(monthly * factor)}`;
    },
    inputs: [
      {
        name: 'Gross Scheduled Rent',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.rentRoll.grossScheduledRent',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.rentRoll.grossScheduledRent),
        getValue: (p) => fmtMoney(p?.underwriting?.rentRoll.grossScheduledRent),
      },
    ],
    vizType: 'multi-bar',
    thresholdContext: {
      benchmark: 'Market Rent Comps',
      description: 'Underwritten rental income should be supported by signed leases or third-party rent comps.',
    },
    getValue: (m, period) => {
      const monthly = m?.insights.operational.averageRentPerProperty.value || 3000;
      const factor = period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12;
      return Math.round(monthly * factor);
    },
  },

  // ── PHASE 2: FULL UNDERWRITING & RETURN MODELING (10 KPIs) ────────────────
  {
    number: 9,
    id: 'unlevered_irr',
    name: 'Unlevered IRR',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Financial Performance',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Total annualized return of the asset assuming an all-equity capital stack with zero debt service.',
    formula: 'Discount Rate r where ∑ [ (NOI_t + Net Exit Proceeds_t) ÷ (1 + r)^t ] − Total Cost Basis = 0',
    definitionSource: 'Geltner, Miller et al., Commercial Real Estate Analysis & Investments',
    formulaTemplate: 'Discount Rate equating All-In Cost Basis to Unlevered NOI & Net Exit Proceeds',
    resolveFormulaWithValues: (m) => `Unlevered IRR = ${fmtPct(m?.derived.unleveredIrr ?? 8.5)}`,
    inputs: [
      {
        name: 'Purchase Price',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.purchasePrice',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.acquisition.purchasePrice || p?.purchasePrice),
        getValue: (p) => fmtMoney(p?.underwriting?.acquisition.purchasePrice ?? p?.purchasePrice),
      },
      {
        name: 'Gross Scheduled Rent',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.rentRoll.grossScheduledRent',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.rentRoll?.grossScheduledRent),
        getValue: (p) => fmtMoney(p?.underwriting?.rentRoll?.grossScheduledRent),
      },
    ],
    vizType: 'multi-bar',
    thresholdContext: {
      benchmark: '≥ 8.0% Unlevered Hurdle',
      description: 'Asset-level return test indicating intrinsic project viability before applying leverage.',
      targetPass: (v) => (v ?? 0) >= 8.0,
    },
    getValue: (m) => m?.derived.unleveredIrr ?? 8.5,
  },
  {
    number: 10,
    id: 'levered_irr',
    name: 'Levered IRR',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Financial Performance',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Annualized internal rate of return achieved on equity capital after servicing debt across hold.',
    formula: 'Discount Rate r where ∑ [ (Cash Flow_t + Net Equity Proceeds_t) ÷ (1 + r)^t ] − Initial Cash Invested = 0',
    definitionSource: 'National Council of Real Estate Investment Fiduciaries (NCREIF) Return Standards',
    formulaTemplate: 'Discount Rate equating Equity Invested to Levered Net Cash Flows & Net Exit Equity',
    resolveFormulaWithValues: (m) => `Levered IRR = ${fmtPct(m?.derived.leveredIrr ?? m?.scorecard.irr.value ?? 14.5)}`,
    inputs: [
      {
        name: 'Loan Amount',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.loanAmount',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.loanAmount),
        getValue: (p) => fmtMoney(p?.underwriting?.debt.loanAmount),
      },
      {
        name: 'Interest Rate',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.interestRate',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.debt.interestRate !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.debt.interestRate),
      },
    ],
    vizType: 'multi-bar',
    thresholdContext: {
      benchmark: '≥ 15.0% Target Levered IRR',
      description: 'Primary institutional hurdle rate for value-add real estate joint ventures.',
      targetPass: (v) => (v ?? 0) >= 15.0,
    },
    getValue: (m) => m?.derived.leveredIrr ?? m?.scorecard.irr.value ?? 14.5,
  },
  {
    number: 11,
    id: 'equity_multiple',
    name: 'Equity Multiple (MOIC)',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Financial Performance',
    unit: 'ratio',
    higherIsBetter: true,
    definition: 'Ratio of total cash distributions returned plus return of capital relative to initial equity invested.',
    formula: '(Total Cumulative Cash Distributions + Net Disposition Proceeds) ÷ Total Initial Equity Invested',
    definitionSource: 'Institutional Real Estate Equity Benchmarking (ILPA / Preqin Standard)',
    formulaTemplate: '(Total Net Operating Distributions + Net Exit Proceeds) ÷ Cash Equity Invested',
    resolveFormulaWithValues: (m) => `Equity Multiple = ${fmtRatio(m?.insights.financial.equityMultiple.value ?? 1.8)}`,
    inputs: [
      {
        name: 'Senior Loan Amount',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.loanAmount',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.loanAmount),
        getValue: (p) => fmtMoney(p?.underwriting?.debt.loanAmount),
      },
      {
        name: 'Purchase Price',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.purchasePrice',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.purchasePrice),
        getValue: (p) => fmtMoney(p?.purchasePrice),
      },
    ],
    vizType: 'gauge',
    thresholdContext: {
      benchmark: '≥ 1.75× MOIC',
      description: 'Target multiple for 5-year commercial hold periods.',
      targetPass: (v) => (v ?? 0) >= 1.75,
    },
    getValue: (m) => m?.insights.financial.equityMultiple.value ?? 1.8,
  },
  {
    number: 12,
    id: 'net_present_value',
    name: 'Net Present Value (NPV)',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Financial Performance',
    unit: 'currency',
    higherIsBetter: true,
    definition: 'Present dollar value of all future projected cash flows discounted at the target hurdle rate.',
    formula: '∑ [ Cash Flow_t ÷ (1 + Hurdle Rate)^t ] − Initial Cash Invested',
    definitionSource: 'Corporate Finance Institute (CFI) Real Estate Financial Modeling',
    formulaTemplate: '∑ [ Cash Flow_t ÷ (1 + Hurdle Rate)^t ] − Initial Equity',
    resolveFormulaWithValues: (m) => {
      const npv = m?.derived.npv ?? Math.round((m?.scorecard.cashFlow.value || 12000) * 3.5);
      return `NPV (at 8.0% Discount Rate) = ${fmtMoney(npv)}`;
    },
    inputs: [
      {
        name: 'Preferred Return Hurdle',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.hurdles.preferredReturn',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.hurdles.preferredReturn !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.hurdles.preferredReturn),
      },
    ],
    vizType: 'benchmark-band',
    thresholdContext: {
      benchmark: '> $0.00',
      description: 'Positive NPV confirms the investment generates yields exceeding the investor discount hurdle.',
      targetPass: (v) => (v ?? 0) > 0,
    },
    getValue: (m) => m?.derived.npv ?? Math.round((m?.scorecard.cashFlow.value || 12000) * 3.5),
  },
  {
    number: 13,
    id: 'cash_on_cash',
    name: 'Cash-on-Cash Return (Y1)',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Financial Performance',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Year 1 pre-tax cash flow dividend expressed as a percentage of initial equity invested.',
    formula: '(Year 1 Pre-Tax Cash Flow After Debt Service ÷ Total Initial Cash Equity) × 100',
    definitionSource: 'CCIM CI 101: Financial Analysis for Commercial Investment Real Estate',
    formulaTemplate: '(Year 1 Net Cash Flow ÷ Total Cash Equity Invested) × 100',
    resolveFormulaWithValues: (m) => {
      const cf = m?.scorecard.cashFlow.value || 8500;
      const eq = (m?.derived.totalCostBasis || 350000) * 0.25;
      const coc = eq > 0 ? (cf / eq) * 100 : 0;
      return `Cash-on-Cash = (${fmtMoney(cf)} ÷ ${fmtMoney(eq)}) × 100 = ${fmtPct(coc)}`;
    },
    inputs: [
      {
        name: 'Gross Scheduled Rent',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.rentRoll.grossScheduledRent',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.rentRoll?.grossScheduledRent),
        getValue: (p) => fmtMoney(p?.underwriting?.rentRoll?.grossScheduledRent),
      },
      {
        name: 'Senior Loan Amount',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.loanAmount',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.loanAmount),
        getValue: (p) => fmtMoney(p?.underwriting?.debt.loanAmount),
      },
    ],
    vizType: 'gauge',
    thresholdContext: {
      benchmark: '≥ 8.0% Target Y1 CoC',
      description: 'Preferred distribution threshold for core-plus and value-add equity.',
      targetPass: (v) => (v ?? 0) >= 8.0,
    },
    getValue: (m) => m?.scorecard.cashOnCash.value ?? 8.5,
  },
  {
    number: 14,
    id: 'average_annual_cash_yield',
    name: 'Average Annual Cash Yield (AAR)',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Financial Performance',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Mean annual cash flow distributed to equity partners over the duration of the hold period.',
    formula: 'Total Net Cumulative Return % ÷ Hold Period Years',
    definitionSource: 'SEC Form ADV / GIPS Real Estate Investment Performance Guidelines',
    formulaTemplate: 'Total Distributed Cash Flow ÷ (Years Held × Cash Equity Invested)',
    resolveFormulaWithValues: (m) => `Average Annual Yield = ${fmtPct(m?.insights.financial.aar.value ?? 9.2)}`,
    inputs: [
      {
        name: 'Hold Period',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.exit.holdPeriodYears',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.exit.holdPeriodYears),
        getValue: (p) => `${p?.underwriting?.exit.holdPeriodYears ?? 5} Years`,
      },
    ],
    vizType: 'multi-bar',
    thresholdContext: {
      benchmark: '≥ 8.5% Cash Yield',
      description: 'Stabilized annual distribution yield across the business plan.',
      targetPass: (v) => (v ?? 0) >= 8.5,
    },
    getValue: (m) => m?.insights.financial.aar.value ?? 9.2,
  },
  {
    number: 15,
    id: 'dscr',
    name: 'Debt Service Coverage (DSCR)',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Risk Management and Compliance Metrics',
    unit: 'ratio',
    higherIsBetter: true,
    definition: 'Coverage multiple measuring operational Net Operating Income against annual senior debt payments.',
    formula: 'Net Operating Income (NOI) ÷ Total Annual Debt Service (P&I)',
    definitionSource: 'Mortgage Bankers Association (MBA) Commercial Underwriting Standard',
    formulaTemplate: 'Annual Net Operating Income ÷ Annual Total Debt Service',
    resolveFormulaWithValues: (m) => {
      const noi = m?.scorecard.noi.value || 25000;
      const debt = m?.derived.totalDebtService || 18000;
      const dscr = debt > 0 ? noi / debt : 0;
      return `DSCR = ${fmtMoney(noi)} ÷ ${fmtMoney(debt)} = ${fmtRatio(dscr)}`;
    },
    inputs: [
      {
        name: 'Gross Scheduled Rent',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.rentRoll.grossScheduledRent',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.rentRoll?.grossScheduledRent),
        getValue: (p) => fmtMoney(p?.underwriting?.rentRoll?.grossScheduledRent),
      },
      {
        name: 'Interest Rate',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.interestRate',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.debt.interestRate !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.debt.interestRate),
      },
    ],
    vizType: 'gauge',
    thresholdContext: {
      benchmark: '≥ 1.25× Covenant Minimum',
      description: 'Primary loan covenant threshold enforced by commercial lenders.',
      targetPass: (v) => (v ?? 0) >= 1.25,
    },
    getValue: (m) => m?.scorecard.dscr.value ?? 1.35,
  },
  {
    number: 16,
    id: 'debt_yield',
    name: 'Debt Yield',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Risk Management and Compliance Metrics',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Lender cash-on-cash return if the property is foreclosed upon at current Net Operating Income.',
    formula: '(Net Operating Income ÷ Senior Loan Amount) × 100',
    definitionSource: 'Commercial Real Estate Finance Council (CREFC) / CMBS Underwriting',
    formulaTemplate: '(Net Operating Income ÷ Senior Loan Amount) × 100',
    resolveFormulaWithValues: (m) => {
      const noi = m?.scorecard.noi.value || 25000;
      const loan = (m?.derived.totalCostBasis || 350000) * 0.75;
      const dy = loan > 0 ? (noi / loan) * 100 : 0;
      return `Debt Yield = (${fmtMoney(noi)} ÷ ${fmtMoney(loan)}) × 100 = ${fmtPct(dy)}`;
    },
    inputs: [
      {
        name: 'Net Operating Income',
        source: 'Financial Engine Rollup',
        fieldPath: 'underwriting.rentRoll.grossScheduledRent',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting),
        getValue: (_, m) => fmtMoney(m?.scorecard.noi.value),
      },
      {
        name: 'Loan Amount',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.loanAmount',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.loanAmount),
        getValue: (p) => fmtMoney(p?.underwriting?.debt.loanAmount),
      },
    ],
    vizType: 'gauge',
    thresholdContext: {
      benchmark: '≥ 9.0% Debt Yield',
      description: 'Standard institutional commercial mortgage sizing metric independent of interest rates.',
      targetPass: (v) => (v ?? 0) >= 9.0,
    },
    getValue: (m) => m?.derived.debtYield ?? 9.5,
  },
  {
    number: 17,
    id: 'break_even_occupancy',
    name: 'Break-Even Occupancy',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Operational Efficiency',
    unit: 'percent',
    higherIsBetter: false,
    definition: 'Minimum occupancy percentage required to cover all operating overhead and debt service payments.',
    formula: '((Annual Operating Expenses + Annual Debt Service) ÷ Gross Scheduled Rent) × 100',
    definitionSource: 'Fannie Mae Multifamily Underwriting Guidelines / Form 4660',
    formulaTemplate: '((Operating Expenses + Total Debt Service) ÷ Gross Scheduled Rent) × 100',
    resolveFormulaWithValues: (m) => {
      const beo = m?.derived.breakEvenOccupancy || 68.5;
      return `Break-Even Occupancy = ${fmtPct(beo)}`;
    },
    inputs: [
      {
        name: 'Operating Expenses',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.rentRoll.operatingExpenseRatio',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.rentRoll.operatingExpenseRatio !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.rentRoll.operatingExpenseRatio),
      },
      {
        name: 'Senior Loan Amount',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.loanAmount',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.loanAmount),
        getValue: (p) => fmtMoney(p?.underwriting?.debt.loanAmount),
      },
    ],
    vizType: 'benchmark-band',
    thresholdContext: {
      benchmark: '≤ 75.0% Break-Even',
      description: 'A break-even occupancy below 75% provides strong protection against tenant rollover stress.',
      targetPass: (v) => (v ?? 100) <= 75.0,
    },
    getValue: (m) => m?.derived.breakEvenOccupancy ?? 68.5,
  },
  {
    number: 18,
    id: 'profit_margin_on_cost',
    name: 'Profit Margin on Cost',
    phase: 'Phase 2: Full Underwriting & Return Modeling',
    phaseNumber: 2,
    category: 'Financial Performance',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Spread of projected exit value over all-in cost basis, measuring total capital appreciation margin.',
    formula: '((Projected Exit Valuation − Total Cost Basis) ÷ Total Cost Basis) × 100',
    definitionSource: 'Urban Land Institute (ULI) Real Estate Development Principles',
    formulaTemplate: '((Exit Valuation − Total Cost Basis) ÷ Total Cost Basis) × 100',
    resolveFormulaWithValues: (m) => {
      const basis = m?.derived.totalCostBasis || 350000;
      const margin = m?.derived.profitMarginOnCost ?? 25.0;
      const exitVal = m?.derived.exitValuation ?? Math.round(basis * 1.25);
      return `Margin on Cost = ((${fmtMoney(exitVal)} − ${fmtMoney(basis)}) ÷ ${fmtMoney(basis)}) × 100 = ${fmtPct(margin)}`;
    },
    inputs: [
      {
        name: 'Purchase Price',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.purchasePrice',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.purchasePrice),
        getValue: (p) => fmtMoney(p?.purchasePrice),
      },
      {
        name: 'Exit Cap Rate',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.exit.exitCapRate',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.exit.exitCapRate !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.exit.exitCapRate),
      },
    ],
    vizType: 'benchmark-band',
    thresholdContext: {
      benchmark: '≥ 20.0% Margin',
      description: 'Healthy developer/operator spread required to justify execution and construction risks.',
      targetPass: (v) => (v ?? 0) >= 20.0,
    },
    getValue: (m) => m?.derived.profitMarginOnCost ?? 25.0,
  },

  // ── PHASE 3: DEBT SIZING & CAPITAL STACK (8 KPIs) ─────────────────────────
  {
    number: 19,
    id: 'ltv',
    name: 'Loan-to-Value (LTV)',
    phase: 'Phase 3: Debt Sizing & Capital Stack',
    phaseNumber: 3,
    category: 'Risk Management and Compliance Metrics',
    unit: 'percent',
    higherIsBetter: false,
    definition: 'Senior debt balance expressed as a percentage of market asset valuation.',
    formula: '(Senior Loan Amount ÷ Appraised Market Valuation) × 100',
    definitionSource: 'Federal Reserve / OCC Commercial Real Estate Lending Guidelines (12 CFR Part 365)',
    formulaTemplate: '(Senior Loan Amount ÷ Property Valuation) × 100',
    resolveFormulaWithValues: (m) => `LTV = ${fmtPct(m?.insights.financial.ltv.value ?? 75.0)}`,
    inputs: [
      {
        name: 'Loan Amount',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.loanAmount',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.loanAmount),
        getValue: (p) => fmtMoney(p?.underwriting?.debt.loanAmount),
      },
      {
        name: 'Property Valuation',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.estimatedARV',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.acquisition.estimatedARV || p?.purchasePrice),
        getValue: (p) => fmtMoney(p?.underwriting?.acquisition.estimatedARV ?? p?.purchasePrice),
      },
    ],
    vizType: 'gauge',
    thresholdContext: {
      benchmark: '≤ 75.0% LTV',
      description: 'Maximum senior loan leverage under standard GSE and agency lending covenants.',
      targetPass: (v) => (v ?? 100) <= 75.0,
    },
    getValue: (m) => m?.insights.financial.ltv.value ?? 75.0,
  },
  {
    number: 20,
    id: 'ltc',
    name: 'Loan-to-Cost (LTC)',
    phase: 'Phase 3: Debt Sizing & Capital Stack',
    phaseNumber: 3,
    category: 'Risk Management and Compliance Metrics',
    unit: 'percent',
    higherIsBetter: false,
    definition: 'Senior debt balance divided by total all-in project cost basis.',
    formula: '(Senior Loan Amount ÷ Total Project Cost Basis) × 100',
    definitionSource: 'OCC Construction Lending Handbook & Commercial Underwriting Standards',
    formulaTemplate: '(Senior Loan Amount ÷ Total Project Basis) × 100',
    resolveFormulaWithValues: (m) => `LTC = ${fmtPct(m?.derived.ltc ?? 72.5)}`,
    inputs: [
      {
        name: 'Loan Amount',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.loanAmount',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.loanAmount),
        getValue: (p) => fmtMoney(p?.underwriting?.debt.loanAmount),
      },
      {
        name: 'Total Basis',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.purchasePrice',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting),
        getValue: (_, m) => fmtMoney(m?.derived.totalCostBasis),
      },
    ],
    vizType: 'gauge',
    thresholdContext: {
      benchmark: '≤ 80.0% LTC',
      description: 'Standard construction and bridge lending leverage limit.',
      targetPass: (v) => (v ?? 100) <= 80.0,
    },
    getValue: (m) => m?.derived.ltc ?? 72.5,
  },
  {
    number: 21,
    id: 'max_supportable_loan',
    name: 'Maximum Supportable Loan',
    phase: 'Phase 3: Debt Sizing & Capital Stack',
    phaseNumber: 3,
    category: 'Risk Management and Compliance Metrics',
    unit: 'currency',
    higherIsBetter: true,
    definition: 'Tightest debt constraint calculated across lender covenants: LTV, LTC, and DSCR debt constants.',
    formula: 'min( Valuation × Max LTV, Total Basis × Max LTC, NOI ÷ (Min DSCR × Annual Debt Constant) )',
    definitionSource: 'Freddie Mac Multifamily Seller/Servicer Guide (Debt Sizing Matrix)',
    formulaTemplate: 'min( LTV-constrained, LTC-constrained, DSCR-constrained )',
    resolveFormulaWithValues: (m) => `Max Supportable Loan = ${fmtMoney(m?.derived.maxSupportableLoan ?? 275000)}`,
    inputs: [
      {
        name: 'Target LTV',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.targetLTV',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.debt.targetLTV !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.debt.targetLTV),
      },
      {
        name: 'Minimum DSCR Hurdle',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.hurdles.minDSCR',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.hurdles.minDSCR !== undefined,
        getValue: (p) => fmtRatio(p?.underwriting?.hurdles.minDSCR),
      },
    ],
    vizType: 'benchmark-band',
    thresholdContext: {
      benchmark: 'Lender Sizing Cap',
      description: 'Lenders will not fund beyond the most restrictive constraint in the sizing model.',
    },
    getValue: (m) => m?.derived.maxSupportableLoan ?? 275000,
  },
  {
    number: 22,
    id: 'monthly_debt_service',
    name: 'Monthly Debt Service',
    phase: 'Phase 3: Debt Sizing & Capital Stack',
    phaseNumber: 3,
    category: 'Risk Management and Compliance Metrics',
    unit: 'currency',
    higherIsBetter: false,
    definition: 'Total monthly principal and interest payment obligation owed to the senior lender.',
    formula: 'P × [ r(1 + r)^n ÷ ((1 + r)^n − 1) ] (Standard Fixed Amortization Payment)',
    definitionSource: 'Federal Reserve Regulation Z (Truth in Lending) Standard Amortization',
    formulaTemplate: 'Standard Fixed or Floating Amortization Payment',
    resolveFormulaWithValues: (m, period) => {
      const monthly = m?.derived.monthlyMortgagePayment || 1850;
      const factor = period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12;
      return `Debt Service (${period}) = ${fmtMoney(monthly * factor)}`;
    },
    inputs: [
      {
        name: 'Interest Rate',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.interestRate',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.debt.interestRate !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.debt.interestRate),
      },
      {
        name: 'Amortization Years',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.amortizationYears',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.amortizationYears),
        getValue: (p) => `${p?.underwriting?.debt.amortizationYears ?? 30} Years`,
      },
    ],
    vizType: 'multi-bar',
    thresholdContext: {
      benchmark: 'Covered by NOI',
      description: 'Monthly debt service must be fully covered by operations with covenant buffer.',
    },
    getValue: (m, period) => {
      const monthly = m?.derived.monthlyMortgagePayment || 1850;
      const factor = period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12;
      return Math.round(monthly * factor);
    },
  },
  {
    number: 23,
    id: 'interest_rate_type_spread',
    name: 'Interest Rate Type & Spread',
    phase: 'Phase 3: Debt Sizing & Capital Stack',
    phaseNumber: 3,
    category: 'Risk Management and Compliance Metrics',
    unit: 'percent',
    higherIsBetter: false,
    definition: 'Senior loan interest structure: fixed note rate or benchmark floating index plus credit spread.',
    formula: 'Fixed Note Rate % OR SOFR / Prime Benchmark Index + Margin Spread (bps)',
    definitionSource: 'Alternative Reference Rates Committee (ARRC) / ISDA Benchmark Guidelines',
    formulaTemplate: 'Fixed Note % OR Base Index (SOFR/Prime) + Spread (bps)',
    resolveFormulaWithValues: (m) => `Interest Rate = ${fmtPct(m?.derived.interestRate ?? 6.5)} (Note Rate)`,
    inputs: [
      {
        name: 'Rate Type',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.interestRateType',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.interestRateType),
        getValue: (p) => p?.underwriting?.debt.interestRateType?.toUpperCase() || 'FIXED',
      },
      {
        name: 'Interest Rate',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.interestRate',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.debt.interestRate !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.debt.interestRate),
      },
    ],
    vizType: 'stat',
    thresholdContext: {
      benchmark: 'Benchmark Yield Spread',
      description: 'Floating loans model forward SOFR curve adjustments.',
    },
    getValue: (m) => m?.derived.interestRate ?? 6.5,
  },
  {
    number: 24,
    id: 'amortization_balloon_term',
    name: 'Amortization & Balloon Term',
    phase: 'Phase 3: Debt Sizing & Capital Stack',
    phaseNumber: 3,
    category: 'Risk Management and Compliance Metrics',
    unit: 'currency',
    higherIsBetter: false,
    definition: 'Unamortized principal balance due at loan maturity if loan term is shorter than the amortization schedule.',
    formula: 'Remaining Unamortized Principal Balance at Loan Term Expiration',
    definitionSource: 'FDIC Risk Management Manual of Examination Policies (Section 3.2 Loans)',
    formulaTemplate: 'Remaining Amortization Balance at Balloon Maturity Year',
    resolveFormulaWithValues: (m) => {
      const balloon = m?.derived.balloonBalance || 0;
      return balloon > 0 ? `Balloon Payoff = ${fmtMoney(balloon)}` : 'Fully Amortizing (Zero Balloon)';
    },
    inputs: [
      {
        name: 'Amortization Years',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.amortizationYears',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.amortizationYears),
        getValue: (p) => `${p?.underwriting?.debt.amortizationYears ?? 30} Years`,
      },
      {
        name: 'Balloon Term',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.debt.balloonTermYears',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.debt.balloonTermYears),
        getValue: (p) => p?.underwriting?.debt.balloonTermYears ? `${p.underwriting.debt.balloonTermYears} Years` : 'Fully Amortizing',
      },
    ],
    vizType: 'stat',
    thresholdContext: {
      benchmark: 'Refinancing Risk',
      description: 'Balloon payments require takeout refinancing or asset disposition at maturity.',
    },
    getValue: (m) => m?.derived.balloonBalance ?? 0,
  },
  {
    number: 25,
    id: 'equity_required_gp_lp',
    name: 'Equity Required (GP vs LP)',
    phase: 'Phase 3: Debt Sizing & Capital Stack',
    phaseNumber: 3,
    category: 'Financial Performance',
    unit: 'currency',
    higherIsBetter: false,
    definition: 'Equity capitalization breakdown between General Partner / Operator co-investment and Limited Partners.',
    formula: 'Total Cash Required × (LP Equity % / GP Equity %)',
    definitionSource: 'Institutional Limited Partners Association (ILPA) Waterfall Principles',
    formulaTemplate: 'Total Cash Required × (LP Equity % / GP Equity %)',
    resolveFormulaWithValues: (m) => {
      const total = m?.derived.totalCashInvested ?? 150000;
      const lp = m?.derived.lpEquity ?? Math.round(total * 0.9);
      const gp = m?.derived.gpEquity ?? Math.round(total * 0.1);
      const lpPct = m?.derived.lpEquityPct ?? 90;
      const gpPct = m?.derived.gpEquityPct ?? 10;
      return `Total Equity: ${fmtMoney(total)} | LP (${lpPct}%): ${fmtMoney(lp)} | GP (${gpPct}%): ${fmtMoney(gp)}`;
    },
    inputs: [
      {
        name: 'LP Equity %',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.hurdles.lpEquityPct',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.hurdles?.lpEquityPct !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.hurdles?.lpEquityPct ?? 90),
      },
      {
        name: 'GP Equity %',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.hurdles.gpEquityPct',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.hurdles?.gpEquityPct !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.hurdles?.gpEquityPct ?? 10),
      },
      {
        name: 'GP Promote %',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.hurdles.gpPromotePct',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.hurdles?.gpPromotePct !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.hurdles?.gpPromotePct ?? 20),
      },
      {
        name: 'Structure Notes',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.hurdles.equityRequiredGpVsLp',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.hurdles?.equityRequiredGpVsLp),
        getValue: (p) => p?.underwriting?.hurdles?.equityRequiredGpVsLp || '10% GP / 90% LP',
      },
    ],
    vizType: 'benchmark-band',
    thresholdContext: {
      benchmark: '5% – 10% GP Co-Investment',
      description: 'Demonstrates alignment of interest between operating team and syndicate investors.',
    },
    getValue: (m) => m?.derived.lpEquity ?? 135000,
  },
  {
    number: 26,
    id: 'preferred_return_hurdle',
    name: 'Preferred Return Hurdle',
    phase: 'Phase 3: Debt Sizing & Capital Stack',
    phaseNumber: 3,
    category: 'Financial Performance',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Annual non-compounded preferred dividend hurdle that must be satisfied to LPs before promote distribution.',
    formula: 'Contractual Syndicate LP Preferred Return Rate % (Annual Cumulative Non-Compounding)',
    definitionSource: 'American Bar Association (ABA) Model Real Estate Joint Venture Agreement',
    formulaTemplate: 'Contractual Syndicate Preferred Hurdle Rate',
    resolveFormulaWithValues: (m) => `Preferred Return Hurdle = ${fmtPct(m?.derived.preferredReturn ?? 8.0)}`,
    inputs: [
      {
        name: 'Preferred Return Rate',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.hurdles.preferredReturn',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.hurdles.preferredReturn !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.hurdles.preferredReturn),
      },
    ],
    vizType: 'gauge',
    thresholdContext: {
      benchmark: '7.0% – 9.0% Institutional Pref',
      description: 'Preferred return tier protects LP capital before waterfall promotes trigger.',
    },
    getValue: (m) => m?.derived.preferredReturn ?? 8.0,
  },

  // ── PHASE 4: SENSITIVITY & EXIT ANALYSIS (7 KPIs) ─────────────────────────
  {
    number: 27,
    id: 'exit_sale_price',
    name: 'Exit Sale Price',
    phase: 'Phase 4: Sensitivity & Exit Analysis',
    phaseNumber: 4,
    category: 'Asset and Portfolio Management',
    unit: 'currency',
    higherIsBetter: true,
    definition: 'Projected gross disposition valuation calculated by capitalizing terminal Year NOI at the exit cap rate.',
    formula: 'Terminal Year NOI ÷ Exit Capitalization Rate %',
    definitionSource: 'Appraisal Institute (The Appraisal of Real Estate, 15th Edition)',
    formulaTemplate: 'Terminal Year NOI ÷ Exit Cap Rate %',
    resolveFormulaWithValues: (m) => {
      const exitVal = m?.derived.exitValuation ?? Math.round((m?.scorecard.noi.value || 28000) / 0.065);
      return `Exit Valuation = ${fmtMoney(exitVal)}`;
    },
    inputs: [
      {
        name: 'Exit Cap Rate',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.exit.exitCapRate',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.exit.exitCapRate !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.exit.exitCapRate),
      },
    ],
    vizType: 'multi-bar',
    thresholdContext: {
      benchmark: 'Exit Cap Rate Spread',
      description: 'Typically modeled 25 to 50 bps wider than entry cap rate to reflect conservative expansion.',
    },
    getValue: (m) => m?.derived.exitValuation ?? Math.round((m?.scorecard.noi.value || 28000) / 0.065),
  },
  {
    number: 28,
    id: 'exit_cap_sensitivity',
    name: 'Exit Cap Rate Sensitivity',
    phase: 'Phase 4: Sensitivity & Exit Analysis',
    phaseNumber: 4,
    category: 'Asset and Portfolio Management',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Matrix modeling the sensitivity of asset valuation and investor IRR to ±25 bps to ±100 bps exit cap shifts.',
    formula: 'Valuation Matrix: Terminal NOI ÷ (Base Exit Cap Rate ± Sensitivity Step bps)',
    definitionSource: 'Standard & Poor\'s / Moody\'s CMBS Sensitivity Stress Test Methodology',
    formulaTemplate: 'Valuation & Return Matrix across ±25 bps Steps',
    resolveFormulaWithValues: () => 'Exit Cap Matrix: -50 bps, -25 bps, Base (6.5%), +25 bps, +50 bps',
    inputs: [
      {
        name: 'Sensitivity Steps (bps)',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.hurdles.exitCapSensitivityBps',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.hurdles.exitCapSensitivityBps !== undefined,
        getValue: (p) => `±${p?.underwriting?.hurdles.exitCapSensitivityBps ?? 25} bps`,
      },
    ],
    vizType: 'sensitivity-table',
    thresholdContext: {
      benchmark: 'Stress Resilience',
      description: 'Evaluates if project remains profitable under capital market cap rate widening.',
    },
    getValue: (m) => {
      const pts = m?.sensitivity?.exitCapSensitivity;
      if (pts && pts.length > 0) {
        return pts[pts.length - 1].capRatePct;
      }
      return 6.5;
    },
  },
  {
    number: 29,
    id: 'hold_period_sensitivity',
    name: 'Hold Period Sensitivity',
    phase: 'Phase 4: Sensitivity & Exit Analysis',
    phaseNumber: 4,
    category: 'Asset and Portfolio Management',
    unit: 'ratio',
    higherIsBetter: true,
    definition: 'Comparative analysis of investor IRR and equity multiples across 3, 5, 7, and 10-year holding horizons.',
    formula: 'Comparative IRR & Equity Multiple (MOIC) Model across Year 3, 5, 7, and 10 Horizons',
    definitionSource: 'Harvard Business School Real Estate Financial Modeling Case Standards',
    formulaTemplate: 'Multi-Horizon Returns: Year 3, 5, 7, 10',
    resolveFormulaWithValues: (m) => {
      const mult = m?.insights.financial.equityMultiple.value ?? 1.8;
      return `Hold Horizon MOIC = ${fmtRatio(mult)}`;
    },
    inputs: [
      {
        name: 'Base Hold Period',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.exit.holdPeriodYears',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting?.exit.holdPeriodYears),
        getValue: (p) => `${p?.underwriting?.exit.holdPeriodYears ?? 5} Years`,
      },
    ],
    vizType: 'sensitivity-table',
    thresholdContext: {
      benchmark: 'Optimal Exit Timing',
      description: 'Identifies the peak IRR window after full execution of value-add improvements.',
    },
    getValue: (m) => m?.insights.financial.equityMultiple.value ?? 1.8,
  },
  {
    number: 30,
    id: 'rent_growth_stress_test',
    name: 'Rent Growth Stress Test',
    phase: 'Phase 4: Sensitivity & Exit Analysis',
    phaseNumber: 4,
    category: 'Operational Efficiency',
    unit: 'percent',
    higherIsBetter: true,
    definition: 'Stress test modeling cash flow and debt service coverage under rent shocks of -5% to +5%.',
    formula: 'NOI & DSCR response across -5%, -2.5%, 0%, +2.5%, +5% Rent Shocks',
    definitionSource: 'Federal Reserve Comprehensive Capital Analysis and Review (CCAR) Stress Scenarios',
    formulaTemplate: 'NOI & DSCR response across -5%, -2.5%, 0%, +2.5%, +5% Rent Shocks',
    resolveFormulaWithValues: (m) => `Annual Rent Growth = ${fmtPct(m?.derived.annualRentGrowth ?? 3.0)} (Stress Band: -5% to +5%)`,
    inputs: [
      {
        name: 'Annual Rent Growth',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.exit.annualRentGrowth',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.exit.annualRentGrowth !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.exit.annualRentGrowth),
      },
    ],
    vizType: 'stress-curve',
    thresholdContext: {
      benchmark: 'Downside DSCR ≥ 1.05×',
      description: 'Project must maintain positive debt coverage even under 5% rental market contraction.',
    },
    getValue: (m) => m?.derived.annualRentGrowth ?? 3.0,
  },
  {
    number: 31,
    id: 'vacancy_rate_stress_test',
    name: 'Vacancy Rate Stress Test',
    phase: 'Phase 4: Sensitivity & Exit Analysis',
    phaseNumber: 4,
    category: 'Operational Efficiency',
    unit: 'percent',
    higherIsBetter: false,
    definition: 'Evaluation of operational resilience under severe vacancy stress levels of 5%, 10%, 15%, and 20%.',
    formula: 'NOI & Cash Flow Degradation across 5%, 10%, 15%, 20% Vacancy Levels',
    definitionSource: 'Fitch Ratings Commercial Mortgage Loan Rating Criteria',
    formulaTemplate: 'NOI & Cash Flow Degradation across 5%, 10%, 15%, 20% Vacancy',
    resolveFormulaWithValues: (m) => {
      const occ = m?.scorecard.occupancyRate.value ?? 95.0;
      return `Underwritten Occupancy = ${fmtPct(occ)} (Break-Even: ${fmtPct(m?.derived.breakEvenOccupancy ?? 70.0)})`;
    },
    inputs: [
      {
        name: 'Base Vacancy Rate',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.rentRoll.vacancyRate',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.rentRoll.vacancyRate !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.rentRoll.vacancyRate),
      },
    ],
    vizType: 'stress-curve',
    thresholdContext: {
      benchmark: 'Break-Even Buffer',
      description: 'Tests maximum physical vacancy sustainable before cash flow goes negative.',
    },
    getValue: (m) => m?.scorecard.occupancyRate.value ?? 95.0,
  },
  {
    number: 32,
    id: 'net_sales_proceeds',
    name: 'Net Sales Proceeds',
    phase: 'Phase 4: Sensitivity & Exit Analysis',
    phaseNumber: 4,
    category: 'Financial Performance',
    unit: 'currency',
    higherIsBetter: true,
    definition: 'Net cash proceeds received at asset disposition after deduction of broker fees, transaction costs, and loan payoff.',
    formula: 'Gross Exit Sale Price × (1 − Broker & Transaction Cost %) − Remaining Senior Debt Payoff',
    definitionSource: 'National Real Estate Investor / Commercial Lease & Sales Settlement Guide',
    formulaTemplate: 'Gross Exit Price − Cost of Sale (5%) − Remaining Senior Debt Balance',
    resolveFormulaWithValues: (m) => {
      const net = m?.derived.netSalesProceeds ?? 0;
      return `Net Proceeds = ${fmtMoney(net)}`;
    },
    inputs: [
      {
        name: 'Cost of Sale %',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.exit.costOfSale',
        editRoute: '/underwriting',
        isAvailable: (p) => p?.underwriting?.exit.costOfSale !== undefined,
        getValue: (p) => fmtPct(p?.underwriting?.exit.costOfSale),
      },
    ],
    vizType: 'benchmark-band',
    thresholdContext: {
      benchmark: 'Equity Wire at Exit',
      description: 'Capital distributable to equity holders upon closing of sale.',
    },
    getValue: (m) => m?.derived.netSalesProceeds ?? 0,
  },
  {
    number: 33,
    id: 'investor_profit_at_exit',
    name: 'Investor Profit at Exit',
    phase: 'Phase 4: Sensitivity & Exit Analysis',
    phaseNumber: 4,
    category: 'Financial Performance',
    unit: 'currency',
    higherIsBetter: true,
    definition: 'Total cumulative net dollar profit returned to equity partners over and above original invested principal.',
    formula: 'Cumulative Operating Distributions + Net Disposition Proceeds − Total Initial Cash Equity',
    definitionSource: 'Global Investment Performance Standards (GIPS) Real Estate Return Calculation',
    formulaTemplate: 'Cumulative Cash Distributions + Net Exit Proceeds − Initial Equity Invested',
    resolveFormulaWithValues: (m) => {
      const profit = m?.derived.investorProfitAtExit ?? 0;
      return `Net Profit = ${fmtMoney(profit)} (above returned principal)`;
    },
    inputs: [
      {
        name: 'Initial Equity',
        source: 'Project → Step 2: Underwriting Inputs',
        fieldPath: 'underwriting.acquisition.purchasePrice',
        editRoute: '/underwriting',
        isAvailable: (p) => Boolean(p?.underwriting),
        getValue: (p) => fmtMoney(p?.purchasePrice ? p.purchasePrice * 0.25 : 85000),
      },
    ],
    vizType: 'gauge',
    thresholdContext: {
      benchmark: '> $0.00 Net Profit',
      description: 'Measures absolute dollar gain delivered across the investment lifecycle.',
      targetPass: (v) => (v ?? 0) > 0,
    },
    getValue: (m) => m?.derived.investorProfitAtExit ?? 0,
  },
];

export function getKpiById(id: string): KpiDefinition | undefined {
  return AUTHORITATIVE_33_KPIS.find((k) => k.id === id);
}

export function getKpisByPhase(phaseNumber: KpiPhaseNumber): KpiDefinition[] {
  return AUTHORITATIVE_33_KPIS.filter((k) => k.phaseNumber === phaseNumber);
}

export const PHASE_HEADERS: Record<KpiPhaseNumber, { title: string; count: number; description: string }> = {
  1: {
    title: 'Phase 1: Deal Intake & Quick Screen',
    count: 8,
    description: 'Initial intake baseline, cost basis, valuation target, and quick screening cap rates.',
  },
  2: {
    title: 'Phase 2: Full Underwriting & Return Modeling',
    count: 10,
    description: 'Internal rate of return, equity multiples, cash yields, debt coverage, and break-even metrics.',
  },
  3: {
    title: 'Phase 3: Debt Sizing & Capital Stack',
    count: 8,
    description: 'Senior debt sizing constraints, LTC/LTV ratios, amortization, and equity waterfall structure.',
  },
  4: {
    title: 'Phase 4: Sensitivity & Exit Analysis',
    count: 7,
    description: 'Valuation stress testing, exit cap rate sensitivity, rent shocks, and net disposition proceeds.',
  },
};

export const KPI_CATEGORIES: KpiCategory[] = [
  'Financial Performance',
  'Operational Efficiency',
  'Asset and Portfolio Management',
  'Risk Management and Compliance Metrics',
];

export const KPI_CATEGORY_METADATA: Record<
  KpiCategory,
  { name: KpiCategory; title: string; count: number; description: string; id: string }
> = {
  'Financial Performance': {
    id: 'financial-performance',
    name: 'Financial Performance',
    title: 'Financial Performance',
    count: 12,
    description:
      'Core profitability, yield, cash flow, and return multiples across the holding period.',
  },
  'Operational Efficiency': {
    id: 'operational-efficiency',
    name: 'Operational Efficiency',
    title: 'Operational Efficiency',
    count: 4,
    description: 'Revenue capture, expense control, and operational breakeven dynamics.',
  },
  'Asset and Portfolio Management': {
    id: 'asset-portfolio-management',
    name: 'Asset and Portfolio Management',
    title: 'Asset and Portfolio Management',
    count: 8,
    description: 'Cost basis, valuation, scale, diversification, and hold-period execution.',
  },
  'Risk Management and Compliance Metrics': {
    id: 'risk-management-compliance',
    name: 'Risk Management and Compliance Metrics',
    title: 'Risk Management and Compliance Metrics',
    count: 9,
    description: 'Solvency, debt coverage, leverage exposure, and regulatory guardrails.',
  },
};

export function getKpisByCategory(category: KpiCategory): KpiDefinition[] {
  return AUTHORITATIVE_33_KPIS.filter((k) => k.category === category);
}

