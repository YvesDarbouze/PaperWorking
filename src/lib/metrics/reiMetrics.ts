/**
 * REI Metrics Calculation Engine
 * All formulas follow CCIM / NARPM / standard real estate investment conventions.
 * Values: dollars (not cents), percentages as 0–100 (not 0–1).
 */

import type { ProjectFinancials } from '@/types/schema';

// ── Input/Output Types ────────────────────────────────────────────────────────

export interface NOIComponents {
  grossRentalIncome: number;      // Annual
  otherIncome: number;            // Annual
  vacancyLoss: number;            // Annual (negative impact)
  propertyTaxes: number;          // Annual (expense)
  insurance: number;              // Annual (expense)
  utilities: number;              // Annual (expense)
  propertyManagement: number;     // Annual (expense)
  maintenance: number;            // Annual (expense)
  hoa: number;                    // Annual (expense)
  totalOperatingExpenses: number; // Sum of all expense lines
  noi: number;                    // Final NOI
}

export interface DerivedMetrics {
  // Core metrics
  noi: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  capRate: number;                // Percentage (0–100)
  cashOnCashReturn: number;       // Percentage (0–100)
  dscr: number;                   // Ratio
  ltv: number;                    // Percentage (0–100)
  oer: number;                    // Percentage (0–100) Operating Expense Ratio

  // Supplemental
  arvSpread: number;              // ARV - All-In Cost
  arvSpreadPercent: number;       // (ARV - All-In) / ARV * 100
  annualDebtService: number;
  totalCashInvested: number;
  breakEvenOccupancyRate: number; // % occupancy needed to cover all expenses

  // Operational
  occupancyRate: number;          // Percentage (0–100)
  vacancyRate: number;            // Percentage (0–100)
  noiComponents: NOIComponents;

  // Phase-specific
  isViable: boolean;              // DSCR >= 1.0 and CoC > 0
  healthScore: 'excellent' | 'good' | 'fair' | 'poor';
}

// ── Core Formula Functions ────────────────────────────────────────────────────

/**
 * Standard amortizing loan annual debt service.
 * M = P[r(1+r)^n] / [(1+r)^n - 1]  ×  12
 * Returns 0 if any input is non-positive or interest rate is 0.
 */
export function computeAnnualDebtService(
  loanAmount: number,
  annualInterestRatePercent: number,
  loanTermMonths: number
): number {
  if (loanAmount <= 0 || loanTermMonths <= 0) return 0;

  // Interest-free loan: simple principal division
  if (annualInterestRatePercent <= 0) {
    return Math.round((loanAmount / loanTermMonths) * 12 * 100) / 100;
  }

  const r = annualInterestRatePercent / 100 / 12; // monthly rate
  const n = loanTermMonths;
  const pow = Math.pow(1 + r, n);
  const monthlyPayment = loanAmount * (r * pow) / (pow - 1);

  return Math.round(monthlyPayment * 12 * 100) / 100;
}

/**
 * Breaks NOI down into its component income and expense lines.
 * All returned values are annual figures in dollars.
 *
 * NOI = (GrossRentalIncome + OtherIncome) − VacancyLoss − OperatingExpenses
 * VacancyLoss = GrossRentalIncome × (vacancyRatePercent / 100)
 * PropertyMgmt = GrossRentalIncome × (propertyManagementFeePercent / 100)
 */
export function computeNOIComponents(financials: ProjectFinancials): NOIComponents {
  // Income (annualised from monthly inputs)
  const monthlyGrossRent = financials.monthlyGrossRent ?? financials.projectedMonthlyRent ?? 0;
  const grossRentalIncome = monthlyGrossRent * 12;

  const otherMonthlyIncome =
    financials.otherMonthlyIncome ??
    (financials.grossIncomeParking ?? 0) +
    (financials.grossIncomeLaundry ?? 0);
  const otherIncome = otherMonthlyIncome * 12;

  // Vacancy
  const vacancyPct = financials.vacancyRatePercent ?? financials.vacancyRate ?? 7;
  const vacancyLoss = grossRentalIncome * (vacancyPct / 100);

  // Operating expenses (annual)
  const propertyTaxes = (financials.holdingCostTaxes ?? financials.operatingExpenseTaxes ?? 0) * 12;
  const insurance = (financials.holdingCostInsurance ?? financials.operatingExpenseInsurance ?? 0) * 12;
  const utilities = (financials.holdingCostUtilities ?? 0) * 12;

  // Property management: prefer fee percent, then fixed monthly amount
  let propertyManagement: number;
  if (financials.propertyManagementFeePercent != null) {
    propertyManagement = grossRentalIncome * (financials.propertyManagementFeePercent / 100);
  } else {
    propertyManagement = (financials.propertyManagementFee ?? 0) * 12;
  }

  const maintenance = (financials.monthlyMaintenanceReserve ?? financials.maintenanceReserves ?? 0) * 12;
  const hoa = (financials.monthlyHOA ?? 0) * 12;

  const totalOperatingExpenses =
    propertyTaxes + insurance + utilities + propertyManagement + maintenance + hoa;

  const noi =
    grossRentalIncome + otherIncome - vacancyLoss - totalOperatingExpenses;

  return {
    grossRentalIncome,
    otherIncome,
    vacancyLoss,
    propertyTaxes,
    insurance,
    utilities,
    propertyManagement,
    maintenance,
    hoa,
    totalOperatingExpenses,
    noi,
  };
}

