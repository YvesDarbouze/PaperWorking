/**
 * Financial Statement Engine (@paperworking/financial-engine)
 *
 * Generates chronological, period-ordered financial statements for commercial real estate:
 * 1. Profit & Loss Statement (P&L / Income Statement)
 * 2. Balance Sheet (Assets, Liabilities, Security Deposits, Net Equity)
 * 3. Cash Flow Statement (Operations, Financing, Investing)
 *
 * Supports Monthly (M1..M12), Quarterly (Q1..Q4), and Annual (Y1..YN) granularities.
 * Uses computeAmortizationSchedule() for exact month-by-month debt service P&I splits.
 * Integrates straight-line MACRS depreciation.
 */

import { computeAmortizationSchedule } from './amortization-engine.js';
import {
  computeAssetDepreciationSchedule,
  type DepreciableAsset,
} from './depreciation-engine.js';

export type StatementGranularity = 'monthly' | 'quarterly' | 'annual';
export type StatementType = 'PL' | 'BALANCE_SHEET' | 'CASH_FLOW';

export interface StatementColumn {
  key: string;
  label: string;
  sublabel?: string;
  isTotal?: boolean;
}

export interface StatementRow {
  id: string;
  label: string;
  isHeader?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  indent?: number; // 0 = root, 1 = category item, 2 = sub-item
  values: Record<string, number | null>;
  total: number | null;
  status?: 'normal' | 'insufficient_inputs';
  format?: 'currency' | 'percent' | 'number';
}

export interface FinancialStatementMatrix {
  statementType: StatementType;
  granularity: StatementGranularity;
  fiscalYear: number;
  columns: StatementColumn[];
  rows: StatementRow[];
  totalsSummary: {
    grossRevenue: number;
    totalOpEx: number;
    noi: number;
    debtService: number;
    cashFlowBeforeTax: number;
    taxableIncome: number;
  };
}