/**
 * Returns the scalar NOI value from a ProjectFinancials object.
 * Prefers a pre-computed `netOperatingIncome` when present; otherwise derives it.
 */
export function computeNOI(financials: ProjectFinancials): number {
  if (financials.netOperatingIncome != null) return financials.netOperatingIncome;
  return computeNOIComponents(financials).noi;
}

/**
 * Annual and monthly cash flow after debt service.
 */
export function computeCashFlow(
  noi: number,
  annualDebtService: number
): { annual: number; monthly: number } {
  const annual = noi - annualDebtService;
  const monthly = Math.round((annual / 12) * 100) / 100;
  return { annual, monthly };
}

/**
 * Capitalisation rate: NOI / PropertyValue × 100
 * Returns 0 if propertyValue is zero.
 */
export function computeCapRate(noi: number, propertyValue: number): number {
  if (propertyValue === 0) return 0;
  return Math.round((noi / propertyValue) * 100 * 100) / 100;
}

/**
 * Cash-on-Cash return: AnnualCashFlow / TotalCashInvested × 100
 * Returns 0 if totalCashInvested is zero.
 */
export function computeCoCReturn(annualCashFlow: number, totalCashInvested: number): number {
  if (totalCashInvested === 0) return 0;
  return Math.round((annualCashFlow / totalCashInvested) * 100 * 100) / 100;
}

/**
 * Debt Service Coverage Ratio: NOI / AnnualDebtService
 * Returns Infinity when there is no debt (annualDebtService === 0 but NOI > 0).
 * Returns 0 when both are zero.
 */
export function computeDSCR(noi: number, annualDebtService: number): number {
  if (annualDebtService === 0) return noi > 0 ? Infinity : 0;
  return Math.round((noi / annualDebtService) * 1000) / 1000;
}

/**
 * Loan-to-Value: LoanAmount / PropertyValue × 100
 * Returns 0 if propertyValue is zero.
 */
export function computeLTV(loanAmount: number, propertyValue: number): number {
  if (propertyValue === 0) return 0;
  return Math.round((loanAmount / propertyValue) * 100 * 100) / 100;
}

/**
 * Operating Expense Ratio: TotalOperatingExpenses / GrossOperatingIncome × 100
 * GrossOperatingIncome = GrossRentalIncome + OtherIncome (before vacancy deduction).
 * Returns 0 if grossOperatingIncome is zero.
 */
export function computeOER(
  totalOperatingExpenses: number,
  grossOperatingIncome: number
): number {
  if (grossOperatingIncome === 0) return 0;
  return Math.round((totalOperatingExpenses / grossOperatingIncome) * 100 * 100) / 100;
}

/**
 * Total cash invested into the deal:
 * downPayment + fixedAcquisitionCosts + emdAmount + projectedRehabCost
 * + (monthlyHoldingCosts × projectedHoldTimeMonths)
 */
export function computeTotalCashInvested(financials: ProjectFinancials): number {
  const purchasePrice = financials.purchasePrice ?? 0;
  const loanAmount = financials.loanAmount ?? 0;
  const downPayment = Math.max(0, purchasePrice - loanAmount);

  const fixedAcquisitionCosts = financials.fixedAcquisitionCosts ?? 0;
  const emdAmount = financials.emdAmount ?? 0;
  const projectedRehabCost = financials.projectedRehabCost ?? 0;

  const monthlyHolding =
    (financials.holdingCostTaxes ?? 0) +
    (financials.holdingCostInsurance ?? 0) +
    (financials.holdingCostUtilities ?? 0);
  const holdMonths = financials.projectedHoldTimeMonths ?? 0;

  return (
    downPayment +
    fixedAcquisitionCosts +
    emdAmount +
    projectedRehabCost +
    monthlyHolding * holdMonths
  );
}

/**
 * Break-even occupancy rate:
 * (TotalAnnualExpenses + AnnualDebtService) / GrossPotentialRent × 100
 * Returns 0 if grossPotentialRent is zero.
 */
export function computeBreakEvenOccupancy(
  totalAnnualExpenses: number,
  annualDebtService: number,
  grossPotentialRent: number
): number {
  if (grossPotentialRent === 0) return 0;
  const breakEven = ((totalAnnualExpenses + annualDebtService) / grossPotentialRent) * 100;
  return Math.round(Math.min(breakEven, 100) * 100) / 100;
}

/**
 * ARV spread: how much equity/margin exists relative to all-in cost.
 */