export interface ProjectStatementInputs {
  projectId: string;
  projectName?: string;
  purchasePrice?: number | null;
  propertyValue?: number | null;
  grossScheduledRentAnnual?: number | null;
  vacancyRatePct?: number | null;
  otherIncomeAnnual?: number | null;
  expenses?: {
    tax?: number;
    insurance?: number;
    maintenance?: number;
    management?: number;
    utilities?: number;
    security?: number;
    HOA?: number;
    capex?: number;
    other?: number;
    operatingExpenseRatio?: number;
  };
  debt?: {
    loanAmount?: number | null;
    interestRate?: number | null;
    termYears?: number | null;
    balloonTermYears?: number | null;
    ioPeriodMonths?: number | null;
  };
  depreciation?: {
    landValue?: number | null;
    improvementBasis?: number | null;
    inServiceDate?: string | Date;
    assetClass?: 'residential_27_5' | 'commercial_39';
  };
  tenantSecurityDeposits?: number | null;
  holdPeriodYears?: number;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Builds standard columns for the chosen granularity and fiscal year.
 */
export function buildStatementColumns(
  granularity: StatementGranularity,
  fiscalYear: number = 2026,
  holdYears: number = 5,
): StatementColumn[] {
  const columns: StatementColumn[] = [];

  if (granularity === 'monthly') {
    for (let i = 0; i < 12; i++) {
      columns.push({
        key: `m${i + 1}`,
        label: MONTH_NAMES[i],
        sublabel: String(fiscalYear),
      });
    }
    columns.push({
      key: 'total',
      label: 'FY Total',
      sublabel: String(fiscalYear),
      isTotal: true,
    });
  } else if (granularity === 'quarterly') {
    for (let q = 1; q <= 4; q++) {
      columns.push({
        key: `q${q}`,
        label: `Q${q}`,
        sublabel: String(fiscalYear),
      });
    }
    columns.push({
      key: 'total',
      label: 'FY Total',
      sublabel: String(fiscalYear),
      isTotal: true,
    });
  } else {
    // Annual
    for (let y = 1; y <= holdYears; y++) {
      const yearNum = fiscalYear + (y - 1);
      columns.push({
        key: `yr${y}`,
        label: `Year ${y}`,
        sublabel: String(yearNum),
      });
    }
    columns.push({
      key: 'total',
      label: `${holdYears}-Yr Total`,
      sublabel: `${fiscalYear}–${fiscalYear + holdYears - 1}`,
      isTotal: true,
    });
  }

  return columns;
}

/**
 * Derives a project's chronological financial statement matrix (P&L, Balance Sheet, or Cash Flow).
 */
export function deriveProjectStatementMatrix(
  inputs: ProjectStatementInputs,
  options: {
    statementType?: StatementType;
    granularity?: StatementGranularity;
    fiscalYear?: number;
    holdYears?: number;
  } = {},
): FinancialStatementMatrix {
  const statementType = options.statementType ?? 'PL';
  const granularity = options.granularity ?? 'monthly';
  const fiscalYear = options.fiscalYear ?? 2026;
  const holdYears = options.holdYears ?? 5;

  const columns = buildStatementColumns(granularity, fiscalYear, holdYears);

  // 1. Resolve Amortization Schedule (Exact Month-by-Month Debt Service)
  const loanAmount = inputs.debt?.loanAmount ?? 0;
  const rawRate = inputs.debt?.interestRate ?? 0;
  const annualRate = rawRate > 1 ? rawRate / 100 : rawRate;
  const termYears = inputs.debt?.termYears ?? 30;

  const amortSchedule =
    loanAmount > 0 && annualRate > 0 && termYears > 0
      ? computeAmortizationSchedule(
          loanAmount,
          annualRate,
          termYears,
          new Date(`${fiscalYear}-01-01`),
        )
      : null;

  // 2. Resolve Base Operational Line Items (Monthly Base)
  const annualGSR = inputs.grossScheduledRentAnnual ?? 0;
  const monthlyGSR = Number((annualGSR / 12).toFixed(2));
  const vacancyPct = inputs.vacancyRatePct ?? 0;
  const monthlyVacancy = Number((monthlyGSR * (vacancyPct / 100)).toFixed(2));
  const annualVacancy = Number((annualGSR * (vacancyPct / 100)).toFixed(2));

  const annualOther = inputs.otherIncomeAnnual ?? 0;
  const monthlyOther = Number((annualOther / 12).toFixed(2));

  // OpEx Breakdown
  const exp = inputs.expenses ?? {};
  const hasOER = exp.operatingExpenseRatio !== undefined && exp.operatingExpenseRatio > 0;
  let annualOpExTotal = 0;
  let itemizedOpEx: Record<string, number> = {};

  if (hasOER) {
    annualOpExTotal = Number((annualGSR * (exp.operatingExpenseRatio! / 100)).toFixed(2));
    itemizedOpEx = {
      tax: Number((annualOpExTotal * 0.35).toFixed(2)),
      insurance: Number((annualOpExTotal * 0.15).toFixed(2)),
      maintenance: Number((annualOpExTotal * 0.20).toFixed(2)),
      management: Number((annualOpExTotal * 0.15).toFixed(2)),
      utilities: Number((annualOpExTotal * 0.10).toFixed(2)),
      other: Number((annualOpExTotal * 0.05).toFixed(2)),
    };
  } else {
    itemizedOpEx = {
      tax: exp.tax ?? 0,
      insurance: exp.insurance ?? 0,
      maintenance: exp.maintenance ?? 0,
      management: exp.management ?? 0,
      utilities: exp.utilities ?? 0,
      other: (exp.security ?? 0) + (exp.HOA ?? 0) + (exp.other ?? 0),
    };
    annualOpExTotal = Object.values(itemizedOpEx).reduce((a, b) => a + b, 0);
  }

  // 3. Resolve Depreciation
  let annualDepreciation = 0;
  let year1Depreciation = 0;
  let isDepreciationValid = false;

  if (inputs.depreciation) {
    const basis = inputs.purchasePrice || inputs.propertyValue || 0;
    const depAsset: DepreciableAsset = {
      id: `${inputs.projectId}-dep-bldg`,
      name: 'Building',
      assetClass: inputs.depreciation.assetClass ?? 'residential_27_5',
      totalCostBasis: basis,
      landValue: inputs.depreciation.landValue,
      improvementBasis: inputs.depreciation.improvementBasis,
      inServiceDate: inputs.depreciation.inServiceDate ?? `${fiscalYear}-01-01`,
    };
    const depRes = computeAssetDepreciationSchedule(depAsset, holdYears, fiscalYear);
    if (depRes.valid && depRes.schedule) {
      isDepreciationValid = true;
      annualDepreciation = depRes.schedule.annualStraightLineFullYear;
      year1Depreciation = depRes.schedule.schedule[0]?.annualDepreciation ?? annualDepreciation;
    }
  }

  // Helper to slice and aggregate values across monthly/quarterly/annual
  const getPeriodValues = (
    monthlyValues: number[],
    mode: 'sum' | 'last',
  ): { values: Record<string, number>; total: number } => {
    const result: Record<string, number> = {};
    let total = 0;

    if (granularity === 'monthly') {
      for (let m = 0; m < 12; m++) {
        const val = monthlyValues[m] ?? 0;
        result[`m${m + 1}`] = Number(val.toFixed(2));
      }
      total = mode === 'sum'
        ? Number(monthlyValues.slice(0, 12).reduce((a, b) => a + b, 0).toFixed(2))
        : Number((monthlyValues[11] ?? 0).toFixed(2));
    } else if (granularity === 'quarterly') {
      for (let q = 0; q < 4; q++) {
        const slice = monthlyValues.slice(q * 3, (q + 1) * 3);
        const val = mode === 'sum'
          ? slice.reduce((a, b) => a + b, 0)
          : (slice[slice.length - 1] ?? 0);
        result[`q${q + 1}`] = Number(val.toFixed(2));
      }
      total = mode === 'sum'
        ? Number(monthlyValues.slice(0, 12).reduce((a, b) => a + b, 0).toFixed(2))
        : Number((monthlyValues[11] ?? 0).toFixed(2));
    } else {
      // Annual
      for (let y = 0; y < holdYears; y++) {
        const slice = monthlyValues.slice(y * 12, (y + 1) * 12);
        const val = mode === 'sum'
          ? slice.reduce((a, b) => a + b, 0)
          : (slice[slice.length - 1] ?? 0);
        result[`yr${y + 1}`] = Number(val.toFixed(2));
      }
      total = mode === 'sum'
        ? Number(monthlyValues.slice(0, holdYears * 12).reduce((a, b) => a + b, 0).toFixed(2))
        : Number((monthlyValues[holdYears * 12 - 1] ?? 0).toFixed(2));
    }

    return { values: result, total };
  };

  // Distribute annual amounts across months ensuring exact cent reconciliation per year
  const distributeAnnualToMonths = (annualAmount: number): number[] => {
    const arr: number[] = [];
    const baseMonthly = Math.round((annualAmount / 12) * 100) / 100;
    for (let y = 0; y < holdYears; y++) {
      let yearSum = 0;
      for (let m = 0; m < 11; m++) {
        arr.push(baseMonthly);
        yearSum = Number((yearSum + baseMonthly).toFixed(2));
      }
      const m12 = Number((annualAmount - yearSum).toFixed(2));
      arr.push(m12);
    }
    return arr;
  };

  const monthsCount = holdYears * 12;
  const gsrMonths = distributeAnnualToMonths(annualGSR);
  const vacancyMonths = distributeAnnualToMonths(annualVacancy);
  const otherIncomeMonths = distributeAnnualToMonths(annualOther);

  const opexTaxMonths = distributeAnnualToMonths(itemizedOpEx.tax);
  const opexInsMonths = distributeAnnualToMonths(itemizedOpEx.insurance);
  const opexMaintMonths = distributeAnnualToMonths(itemizedOpEx.maintenance);
  const opexMgmtMonths = distributeAnnualToMonths(itemizedOpEx.management);
  const opexUtilMonths = distributeAnnualToMonths(itemizedOpEx.utilities);
  const opexOtherMonths = distributeAnnualToMonths(itemizedOpEx.other);

  const interestMonths: number[] = [];
  const principalMonths: number[] = [];
  const balanceMonths: number[] = [];

  for (let i = 0; i < monthsCount; i++) {
    const pmt = amortSchedule?.schedule[i];
    interestMonths.push(pmt?.interest ?? 0);
    principalMonths.push(pmt?.principal ?? 0);
    balanceMonths.push(pmt?.balance ?? (loanAmount > 0 ? loanAmount : 0));
  }

  const depMonths: number[] = [];
  for (let i = 0; i < monthsCount; i++) {
    const yearIdx = Math.floor(i / 12);
    const depForYear = yearIdx === 0 ? year1Depreciation : annualDepreciation;
    depMonths.push(Number((depForYear / 12).toFixed(2)));
  }

  // Precompute calculated streams
  const goiMonths = gsrMonths.map((g, i) => g - vacancyMonths[i] + otherIncomeMonths[i]);
  const totalOpExMonths = opexTaxMonths.map((t, i) =>
    t + opexInsMonths[i] + opexMaintMonths[i] + opexMgmtMonths[i] + opexUtilMonths[i] + opexOtherMonths[i]
  );
  const noiMonths = goiMonths.map((goi, i) => goi - totalOpExMonths[i]);
  const cfbtMonths = noiMonths.map((noi, i) => noi - (interestMonths[i] + principalMonths[i]));
  const taxableIncomeMonths = noiMonths.map((noi, i) => noi - interestMonths[i] - depMonths[i]);

  // Assemble Rows based on StatementType
  const rows: StatementRow[] = [];

  if (statementType === 'PL') {
    const gsrData = getPeriodValues(gsrMonths, 'sum');
    const vacData = getPeriodValues(vacancyMonths.map((v) => -Math.abs(v)), 'sum');
    const otherData = getPeriodValues(otherIncomeMonths, 'sum');
    const goiData = getPeriodValues(goiMonths, 'sum');

    const taxData = getPeriodValues(opexTaxMonths, 'sum');
    const insData = getPeriodValues(opexInsMonths, 'sum');
    const maintData = getPeriodValues(opexMaintMonths, 'sum');
    const mgmtData = getPeriodValues(opexMgmtMonths, 'sum');
    const utilData = getPeriodValues(opexUtilMonths, 'sum');
    const opexOtherData = getPeriodValues(opexOtherMonths, 'sum');
    const totalOpExData = getPeriodValues(totalOpExMonths, 'sum');

    const noiData = getPeriodValues(noiMonths, 'sum');
    const intData = getPeriodValues(interestMonths.map((x) => -Math.abs(x)), 'sum');
    const prinData = getPeriodValues(principalMonths.map((x) => -Math.abs(x)), 'sum');
    const cfbtData = getPeriodValues(cfbtMonths, 'sum');

    const depData = getPeriodValues(depMonths.map((x) => -Math.abs(x)), 'sum');
    const taxableData = getPeriodValues(taxableIncomeMonths, 'sum');

    rows.push({
      id: 'gsr',
      label: 'Gross Scheduled Rent (GSR)',
      indent: 0,
      values: gsrData.values,
      total: gsrData.total,
    });
    rows.push({
      id: 'vacancy',
      label: '(−) Vacancy & Credit Loss',
      indent: 1,
      values: vacData.values,
      total: vacData.total,
    });
    rows.push({
      id: 'other_income',
      label: '(+) Other Operating Income',
      indent: 1,
      values: otherData.values,
      total: otherData.total,
    });
    rows.push({
      id: 'goi',
      label: 'Gross Operating Income (GOI)',
      isSubtotal: true,
      indent: 0,
      values: goiData.values,
      total: goiData.total,
    });

    // OpEx Header & Items
    rows.push({
      id: 'opex_header',
      label: 'Operating Expenses',
      isHeader: true,
      indent: 0,
      values: {},
      total: null,
    });
    rows.push({
      id: 'opex_taxes',
      label: 'Property Taxes',
      indent: 1,
      values: taxData.values,
      total: taxData.total,
    });
    rows.push({
      id: 'opex_insurance',
      label: 'Insurance',
      indent: 1,
      values: insData.values,
      total: insData.total,
    });
    rows.push({
      id: 'opex_maintenance',
      label: 'Repairs & Maintenance',
      indent: 1,
      values: maintData.values,
      total: maintData.total,
    });
    rows.push({
      id: 'opex_management',
      label: 'Property Management',
      indent: 1,
      values: mgmtData.values,
      total: mgmtData.total,
    });
    rows.push({
      id: 'opex_utilities',
      label: 'Utilities',
      indent: 1,
      values: utilData.values,
      total: utilData.total,
    });
    rows.push({
      id: 'opex_other',
      label: 'Other OpEx (HOA, Security)',
      indent: 1,
      values: opexOtherData.values,
      total: opexOtherData.total,
    });
    rows.push({
      id: 'total_opex',
      label: 'Total Operating Expenses',
      isSubtotal: true,
      indent: 0,
      values: totalOpExData.values,
      total: totalOpExData.total,
    });

    // NOI
    rows.push({
      id: 'noi',
      label: 'Net Operating Income (NOI)',
      isSubtotal: true,
      indent: 0,
      values: noiData.values,
      total: noiData.total,
    });

    // Debt service
    rows.push({
      id: 'debt_interest',
      label: '(−) Mortgage Interest Expense',
      indent: 1,
      values: intData.values,
      total: intData.total,
    });
    rows.push({
      id: 'debt_principal',
      label: '(−) Mortgage Principal Paydown',
      indent: 1,
      values: prinData.values,
      total: prinData.total,
    });
    rows.push({
      id: 'cfbt',
      label: 'Cash Flow Before Tax (CFBT)',
      isTotal: true,
      indent: 0,
      values: cfbtData.values,
      total: cfbtData.total,
    });

    // Tax View Memo Rows
    rows.push({
      id: 'tax_header',
      label: 'Tax Reporting Adjustments (Memo)',
      isHeader: true,
      indent: 0,
      values: {},
      total: null,
    });
    rows.push({
      id: 'depreciation_deduction',
      label: '(−) Tax Depreciation (MACRS)',
      indent: 1,
      values: isDepreciationValid ? depData.values : {},
      total: isDepreciationValid ? depData.total : null,
      status: isDepreciationValid ? 'normal' : 'insufficient_inputs',
    });
    rows.push({
      id: 'taxable_income',
      label: 'Estimated Taxable Income (Loss)',
      isSubtotal: true,
      indent: 0,
      values: isDepreciationValid ? taxableData.values : {},
      total: isDepreciationValid ? taxableData.total : null,
      status: isDepreciationValid ? 'normal' : 'insufficient_inputs',
    });
  } else if (statementType === 'BALANCE_SHEET') {
    const propVal = inputs.propertyValue ?? inputs.purchasePrice ?? 0;
    const propValMonths = Array(monthsCount).fill(propVal);
    // Security deposits: use explicit input only. When absent, show $0 — never infer
    // a liability from GSR (violates no-silent-substitution convention).
    const securityDepositsProvided = inputs.tenantSecurityDeposits != null && inputs.tenantSecurityDeposits > 0;
    const securityDeposits = securityDepositsProvided ? inputs.tenantSecurityDeposits! : 0;
    const secDepMonths = Array(monthsCount).fill(securityDeposits);

    let accum = 0;
    const accumDepMonths: number[] = [];
    for (let i = 0; i < monthsCount; i++) {
      accum += depMonths[i];
      accumDepMonths.push(Number(accum.toFixed(2)));
    }

    const netBookValueMonths = propValMonths.map((p, i) => Math.max(0, p - (isDepreciationValid ? accumDepMonths[i] : 0)));
    const totalLiabMonths = balanceMonths.map((bal, i) => bal + secDepMonths[i]);
    const netEquityMonths = netBookValueMonths.map((val, i) => val - totalLiabMonths[i]);

    const assetData = getPeriodValues(propValMonths, 'last');
    const accumData = getPeriodValues(accumDepMonths.map((x) => -Math.abs(x)), 'last');
    const netBookData = getPeriodValues(netBookValueMonths, 'last');
    const mortgageData = getPeriodValues(balanceMonths, 'last');
    const secDepData = getPeriodValues(secDepMonths, 'last');
    const totalLiabData = getPeriodValues(totalLiabMonths, 'last');
    const equityData = getPeriodValues(netEquityMonths, 'last');

    rows.push({
      id: 'bs_assets_hdr',
      label: 'Real Estate Assets',
      isHeader: true,
      indent: 0,
      values: {},
      total: null,
    });
    rows.push({
      id: 'property_asset_val',
      label: 'Property Fair Market / Cost Basis',
      indent: 1,
      values: assetData.values,
      total: assetData.total,
    });
    rows.push({
      id: 'accum_depreciation',
      label: 'Less: Accumulated Depreciation',
      indent: 1,
      values: isDepreciationValid ? accumData.values : {},
      total: isDepreciationValid ? accumData.total : null,
      status: isDepreciationValid ? 'normal' : 'insufficient_inputs',
    });
    rows.push({
      id: 'net_book_val',
      label: 'Net Real Estate Book Value',
      isSubtotal: true,
      indent: 0,
      values: netBookData.values,
      total: netBookData.total,
    });

    rows.push({
      id: 'bs_liab_hdr',
      label: 'Liabilities & Obligations',
      isHeader: true,
      indent: 0,
      values: {},
      total: null,
    });
    rows.push({
      id: 'mortgage_debt_balance',
      label: 'Mortgage Principal Debt Balance',
      indent: 1,
      values: mortgageData.values,
      total: mortgageData.total,
    });
    rows.push({
      id: 'tenant_security_deposits',
      label: securityDepositsProvided
        ? 'Tenant Security Deposits Held (Liability)'
        : 'Tenant Security Deposits Held (Liability) — no security deposit input provided',
      indent: 1,
      values: secDepData.values,
      total: secDepData.total,
    });
    rows.push({
      id: 'total_liabilities',
      label: 'Total Liabilities',
      isSubtotal: true,
      indent: 0,
      values: totalLiabData.values,
      total: totalLiabData.total,
    });

    rows.push({
      id: 'net_owner_equity',
      label: 'Net Owner Equity (Assets − Liabilities)',
      isTotal: true,
      indent: 0,
      values: equityData.values,
      total: equityData.total,
    });
  } else if (statementType === 'CASH_FLOW') {
    const noiData = getPeriodValues(noiMonths, 'sum');
    const intData = getPeriodValues(interestMonths.map((x) => -Math.abs(x)), 'sum');
    const prinData = getPeriodValues(principalMonths.map((x) => -Math.abs(x)), 'sum');
    const debtServiceTotalMonths = interestMonths.map((int, i) => -(int + principalMonths[i]));
    const debtServiceTotalData = getPeriodValues(debtServiceTotalMonths, 'sum');

    const capexReserveAnnual = exp.capex ?? 0;
    const capexMonthly = Number((capexReserveAnnual / 12).toFixed(2));
    const capexMonths = Array(monthsCount).fill(-Math.abs(capexMonthly));
    const capexData = getPeriodValues(capexMonths, 'sum');

    const netDistributableMonths = noiMonths.map((noi, i) => noi + debtServiceTotalMonths[i] + capexMonths[i]);
    const netDistributableData = getPeriodValues(netDistributableMonths, 'sum');

    rows.push({
      id: 'cf_ops_hdr',
      label: 'Cash Flow from Operating Activities',
      isHeader: true,
      indent: 0,
      values: {},
      total: null,
    });
    rows.push({
      id: 'cf_noi',
      label: 'Net Operating Income (NOI)',
      indent: 1,
      values: noiData.values,
      total: noiData.total,
    });

    rows.push({
      id: 'cf_fin_hdr',
      label: 'Cash Flow from Financing Activities',
      isHeader: true,
      indent: 0,
      values: {},
      total: null,
    });
    rows.push({
      id: 'cf_interest',
      label: '(−) Mortgage Interest Paid',
      indent: 1,
      values: intData.values,
      total: intData.total,
    });
    rows.push({
      id: 'cf_principal',
      label: '(−) Mortgage Principal Paid',
      indent: 1,
      values: prinData.values,
      total: prinData.total,
    });
    rows.push({
      id: 'cf_debt_service_total',
      label: 'Total Debt Service Outflow',
      isSubtotal: true,
      indent: 1,
      values: debtServiceTotalData.values,
      total: debtServiceTotalData.total,
    });

    rows.push({
      id: 'cf_inv_hdr',
      label: 'Cash Flow from Investing Activities',
      isHeader: true,
      indent: 0,
      values: {},
      total: null,
    });
    rows.push({
      id: 'cf_capex',
      label: '(−) CapEx / Capital Improvements Reserve',
      indent: 1,
      values: capexData.values,
      total: capexData.total,
    });

    rows.push({
      id: 'cf_net_distributable',
      label: 'Net Distributable Cash Flow',
      isTotal: true,
      indent: 0,
      values: netDistributableData.values,
      total: netDistributableData.total,
    });
  }

  // Summary Totals
  const noiYr1 = noiMonths.slice(0, 12).reduce((a, b) => a + b, 0);
  const goiYr1 = goiMonths.slice(0, 12).reduce((a, b) => a + b, 0);
  const opexYr1 = totalOpExMonths.slice(0, 12).reduce((a, b) => a + b, 0);
  const intYr1 = interestMonths.slice(0, 12).reduce((a, b) => a + b, 0);
  const prinYr1 = principalMonths.slice(0, 12).reduce((a, b) => a + b, 0);
  const dsYr1 = intYr1 + prinYr1;
  const cfbtYr1 = noiYr1 - dsYr1;
  const taxYr1 = isDepreciationValid ? taxableIncomeMonths.slice(0, 12).reduce((a, b) => a + b, 0) : 0;

  return {
    statementType,
    granularity,
    fiscalYear,
    columns,
    rows,
    totalsSummary: {
      grossRevenue: Number(goiYr1.toFixed(2)),
      totalOpEx: Number(opexYr1.toFixed(2)),
      noi: Number(noiYr1.toFixed(2)),
      debtService: Number(dsYr1.toFixed(2)),
      cashFlowBeforeTax: Number(cfbtYr1.toFixed(2)),
      taxableIncome: Number(taxYr1.toFixed(2)),
    },
  };
}

/**
 * Aggregates multiple project statement matrices into a single Portfolio Aggregate matrix.
 */
export function aggregateStatementMatrices(
  matrices: FinancialStatementMatrix[],
): FinancialStatementMatrix | null {
  if (matrices.length === 0) return null;
  const base = matrices[0];
  if (matrices.length === 1) return base;

  const aggregatedRows: StatementRow[] = base.rows.map((r) => ({
    ...r,
    values: { ...r.values },
    total: r.total !== null ? 0 : null,
  }));

  // Reset aggregated row values to zero for numeric lines
  for (const row of aggregatedRows) {
    if (!row.isHeader) {
      for (const colKey of Object.keys(row.values)) {
        row.values[colKey] = 0;
      }
      if (row.total !== null) {
        row.total = 0;
      }
    }
  }

  for (const m of matrices) {
    for (let i = 0; i < aggregatedRows.length; i++) {
      const aggRow = aggregatedRows[i];
      const projectRow = m.rows[i];
      if (projectRow && !projectRow.isHeader) {
        for (const [colKey, val] of Object.entries(projectRow.values)) {
          if (val !== null && typeof val === 'number') {
            aggRow.values[colKey] = Number(((aggRow.values[colKey] ?? 0) + val).toFixed(2));
          }
        }
        if (projectRow.total !== null && typeof projectRow.total === 'number') {
          aggRow.total = Number(((aggRow.total ?? 0) + projectRow.total).toFixed(2));
        }
      }
    }
  }

  const totalsSummary = matrices.reduce(
    (acc, m) => ({
      grossRevenue: Number((acc.grossRevenue + m.totalsSummary.grossRevenue).toFixed(2)),
      totalOpEx: Number((acc.totalOpEx + m.totalsSummary.totalOpEx).toFixed(2)),
      noi: Number((acc.noi + m.totalsSummary.noi).toFixed(2)),
      debtService: Number((acc.debtService + m.totalsSummary.debtService).toFixed(2)),
      cashFlowBeforeTax: Number((acc.cashFlowBeforeTax + m.totalsSummary.cashFlowBeforeTax).toFixed(2)),
      taxableIncome: Number((acc.taxableIncome + m.totalsSummary.taxableIncome).toFixed(2)),
    }),
    {
      grossRevenue: 0,
      totalOpEx: 0,
      noi: 0,
      debtService: 0,
      cashFlowBeforeTax: 0,
      taxableIncome: 0,
    },
  );

  return {
    statementType: base.statementType,
    granularity: base.granularity,
    fiscalYear: base.fiscalYear,
    columns: base.columns,
    rows: aggregatedRows,
    totalsSummary,
  };
}