export function computeARVSpread(
  arv: number,
  allInCost: number
): { spread: number; spreadPercent: number } {
  const spread = arv - allInCost;
  const spreadPercent = arv > 0 ? Math.round((spread / arv) * 100 * 100) / 100 : 0;
  return { spread, spreadPercent };
}

/**
 * Occupancy rate: OccupiedUnits / TotalUnits × 100
 * Returns 100 when there are no units defined (single-family assumption).
 */
export function computeOccupancyRate(occupiedUnits: number, totalUnits: number): number {
  if (totalUnits <= 0) return 100;
  return Math.round((occupiedUnits / totalUnits) * 100 * 100) / 100;
}

/**
 * Qualitative health score combining cap rate, DSCR, and cash-on-cash return.
 * - excellent: capRate > 8 && dscr > 1.5 && coc > 12
 * - good:      capRate > 5 && dscr > 1.25 && coc > 8
 * - fair:      capRate > 3 && dscr >= 1.0
 * - poor:      otherwise
 */
export function computeHealthScore(
  capRate: number,
  dscr: number,
  coc: number
): DerivedMetrics['healthScore'] {
  if (capRate > 8 && dscr > 1.5 && coc > 12) return 'excellent';
  if (capRate > 5 && dscr > 1.25 && coc > 8) return 'good';
  if (capRate > 3 && dscr >= 1.0) return 'fair';
  return 'poor';
}

/**
 * Master aggregator: derives all REI metrics from a ProjectFinancials object.
 *
 * @param financials - The project's financial data
 * @param currentPropertyValue - Current market value used for cap rate / LTV.
 *   Defaults to estimatedARV when omitted.
 */
export function deriveAllMetrics(
  financials: ProjectFinancials,
  currentPropertyValue?: number
): DerivedMetrics {
  const propertyValue =
    currentPropertyValue ?? financials.estimatedARV ?? financials.purchasePrice ?? 0;

  // NOI
  const noiComponents = computeNOIComponents(financials);
  const noi = noiComponents.noi;

  // Debt service — use a 30-year default term if not elsewhere specified
  const loanAmount = financials.loanAmount ?? 0;
  const loanInterestRate = financials.loanInterestRate ?? 0;
  // 360 months (30-year) is the conventional rental hold term
  const loanTermMonths = 360;
  const annualDebtService = computeAnnualDebtService(
    loanAmount,
    loanInterestRate,
    loanTermMonths
  );

  // Cash flow
  const { annual: annualCashFlow, monthly: monthlyCashFlow } = computeCashFlow(
    noi,
    annualDebtService
  );

  // Capital invested
  const totalCashInvested = computeTotalCashInvested(financials);

  // Core ratios
  const capRate = computeCapRate(noi, propertyValue);
  const cashOnCashReturn = computeCoCReturn(annualCashFlow, totalCashInvested);
  const dscr = computeDSCR(noi, annualDebtService);
  const ltv = computeLTV(loanAmount, propertyValue);

  // OER (uses gross income before vacancy)
  const grossOperatingIncome =
    noiComponents.grossRentalIncome + noiComponents.otherIncome;
  const oer = computeOER(noiComponents.totalOperatingExpenses, grossOperatingIncome);

  // ARV spread — all-in cost = purchasePrice + rehab + acquisition costs
  const purchasePrice = financials.purchasePrice ?? 0;
  const projectedRehabCost = financials.projectedRehabCost ?? 0;
  const fixedAcquisitionCosts = financials.fixedAcquisitionCosts ?? 0;
  const allInCost = purchasePrice + projectedRehabCost + fixedAcquisitionCosts;
  const { spread: arvSpread, spreadPercent: arvSpreadPercent } = computeARVSpread(
    financials.estimatedARV ?? 0,
    allInCost
  );

  // Break-even occupancy
  const grossPotentialRent = noiComponents.grossRentalIncome + noiComponents.otherIncome;
  const breakEvenOccupancyRate = computeBreakEvenOccupancy(
    noiComponents.totalOperatingExpenses,
    annualDebtService,
    grossPotentialRent
  );

  // Occupancy
  const numberOfUnits = financials.numberOfUnits ?? 1;
  const occupiedUnits = financials.occupiedUnits ?? numberOfUnits;
  const occupancyRate = computeOccupancyRate(occupiedUnits, numberOfUnits);
  const vacancyRate = Math.round((100 - occupancyRate) * 100) / 100;

  const isViable = dscr >= 1.0 && annualCashFlow > 0;

  const healthScore = computeHealthScore(capRate, dscr, cashOnCashReturn);

  return {
    noi,
    annualCashFlow,
    monthlyCashFlow,
    capRate,
    cashOnCashReturn,
    dscr,
    ltv,
    oer,
    arvSpread,
    arvSpreadPercent,
    annualDebtService,
    totalCashInvested,
    breakEvenOccupancyRate,
    occupancyRate,
    vacancyRate,
    noiComponents,
    isViable,
    healthScore,
  };
}
