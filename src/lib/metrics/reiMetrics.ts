/**
 * REI Metrics Calculation Engine
 * All formulas follow CCIM / NARPM / standard real estate investment conventions.
 * Values: dollars (not cents), percentages as 0–100 (not 0–1).
 */

import type { Project, ProjectFinancials, RehabScheduleTask, RehabStage, LedgerItem } from '@/types/schema';
import { parseDate } from './helpers';
import { calculateAmortization } from '../utils/reiCalculators';


// ── Input/Output Types ────────────────────────────────────────────────────────

export interface NOIComponents {
  grossRentalIncome: number;      // Annual
  otherIncome: number;            // Annual
  vacancyLoss: number;            // Annual (negative impact)
  egi?: number;                   // Effective Gross Income
  propertyTaxes: number;          // Annual (expense)
  insurance: number;              // Annual (expense)
  utilities: number;              // Annual (expense)
  propertyManagement: number;     // Annual (expense)
  maintenance: number;            // Annual (expense)
  hoa: number;                    // Annual (expense)
  totalOperatingExpenses: number; // Sum of all expense lines
  noi: number;                    // Final NOI
}

export interface RentProjectionYear {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  annualCashFlow: number;
  cumulativeCashFlow: number;
  irrToDate: number | null;
}

export interface SaleProjectionPeriod {
  days: number;
  accruedHoldingCosts: number;
  netProfit: number;
  annualizedRoi: number;
  isBreakEven: boolean;
}

export interface ProjectionsBlock {
  rentProjections?: RentProjectionYear[];
  saleProjections?: SaleProjectionPeriod[];
}

export interface DerivedMetrics {
  // Core metrics
  noi: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  capRate: number;                // Percentage (0–100)
  arvCapRate: number;             // Percentage (0–100) based on ARV
  cashOnCashReturn: number;       // Percentage (0–100)
  grossRentMultiplier: number;     // Ratio — Purchase Price ÷ Gross Annual Rent
  dscr: number;                   // Ratio
  ltv: number;                    // Percentage (0–100)
  oer: number;                    // Percentage (0–100) Operating Expense Ratio
  annualizedAppreciation: number;  // Annualized % change in value
  isAppreciationRealized: boolean; // True if sold, false if estimated
  irr: number | null;              // ⚠️ Decimal (0.12 = 12%) — unlike other ratios which use 0–100

  // Supplemental
  arvSpread: number;              // ARV - All-In Cost
  arvSpreadPercent: number;       // (ARV - All-In) / ARV * 100
  annualDebtService: number;
  totalCashInvested: number;
  breakEvenOccupancyRate: number; // % occupancy needed to cover all expenses

  // Operational
  occupancyRate: number;          // Percentage (0–100)
  vacancyRate: number;            // Percentage (0–100)
  isOccupancyAssumption?: boolean; // Label whether the vacancy rate is an assumption or from real tenancy records
  noiComponents: NOIComponents;

  // Phase-specific
  isViable: boolean;              // DSCR >= 1.0 and CoC > 0
  healthScore: 'excellent' | 'good' | 'fair' | 'poor';
  
  // Projections Engine block
  projections?: ProjectionsBlock;

  // Maximum Allowable Offer (MAO)
  mao: number | null;

  // Added derived metrics to eliminate component-level math
  proFormaCapRate: number;
  netProfit: number;
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
  const result = calculateAmortization(loanAmount, annualInterestRatePercent, loanTermMonths);
  return Math.round(result.annualDebtService * 100) / 100;
}

/**
 * Breaks NOI down into its component income and expense lines.
 * All returned values are annual figures in dollars.
 *
 * NOI = (GrossRentalIncome + OtherIncome) − VacancyLoss − OperatingExpenses
 * VacancyLoss = GrossRentalIncome × (vacancyRatePercent / 100)
 * PropertyMgmt = GrossRentalIncome × (propertyManagementFeePercent / 100)
 */
function normalizeDispositionType(dispositionType?: string): string | undefined {
  if (!dispositionType) return dispositionType;
  const mapped: Record<string, string> = {
    'Buy & Hold': 'RENT',
    'Rent': 'RENT',
    'Fix & Flip': 'SALE',
    'Sell': 'SALE',
    'Wholesale': 'SALE',
    'buy-and-hold': 'RENT',
    'LTR': 'RENT',
  };
  return mapped[dispositionType] ?? dispositionType;
}

export function computeNOIComponents(
  financials: ProjectFinancials,
  dispositionType?: string,
  currentPhase?: number
): NOIComponents {
  const normalizedDisp = normalizeDispositionType(dispositionType);
  // Income (annualised from monthly inputs)
  let monthlyGrossRent =
    financials.gross_rent_per_unit ??
    financials.monthlyGrossRent ??
    financials.projectedMonthlyRent ??
    financials.projectedRent ??
    0;
  if (
    (normalizedDisp === 'RENT' || normalizedDisp === 'LEASE') &&
    (currentPhase === 3 || currentPhase === 4)
  ) {
    monthlyGrossRent = financials.actualRentalIncome ?? monthlyGrossRent;
  }
  const grossRentalIncome = monthlyGrossRent * 12;

  const otherMonthlyIncome =
    financials.other_income ??
    financials.otherMonthlyIncome ??
    ((financials.grossIncomeParking ?? 0) + (financials.grossIncomeLaundry ?? 0));
  const otherIncome = otherMonthlyIncome * 12;

  // Vacancy
  const vacancyPct =
    financials.vacancy_pct ??
    financials.vacancyRatePercent ??
    financials.vacancyRate ??
    7;
  const vacancyLoss = grossRentalIncome * (vacancyPct / 100);

  // Operating expenses (annual)
  const propertyTaxes =
    (financials.tax ??
      financials.holdingCostTaxes ??
      financials.operatingExpenseTaxes ??
      0) * 12;
  const insurance =
    (financials.insurance ??
      financials.holdingCostInsurance ??
      financials.operatingExpenseInsurance ??
      0) * 12;
  const utilities =
    (financials.utilities ?? financials.holdingCostUtilities ?? 0) * 12;
  const security = (financials.security ?? 0) * 12;
  const capex = (financials.capex ?? 0) * 12;

  // Property management: prefer fee percent on GROSS scheduled rent (P6 canon), then fixed monthly amount
  // BUG-8 FIX: PM fee is based on gross rental income, NOT effective rent (gross - vacancy).
  // The gross-basis convention matches CCIM / NARPM standards and the locked golden values.
  let propertyManagement: number;
  if (financials.management_pct != null) {
    propertyManagement = grossRentalIncome * (financials.management_pct / 100);
  } else if (financials.propertyManagementFeePercent != null) {
    propertyManagement = grossRentalIncome * (financials.propertyManagementFeePercent / 100);
  } else {
    propertyManagement = (financials.management ?? financials.propertyManagementFee ?? 0) * 12;
  }

  // Maintenance: prefer percentage of gross rent, then fixed monthly amount
  let maintenance: number;
  if (financials.maintenance_pct != null) {
    maintenance = grossRentalIncome * (financials.maintenance_pct / 100);
  } else if (financials.maintenanceCapExPercent != null) {
    maintenance = grossRentalIncome * (financials.maintenanceCapExPercent / 100);
  } else {
    maintenance =
      (financials.maintenance ??
        financials.monthlyMaintenanceReserve ??
        financials.maintenanceReserves ??
        0) * 12;
  }
  const hoa = (financials.HOA ?? financials.monthlyHOA ?? 0) * 12;

  let totalOperatingExpenses =
    propertyTaxes +
    insurance +
    utilities +
    propertyManagement +
    maintenance +
    hoa +
    security +
    capex;

  if (totalOperatingExpenses === 0 && financials.projectedOpex != null) {
    totalOperatingExpenses = financials.projectedOpex * 12;
  }

  const egi = grossRentalIncome + otherIncome - vacancyLoss;
  const noi = egi - totalOperatingExpenses;


  return {
    grossRentalIncome,
    otherIncome,
    vacancyLoss,
    egi,
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
 * Always derives from components when individual rent fields are available.
 * Falls back to pre-computed `netOperatingIncome` only when no component inputs exist.
 */
export function computeNOI(
  financials: ProjectFinancials,
  dispositionType?: string,
  currentPhase?: number
): number {
  // Always derive from components when individual fields are available.
  // The pre-computed netOperatingIncome may be stale if user updated
  // rent or expenses after it was cached.
  const hasRentInput =
    financials.gross_rent_per_unit != null ||
    financials.monthlyGrossRent != null ||
    financials.projectedMonthlyRent != null ||
    financials.projectedRent != null;

  if (hasRentInput) {
    return computeNOIComponents(financials, dispositionType, currentPhase).noi;
  }

  // Fall back to pre-computed value only when no component inputs exist
  if (financials.netOperatingIncome != null) return financials.netOperatingIncome;

  return 0;
}

/**
 * Calculates Effective Gross Income (EGI) as:
 * EGI = Gross Rental Income + Other Income - Vacancy Loss
 * All input/output figures are annual, in dollars.
 */
export function computeEGI(
  grossRentalIncome: number,
  otherIncome: number,
  vacancyPct: number
): number {
  const vacancyLoss = grossRentalIncome * (vacancyPct / 100);
  return grossRentalIncome + otherIncome - vacancyLoss;
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
 * Returns 0 if propertyValue is zero or negative.
 */
export function computeCapRate(noi: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  return Math.round((noi / propertyValue) * 100 * 100) / 100;
}

/**
 * Cash-on-Cash return: AnnualCashFlow / TotalCashInvested × 100
 * Returns 0 if totalCashInvested is zero or negative.
 */
export function computeCoCReturn(annualCashFlow: number, totalCashInvested: number): number {
  if (totalCashInvested <= 0) return 0;
  return Math.round((annualCashFlow / totalCashInvested) * 100 * 100) / 100;
}

/**
 * Gross Rent Multiplier: Property Price ÷ Gross Annual Rent
 * A quick screening filter — lower GRM means higher rent relative to price.
 * Returns 0 if annual rent is zero or negative.
 */
export function computeGRM(propertyPrice: number, grossAnnualRent: number): number {
  if (grossAnnualRent <= 0) return 0;
  return Math.round((propertyPrice / grossAnnualRent) * 100) / 100;
}

export function computeOnePercentTest(propertyPrice: number, monthlyRent: number): number {
  if (propertyPrice <= 0) return 0;
  return Math.round((monthlyRent / propertyPrice) * 100 * 100) / 100;
}

/**
 * Comp Rollups Calculation:
 * Calculates Average Price/Sqft of comparable sales, and maps it to a Comp-Implied Value
 * based on Subject Property square footage.
 */
export function computeCompRollups(
  comps: { soldPrice: number; sqft: number }[],
  subjectSqft: number
): { avgPricePerSqft: number; impliedARV: number } {
  const valid = comps.filter((c) => c.soldPrice > 0 && c.sqft > 0);
  if (valid.length === 0) {
    return { avgPricePerSqft: 0, impliedARV: 0 };
  }
  const totalPpsqft = valid.reduce((sum, c) => sum + c.soldPrice / c.sqft, 0);
  const avgPricePerSqft = Math.round((totalPpsqft / valid.length) * 100) / 100;
  const impliedARV = Math.round(avgPricePerSqft * subjectSqft);
  return { avgPricePerSqft, impliedARV };
}

/**
 * Debt Service Coverage Ratio: NOI / AnnualDebtService
 * Returns 999 (sentinel) when there is no debt (annualDebtService === 0 but NOI > 0).
 * Returns 0 when both are zero.
 */
export function computeDSCR(noi: number, annualDebtService: number): number {
  if (annualDebtService === 0) return noi > 0 ? 999 : 0;
  return Math.round((noi / annualDebtService) * 1000) / 1000;
}

/**
 * Loan-to-Value: LoanAmount / PropertyValue × 100
 * Returns 0 if propertyValue is zero or negative.
 */
export function computeLTV(loanAmount: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  return Math.round((loanAmount / propertyValue) * 100 * 100) / 100;
}

/**
 * Internal Rate of Return (IRR) — Newton-Raphson solver.
 * Finds the discount rate that makes NPV of all cash flows equal zero.
 *
 * @param cashFlows Array where index 0 is the initial investment (negative) and
 *                  subsequent entries are annual net cash flows (final year includes
 *                  exit proceeds).
 * @param maxIterations Maximum solver iterations (default 100).
 * @param tolerance Convergence threshold (default 1e-7).
 * @returns IRR as a decimal (e.g. 0.12 = 12%), or null if solver fails to converge.
 */
export function computeIRR(
  cashFlows: number[],
  maxIterations = 100,
  tolerance = 1e-7
): number | null {
  if (cashFlows.length < 2) return null;

  // Initial guess
  let rate = 0.10;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0; // derivative of NPV w.r.t. rate

    for (let t = 0; t < cashFlows.length; t++) {
      const pv = cashFlows[t] / Math.pow(1 + rate, t);
      npv += pv;
      if (t > 0) {
        dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(dNpv) < 1e-12) break; // avoid division by zero

    const newRate = rate - npv / dNpv;

    if (Math.abs(newRate - rate) < tolerance) {
      return Math.round(newRate * 10000) / 10000; // 4 decimal places
    }

    rate = newRate;

    // Guard against divergence
    if (rate < -0.99 || rate > 10) break;
  }

  // ── Bisection Fallback ───────────────────────────────────────────────────
  let low = -0.99;
  let high = 10.0;

  const getNpv = (r: number) => {
    let sum = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      sum += cashFlows[t] / Math.pow(1 + r, t);
    }
    return sum;
  };

  // Scan range [-0.99, 10.0] for a sign change to bracket the root
  let bracketFound = false;
  let prevVal = getNpv(low);
  const steps = 100;
  const stepSize = (high - low) / steps;

  for (let step = 1; step <= steps; step++) {
    const r = low + step * stepSize;
    const val = getNpv(r);
    if (prevVal * val <= 0) {
      low = r - stepSize;
      high = r;
      bracketFound = true;
      break;
    }
    prevVal = val;
  }

  // If no bracket found with standard scan, scan wider up to 100.0
  if (!bracketFound) {
    low = -0.999;
    high = 100.0;
    const widerSteps = 200;
    const widerStepSize = (high - low) / widerSteps;
    prevVal = getNpv(low);
    for (let step = 1; step <= widerSteps; step++) {
      const r = low + step * widerStepSize;
      const val = getNpv(r);
      if (prevVal * val <= 0) {
        low = r - widerStepSize;
        high = r;
        bracketFound = true;
        break;
      }
      prevVal = val;
    }
  }

  if (bracketFound) {
    // Run bisection solver
    for (let j = 0; j < 100; j++) {
      const mid = (low + high) / 2;
      const npvMid = getNpv(mid);
      
      if (Math.abs(npvMid) < tolerance || (high - low) < tolerance) {
        return Math.round(mid * 10000) / 10000;
      }
      
      if (getNpv(low) * npvMid < 0) {
        high = mid;
      } else {
        low = mid;
      }
    }
  }

  return null; // did not converge
}

/**
 * Build IRR cash flow array from project financials.
 * cashFlows[0] = -totalCashInvested
 * cashFlows[1..N-1] = annualCashFlow
 * cashFlows[N] = annualCashFlow + saleProceeds (exit year)
 *
 * Sale proceeds = appreciated value − remaining loan balance − selling costs
 */
export function buildIRRCashFlows(
  totalCashInvested: number,
  annualCashFlow: number,
  holdYears: number,
  purchasePrice: number,
  annualAppreciationPercent: number,
  loanAmount: number,
  loanInterestRate: number,
  loanTermYears: number,
  sellingCostsPercent = 8 // agent commissions + closing costs
): number[] {
  if (holdYears <= 0 || totalCashInvested <= 0) return [];

  const flows: number[] = [-totalCashInvested];

  // Future property value
  const futureValue = purchasePrice * Math.pow(1 + annualAppreciationPercent / 100, holdYears);

  // Remaining loan balance after holdYears (standard amortization)
  let remainingBalance = loanAmount;
  const monthlyRate = (loanInterestRate / 100) / 12;
  const totalPayments = loanTermYears * 12;

  if (monthlyRate > 0 && totalPayments > 0 && loanAmount > 0) {
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
    const paymentsMade = holdYears * 12;
    remainingBalance = loanAmount * Math.pow(1 + monthlyRate, paymentsMade) -
      monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
    remainingBalance = Math.max(0, remainingBalance);
  }

  const sellingCosts = futureValue * (sellingCostsPercent / 100);
  const netSaleProceeds = futureValue - remainingBalance - sellingCosts;

  for (let y = 1; y <= holdYears; y++) {
    if (y === holdYears) {
      flows.push(annualCashFlow + netSaleProceeds);
    } else {
      flows.push(annualCashFlow);
    }
  }

  return flows;
}

/**
 * Operating Expense Ratio: (TotalOperatingExpenses ÷ GrossRentalIncome) × 100
 * Returns 0 if grossRentalIncome is zero or negative.
 */
export function computeOER(
  totalOperatingExpenses: number,
  grossRentalIncome: number
): number {
  if (grossRentalIncome <= 0) return 0;
  return Math.round((totalOperatingExpenses / grossRentalIncome) * 100 * 100) / 100;
}

/**
 * Total cash invested into the deal:
 * downPayment + fixedAcquisitionCosts + emdAmount + projectedRehabCost
 * + (monthlyHoldingCosts × projectedHoldTimeMonths)
 */
export function computeTotalCashInvested(financials: ProjectFinancials): number {
  // If the user (or closing docs) explicitly set totalCashInvested, use it.
  // This matches the spec: $60,000 = down payment + closing costs (not rehab).
  if (financials.totalCashInvested != null && financials.totalCashInvested > 0) {
    return financials.totalCashInvested;
  }

  // Fallback: compute from components
  const purchasePrice = financials.offer_price ?? financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
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

// ── Flip Profitability Functions ───────────────────────────────────────────────

/**
 * Maximum Allowable Offer (70% rule):
 * MAO = (ARV × maxPercentOfARV) − RehabCost − ClosingCosts
 * Standard is 70% of ARV.
 */
export function computeMAO(
  arv: number,
  rehabCost: number,
  closingCosts = 0,
  maxPercentOfARV = 70,
  dispositionType?: string
): number | null {
  if (dispositionType && dispositionType !== 'SALE') return null;
  if (arv <= 0) return 0;
  return Math.round((arv * (maxPercentOfARV / 100)) - rehabCost - closingCosts);
}

/**
 * Net Profit per Flip:
 * NetProfit = ActualSalePrice − TotalAllInCost
 * TotalAllInCost = Purchase + Rehab + Holding + Financing + Selling Costs
 */
export function computeFlipNetProfit(
  actualSalePrice: number,
  totalAllInCost: number
): number {
  return Math.round((actualSalePrice - totalAllInCost) * 100) / 100;
}

/**
 * Flip ROI: (NetProfit / TotalCashInvested) × 100
 * Returns 0 if totalCashInvested is zero.
 * 2026 threshold: > 25% to be worthwhile.
 */
export function computeFlipROI(netProfit: number, totalCashInvested: number): number {
  if (totalCashInvested <= 0) return 0;
  return Math.round((netProfit / totalCashInvested) * 100 * 100) / 100;
}

/**
 * Gross Profit Margin: ((SalePrice − TotalCost) / SalePrice) × 100
 * Returns 0 if salePrice is zero.
 */
export function computeGrossMargin(salePrice: number, totalCost: number): number {
  if (salePrice <= 0) return 0;
  return Math.round(((salePrice - totalCost) / salePrice) * 100 * 100) / 100;
}

/**
 * Days on Market: difference between listing date and sale date.
 * Returns null when either date is missing.
 * Target: < 90 days for healthy holding cost control.
 */
export function computeDOM(
  listingDate: Date | string | undefined | null,
  soldDate: Date | string | undefined | null
): number | null {
  if (!listingDate || !soldDate) return null;
  const start = new Date(listingDate);
  const end = new Date(soldDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Rehab schedule variance: projected vs actual completion.
 * Returns days over/under and percentage variance.
 * Negative = ahead of schedule, positive = behind schedule.
 */
export function computeRehabVariance(
  projectedDays: number,
  actualDays: number
): { varianceDays: number; variancePercent: number } {
  const varianceDays = actualDays - projectedDays;
  const variancePercent = projectedDays > 0
    ? Math.round((varianceDays / projectedDays) * 100 * 100) / 100
    : 0;
  return { varianceDays, variancePercent };
}

/**
 * Qualitative health score combining cap rate, DSCR, and cash-on-cash return.
 * - excellent: capRate > 8 && dscr > 1.5 && coc > 12
 * - good:      capRate > 5 && dscr > 1.25 && coc > 8
 * - fair:      capRate > 3 && dscr >= 1.0
 * - poor:      otherwise
 */
export function computeHealthScore(
  capRate: number | null,
  dscr: number,
  coc: number | null
): DerivedMetrics['healthScore'] {
  const cap = capRate ?? 0;
  const c = coc ?? 0;
  if (cap > 8 && dscr > 1.5 && c > 12) return 'excellent';
  if (cap > 5 && dscr > 1.25 && c > 8) return 'good';
  if (cap > 3 && dscr >= 1.0) return 'fair';
  return 'poor';
}

/**
 * Calculates the years held (elapsed time) between acquisition date and a given end date (e.g. sale date or today).
 * Clamps to a minimum of 1 month (0.0833 years) to prevent division by near-zero years.
 */
export function computeYearsHeld(
  acquisitionDateRaw: Date | string | undefined | null,
  endDateRaw: Date | string | undefined | null,
  createdAtRaw?: Date | string | undefined | null
): number {
  const parsedStart = parseDate(acquisitionDateRaw);
  const parsedCreated = parseDate(createdAtRaw);
  const start = parsedStart || parsedCreated || new Date();
  const end = parseDate(endDateRaw) || new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const diffMs = end.getTime() - start.getTime();
  const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  return years > 0.0833 ? years : 0.0833; // Clamp to min 1 month
}


/**
 * Calculates the annualized appreciation rate (CAGR) between an acquisition basis
 * and the current or sale value.
 * CAGR = ((EndValue / Basis) ^ (1 / Years)) - 1
 */
export function computeAnnualizedAppreciationRate(
  purchasePrice: number,
  fixedAcquisitionCosts: number,
  currentOrSaleValue: number,
  years: number
): number {
  const basis = purchasePrice + fixedAcquisitionCosts;
  if (basis <= 0 || currentOrSaleValue <= 0 || years <= 0) return 0;
  const rate = Math.pow(currentOrSaleValue / basis, 1 / years) - 1;
  return Math.round(rate * 100 * 100) / 100;
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
  currentPropertyValue?: number,
  dispositionType?: string,
  currentPhase?: number,
  createdAt?: Date | string | null,
  holdingPeriods?: number[]
): DerivedMetrics {
  const normalizedDisp = normalizeDispositionType(dispositionType);
  const purchasePrice = financials.offer_price ?? financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
  const propertyValue =
    currentPropertyValue ?? financials.estimatedARV ?? purchasePrice;

  // NOI
  const noiComponents = computeNOIComponents(financials, dispositionType, currentPhase);
  const noi = noiComponents.noi;

  // Debt service — use stored term or default to 30-year conventional
  const loanAmount = financials.loanAmount ?? 0;
  const loanInterestRate = financials.loanInterestRate ?? 0;
  const loanTermMonths = (financials.loanTermYears ?? 30) * 12;
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
  const capRate = computeCapRate(noi, purchasePrice);
  const arvPropertyValue = financials.estimatedARV ?? financials.estimatedCurrentValue ?? purchasePrice;
  const arvCapRate = computeCapRate(noi, arvPropertyValue);
  const cashOnCashReturn = computeCoCReturn(annualCashFlow, totalCashInvested);
  const grossRentMultiplier = computeGRM(
    purchasePrice,
    noiComponents.grossRentalIncome
  );
  const dscr = computeDSCR(noi, annualDebtService);
  const ltv = computeLTV(loanAmount, propertyValue);

  // OER: (Operating Expenses ÷ Gross Operating Income) × 100
  // GOI includes both rental income and other income (parking, laundry, etc.)
  const grossOperatingIncome = noiComponents.grossRentalIncome + noiComponents.otherIncome;
  const oer = computeOER(noiComponents.totalOperatingExpenses, grossOperatingIncome);

  // ARV spread — all-in cost = purchasePrice + rehab + acquisition costs
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
  let occupancyRate = 100;
  let isOccupancyAssumption = true;

  if (normalizedDisp === 'SALE') {
    occupancyRate = 0;
    isOccupancyAssumption = false;
  } else if (
    financials.daysOccupied !== undefined &&
    financials.totalHoldDays !== undefined &&
    financials.totalHoldDays > 0
  ) {
    occupancyRate = Math.round((financials.daysOccupied / financials.totalHoldDays) * 100 * 100) / 100;
    isOccupancyAssumption = false;
  } else {
    const numberOfUnits = financials.numberOfUnits ?? 1;
    const occupiedUnits = financials.occupiedUnits ?? numberOfUnits;
    const unitOccupancy = computeOccupancyRate(occupiedUnits, numberOfUnits);
    const vacancyPct = financials.vacancyRatePercent ?? financials.vacancyRate ?? 7;
    if (unitOccupancy === 100 && vacancyPct > 0) {
      occupancyRate = 100 - vacancyPct;
    } else {
      occupancyRate = unitOccupancy;
    }
    isOccupancyAssumption = true;
  }
  const vacancyRate = Math.round((100 - occupancyRate) * 100) / 100;

  // Calculate proFormaCapRate and netProfit to avoid component-level math
  const proFormaCapRate = (purchasePrice + projectedRehabCost) > 0
    ? Math.round((noi / (purchasePrice + projectedRehabCost)) * 100 * 100) / 100
    : 0;

  const netProfit = (financials.estimatedARV ?? financials.arv ?? 0) - allInCost;

  const isViable = dscr >= 1.0 && cashOnCashReturn !== null && cashOnCashReturn > 0;

  const healthScore = computeHealthScore(capRate, dscr, cashOnCashReturn);

  // Annualized Appreciation Rate
  const isAppreciationRealized = financials.soldDate != null && financials.actualSalePrice != null && financials.actualSalePrice > 0;
  const currentOrSaleValue = isAppreciationRealized
    ? (financials.actualSalePrice ?? 0)
    : (financials.projectedSalePrice ?? financials.estimatedCurrentValue ?? financials.estimatedARV ?? purchasePrice);
  
  // Calculate years held based on actual timeline, or fallback to projected hold months if newly acquired / evaluating
  let yearsHeld = computeYearsHeld(
    financials.acquisitionDate,
    isAppreciationRealized ? financials.soldDate : null,
    createdAt
  );
  
  const parsedAcqDate = parseDate(financials.acquisitionDate);
  const elapsedDays = parsedAcqDate && !isAppreciationRealized
    ? (new Date().getTime() - parsedAcqDate.getTime()) / (1000 * 60 * 60 * 24)
    : 0;


  // If not sold, and elapsed days is less than 30 days (evaluating or newly acquired), use projected hold months
  if (!isAppreciationRealized && elapsedDays < 30) {
    yearsHeld = Math.max(1, (financials.projectedHoldTimeMonths ?? 60) / 12);
  }

  const annualizedAppreciation = computeAnnualizedAppreciationRate(
    financials.purchasePrice ?? 0,
    financials.fixedAcquisitionCosts ?? 0,
    currentOrSaleValue,
    yearsHeld
  );

  // Calculate IRR
  let irr: number | null = null;
  if (totalCashInvested > 0) {
    const holdYears = Math.max(1, Math.round(yearsHeld));
    const irrCashFlows = buildIRRCashFlows(
      totalCashInvested,
      annualCashFlow,
      holdYears,
      purchasePrice,
      annualizedAppreciation,
      loanAmount,
      loanInterestRate,
      financials.loanTermYears ?? 30
    );
    const irrValue = computeIRR(irrCashFlows);
    if (irrValue !== null) {
      irr = irrValue * 100; // Return as percentage (e.g. 12.5 instead of 0.125)
    }
  }

  // ── Projections Engine (AQ-16) ───────────────────────────────────────────
  const rentProjections: RentProjectionYear[] = [];
  if (normalizedDisp === 'RENT' || normalizedDisp === 'LEASE') {
    const appreciationRate = financials.annualAppreciationPercent ?? 3; // 3% default
    const rentGrowthRate = financials.annualRentGrowthPercent ?? 2; // 2% default
    const expenseGrowthRate = 2; // 2% default YoY expense inflation
    
    let cumulativeCashFlow = 0;
    for (let y = 1; y <= 10; y++) {
      // 1. Property value appreciation
      const projectedVal = purchasePrice * Math.pow(1 + appreciationRate / 100, y);
      
      // 2. Loan balance amortization
      let remainingBalance = loanAmount;
      const monthlyRate = (loanInterestRate / 100) / 12;
      const totalPayments = loanTermMonths;
      if (monthlyRate > 0 && totalPayments > 0 && loanAmount > 0) {
        const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
          (Math.pow(1 + monthlyRate, totalPayments) - 1);
        const paymentsMade = y * 12;
        remainingBalance = loanAmount * Math.pow(1 + monthlyRate, paymentsMade) -
          monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
        remainingBalance = Math.max(0, remainingBalance);
      } else {
        remainingBalance = 0;
      }
      
      // 3. Equity
      const equity = projectedVal - remainingBalance;
      
      // 4. Annual Cash Flow adjusted YoY
      const baseGrossRent = (financials.gross_rent_per_unit ?? financials.monthlyGrossRent ?? financials.projectedMonthlyRent ?? financials.projectedRent ?? 0) * 12;
      const yrGrossRent = baseGrossRent * Math.pow(1 + rentGrowthRate / 100, y - 1);
      
      const baseOtherIncome = (financials.other_income ?? financials.otherMonthlyIncome ?? 0) * 12;
      const yrOtherIncome = baseOtherIncome * Math.pow(1 + rentGrowthRate / 100, y - 1);
      
      const vacancyPct = financials.vacancy_pct ?? financials.vacancyRatePercent ?? financials.vacancyRate ?? 7;
      const yrVacancyLoss = yrGrossRent * (vacancyPct / 100);
      
      // Expenses
      const baseTaxes = (financials.tax ?? financials.holdingCostTaxes ?? financials.operatingExpenseTaxes ?? 0) * 12;
      const baseInsurance = (financials.insurance ?? financials.holdingCostInsurance ?? financials.operatingExpenseInsurance ?? 0) * 12;
      const baseUtilities = (financials.utilities ?? financials.holdingCostUtilities ?? 0) * 12;
      const baseSecurity = (financials.security ?? 0) * 12;
      const baseCapex = (financials.capex ?? 0) * 12;
      const baseHOA = (financials.HOA ?? financials.monthlyHOA ?? 0) * 12;
      
      const yrTaxes = baseTaxes * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      const yrInsurance = baseInsurance * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      const yrUtilities = baseUtilities * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      const yrSecurity = baseSecurity * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      const yrCapex = baseCapex * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      const yrHOA = baseHOA * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      
      let yrMgmt: number;
      const yrEffectiveRent = yrGrossRent - yrVacancyLoss;
      if (financials.management_pct != null) {
        yrMgmt = yrEffectiveRent * (financials.management_pct / 100);
      } else if (financials.propertyManagementFeePercent != null) {
        yrMgmt = yrEffectiveRent * (financials.propertyManagementFeePercent / 100);
      } else {
        const baseMgmt = (financials.management ?? financials.propertyManagementFee ?? 0) * 12;
        yrMgmt = baseMgmt * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      }
      
      let yrMaint: number;
      if (financials.maintenance_pct != null) {
        yrMaint = yrGrossRent * (financials.maintenance_pct / 100);
      } else if (financials.maintenanceCapExPercent != null) {
        yrMaint = yrGrossRent * (financials.maintenanceCapExPercent / 100);
      } else {
        const baseMaint = (financials.maintenance ?? financials.monthlyMaintenanceReserve ?? financials.maintenanceReserves ?? 0) * 12;
        yrMaint = baseMaint * Math.pow(1 + expenseGrowthRate / 100, y - 1);
      }
      
      const yrTotalExpenses = yrTaxes + yrInsurance + yrUtilities + yrSecurity + yrCapex + yrHOA + yrMgmt + yrMaint;
      const yrNOI = yrGrossRent + yrOtherIncome - yrVacancyLoss - yrTotalExpenses;
      const yrCashFlow = yrNOI - annualDebtService;
      
      cumulativeCashFlow += yrCashFlow;
      
      // 5. IRR-to-date
      let irrToDate: number | null = null;
      if (totalCashInvested > 0) {
        const subFlows: number[] = [-totalCashInvested];
        for (let k = 1; k < y; k++) {
          const kGrossRent = baseGrossRent * Math.pow(1 + rentGrowthRate / 100, k - 1);
          const kOtherIncome = baseOtherIncome * Math.pow(1 + rentGrowthRate / 100, k - 1);
          const kVacancyLoss = kGrossRent * (vacancyPct / 100);
          const kTaxes = baseTaxes * Math.pow(1 + expenseGrowthRate / 100, k - 1);
          const kInsurance = baseInsurance * Math.pow(1 + expenseGrowthRate / 100, k - 1);
          const kUtilities = baseUtilities * Math.pow(1 + expenseGrowthRate / 100, k - 1);
          const kSecurity = baseSecurity * Math.pow(1 + expenseGrowthRate / 100, k - 1);
          const kCapex = baseCapex * Math.pow(1 + expenseGrowthRate / 100, k - 1);
          const kHOA = baseHOA * Math.pow(1 + expenseGrowthRate / 100, k - 1);
          let kMgmt = financials.management_pct != null ? (kGrossRent - kVacancyLoss) * (financials.management_pct / 100) : (financials.propertyManagementFeePercent != null ? (kGrossRent - kVacancyLoss) * (financials.propertyManagementFeePercent / 100) : (financials.management ?? financials.propertyManagementFee ?? 0) * 12 * Math.pow(1 + expenseGrowthRate / 100, k - 1));
          let kMaint = financials.maintenance_pct != null ? kGrossRent * (financials.maintenance_pct / 100) : (financials.maintenanceCapExPercent != null ? kGrossRent * (financials.maintenanceCapExPercent / 100) : (financials.maintenance ?? financials.monthlyMaintenanceReserve ?? 0) * 12 * Math.pow(1 + expenseGrowthRate / 100, k - 1));
          const kTotalExpenses = kTaxes + kInsurance + kUtilities + kSecurity + kCapex + kHOA + kMgmt + kMaint;
          const kNOI = kGrossRent + kOtherIncome - kVacancyLoss - kTotalExpenses;
          const kCashFlow = kNOI - annualDebtService;
          subFlows.push(kCashFlow);
        }
        
        const yrSellingCosts = projectedVal * 0.08; // 8% selling costs
        const netSaleProceeds = projectedVal - remainingBalance - yrSellingCosts;
        subFlows.push(yrCashFlow + netSaleProceeds);
        
        const irrVal = computeIRR(subFlows);
        if (irrVal !== null) {
          irrToDate = irrVal * 100;
        }
      }
      
      rentProjections.push({
        year: y,
        propertyValue: Math.round(projectedVal * 100) / 100,
        loanBalance: Math.round(remainingBalance * 100) / 100,
        equity: Math.round(equity * 100) / 100,
        annualCashFlow: Math.round(yrCashFlow * 100) / 100,
        cumulativeCashFlow: Math.round(cumulativeCashFlow * 100) / 100,
        irrToDate: irrToDate !== null ? Math.round(irrToDate * 100) / 100 : null,
      });
    }
  }

  const saleProjections: SaleProjectionPeriod[] = [];
  if (normalizedDisp === 'SALE') {
    const periods = holdingPeriods ?? [30, 90, 180, 270];
    const burnRateInfo = computeDailyBurnRate(financials);
    const dailyBurn = burnRateInfo.dailyBurnRate;
    
    const salePrice = financials.projectedSalePrice ?? financials.actualSalePrice ?? financials.estimatedARV ?? propertyValue;
    const rehabCost = financials.projectedRehabCost ?? 0;
    const closingCostsBuy = financials.fixedAcquisitionCosts ?? 0;
    const closingCostsSell = salePrice * 0.08; // 8% selling costs
    
    for (const d of periods) {
      const accruedHoldingCosts = dailyBurn * d;
      const netProfit = salePrice - (purchasePrice + rehabCost + closingCostsBuy + closingCostsSell + accruedHoldingCosts);
      const annualizedRoi = totalCashInvested > 0 ? (netProfit / totalCashInvested) * (365 / d) * 100 : 0;
      const isBreakEven = netProfit >= 0;
      
      saleProjections.push({
        days: d,
        accruedHoldingCosts: Math.round(accruedHoldingCosts * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        annualizedRoi: Math.round(annualizedRoi * 100) / 100,
        isBreakEven,
      });
    }
  }

  const projections: ProjectionsBlock = {
    rentProjections: rentProjections.length > 0 ? rentProjections : undefined,
    saleProjections: saleProjections.length > 0 ? saleProjections : undefined,
  };

  return {
    noi,
    annualCashFlow,
    monthlyCashFlow,
    capRate,
    arvCapRate,
    cashOnCashReturn,
    grossRentMultiplier,
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
    isOccupancyAssumption,
    noiComponents,
    isViable,
    healthScore,
    annualizedAppreciation,
    isAppreciationRealized,
    irr,
    projections,
    mao: computeMAO(
      financials.estimatedARV ?? 0,
      financials.projectedRehabCost ?? 0,
      financials.fixedAcquisitionCosts ?? 0,
      70,
      dispositionType
    ),
    proFormaCapRate,
    netProfit,
  };
}

// ── Phase 2: Financing & Budget Planning ──────────────────────────────────────

/**
 * 15% Contingency Rule
 *
 * Total Budget = (Purchase + Repairs + Holding/Closing) + (Repairs × contingencyRate)
 * Default contingency: 15% of estimated repair costs.
 * The contingency fund covers unforeseen problems: hidden structural defects,
 * rotted subfloors, unexpected plumbing issues discovered during demolition.
 */
export interface ContingencyBudget {
  purchasePrice: number;
  repairCost: number;
  holdingAndClosingCosts: number;
  contingencyRate: number;       // e.g., 0.15
  contingencyAmount: number;     // repairCost × contingencyRate
  totalRepairBudget: number;     // repairCost + contingencyAmount
  totalProjectBudget: number;    // purchasePrice + totalRepairBudget + holdingAndClosingCosts
}

export function computeContingencyBudget(
  financials: ProjectFinancials,
  contingencyRate: number = 0.15
): ContingencyBudget {
  const purchasePrice = financials.offer_price ?? financials.purchasePrice ?? 0;
  const repairCost = financials.projectedRehabCost ?? 0;
  const closingCosts = financials.fixedAcquisitionCosts ?? 0;

  // Monthly holding costs annualized by estimated timeline, or default 6 months
  const monthlyHolding =
    (financials.holdingCostTaxes ?? financials.operatingExpenseTaxes ?? 0) +
    (financials.holdingCostInsurance ?? financials.operatingExpenseInsurance ?? 0) +
    (financials.holdingCostUtilities ?? 0);
  const holdMonths = financials.estimatedTimelineDays
    ? Math.ceil(financials.estimatedTimelineDays / 30)
    : 6;
  const holdingAndClosingCosts = closingCosts + (monthlyHolding * holdMonths);

  const contingencyAmount = Math.round(repairCost * contingencyRate);
  const totalRepairBudget = repairCost + contingencyAmount;
  const totalProjectBudget = purchasePrice + totalRepairBudget + holdingAndClosingCosts;

  return {
    purchasePrice,
    repairCost,
    holdingAndClosingCosts,
    contingencyRate,
    contingencyAmount,
    totalRepairBudget,
    totalProjectBudget,
  };
}

/**
 * Daily Burn Rate
 *
 * Once the loan closes, the project has a daily cost.
 * Daily Burn Rate = Monthly Holding Costs ÷ 30
 * Includes: loan interest, insurance, taxes, utilities, and any ongoing fees.
 *
 * Knowing this number creates urgency and helps REIs keep timelines tight.
 */
export interface BurnRateBreakdown {
  monthlyLoanInterest: number;
  monthlyInsurance: number;
  monthlyTaxes: number;
  monthlyUtilities: number;
  monthlyOther: number;          // HOA, maintenance reserves, etc.
  totalMonthlyBurn: number;
  dailyBurnRate: number;
  weeklyBurnRate: number;
}

export function computeDailyBurnRate(financials: ProjectFinancials): BurnRateBreakdown {
  // Loan interest — monthly portion only (interest-only for hard money is common)
  const loanAmount = financials.loanAmount ?? 0;
  const annualRate = financials.loanInterestRate ?? 0;
  const monthlyLoanInterest = loanAmount > 0 && annualRate > 0
    ? Math.round((loanAmount * (annualRate / 100)) / 12)
    : 0;

  const monthlyInsurance = financials.holdingCostInsurance ?? financials.operatingExpenseInsurance ?? 0;
  const monthlyTaxes = financials.holdingCostTaxes ?? financials.operatingExpenseTaxes ?? 0;
  const monthlyUtilities = financials.holdingCostUtilities ?? 0;
  const monthlyOther = (financials.monthlyHOA ?? 0) + (financials.monthlyMaintenanceReserve ?? financials.maintenanceReserves ?? 0);

  const totalMonthlyBurn = monthlyLoanInterest + monthlyInsurance + monthlyTaxes + monthlyUtilities + monthlyOther;
  const dailyBurnRate = Math.round((totalMonthlyBurn / 30) * 100) / 100;
  const weeklyBurnRate = Math.round(dailyBurnRate * 7 * 100) / 100;

  return {
    monthlyLoanInterest,
    monthlyInsurance,
    monthlyTaxes,
    monthlyUtilities,
    monthlyOther,
    totalMonthlyBurn,
    dailyBurnRate,
    weeklyBurnRate,
  };
}

// ── Renovation ROI & Over-Improvement Engine ──────────────────────────────────

/**
 * Industry ROI benchmarks by renovation zone (source: NAR Remodeling Impact Report).
 * These represent the typical % of cost recovered at resale.
 * Kitchen 75%, Bathroom 71%, Curb Appeal 100%, Interior 62%, Structural 40%.
 */
const ZONE_ROI_BENCHMARKS: Record<string, number> = {
  'Kitchen': 0.75,
  'Bathroom': 0.71,
  'Curb Appeal': 1.00,
  'Interior': 0.62,
  'Structural': 0.40,
};

export interface ZoneROIBreakdown {
  zone: string;
  totalCost: number;
  estimatedValueAdd: number;
  roi: number;              // Percentage (0–100)
  budgetPercent: number;    // % of total rehab budget this zone consumes
  itemCount: number;
}

export interface RenovationROIResult {
  zones: ZoneROIBreakdown[];
  totalRehabCost: number;
  totalEstimatedValueAdd: number;
  moneyRoomsPercent: number;       // Kitchen + Bathroom as % of total budget
  moneyRoomsHealthy: boolean;      // true if 40-70%
  highestROIZone: string;
  lowestROIZone: string;
}

/**
 * Aggregates rehab costs by renovation zone and applies industry ROI benchmarks.
 * Falls back to keyword matching on description when renovationZone is not set.
 */
export function computeRenovationROI(
  costs: Array<{ description: string; amount: number; renovationZone?: string; status?: string; approved?: boolean }>,
  projectedRehabCost?: number
): RenovationROIResult {
  const zoneMap: Record<string, { total: number; count: number }> = {
    'Kitchen': { total: 0, count: 0 },
    'Bathroom': { total: 0, count: 0 },
    'Curb Appeal': { total: 0, count: 0 },
    'Interior': { total: 0, count: 0 },
    'Structural': { total: 0, count: 0 },
  };

  // Keyword-based zone inference when renovationZone is not explicitly set
  const inferZone = (desc: string): string => {
    const d = desc.toLowerCase();
    if (d.includes('kitchen') || d.includes('cabinet') || d.includes('countertop') || d.includes('appliance') || d.includes('backsplash')) return 'Kitchen';
    if (d.includes('bathroom') || d.includes('bath') || d.includes('vanity') || d.includes('tile') || d.includes('shower') || d.includes('tub')) return 'Bathroom';
    if (d.includes('curb') || d.includes('landscap') || d.includes('front door') || d.includes('exterior paint') || d.includes('porch') || d.includes('siding') || d.includes('driveway')) return 'Curb Appeal';
    if (d.includes('foundation') || d.includes('roof') || d.includes('hvac') || d.includes('electrical') || d.includes('plumbing') || d.includes('structural') || d.includes('framing')) return 'Structural';
    return 'Interior'; // Default: flooring, paint, trim, lighting, doors
  };

  const approvedCosts = costs.filter(c => c.status === 'Approved' || c.approved || (!c.status && !('approved' in c)));

  for (const c of approvedCosts) {
    const zone = c.renovationZone || inferZone(c.description);
    if (zoneMap[zone]) {
      zoneMap[zone].total += c.amount;
      zoneMap[zone].count += 1;
    } else {
      zoneMap['Interior'].total += c.amount;
      zoneMap['Interior'].count += 1;
    }
  }

  const totalRehabCost = Object.values(zoneMap).reduce((sum, z) => sum + z.total, 0) || projectedRehabCost || 0;
  const budget = totalRehabCost > 0 ? totalRehabCost : 1; // prevent div/0

  const zones: ZoneROIBreakdown[] = Object.entries(zoneMap)
    .map(([zone, data]) => {
      const benchmark = ZONE_ROI_BENCHMARKS[zone] ?? 0.5;
      const estimatedValueAdd = Math.round(data.total * benchmark);
      const roi = data.total > 0 ? Math.round((estimatedValueAdd / data.total) * 100) : 0;
      return {
        zone,
        totalCost: data.total,
        estimatedValueAdd,
        roi,
        budgetPercent: Math.round((data.total / budget) * 100),
        itemCount: data.count,
      };
    })
    .sort((a, b) => b.totalCost - a.totalCost); // Sort by value, not alphabetically

  const totalEstimatedValueAdd = zones.reduce((sum, z) => sum + z.estimatedValueAdd, 0);

  const kitchenCost = zoneMap['Kitchen'].total;
  const bathCost = zoneMap['Bathroom'].total;
  const moneyRoomsPercent = budget > 0 ? Math.round(((kitchenCost + bathCost) / budget) * 100) : 0;

  const nonEmptyZones = zones.filter(z => z.totalCost > 0);
  const highestROIZone = nonEmptyZones.length > 0
    ? nonEmptyZones.reduce((best, z) => z.roi > best.roi ? z : best).zone
    : 'Kitchen';
  const lowestROIZone = nonEmptyZones.length > 0
    ? nonEmptyZones.reduce((worst, z) => z.roi < worst.roi ? z : worst).zone
    : 'Structural';

  return {
    zones,
    totalRehabCost: totalRehabCost,
    totalEstimatedValueAdd,
    moneyRoomsPercent,
    moneyRoomsHealthy: moneyRoomsPercent >= 40 && moneyRoomsPercent <= 70,
    highestROIZone,
    lowestROIZone,
  };
}

// ── Over-Improvement Risk Assessment ──────────────────────────────────────────

export interface OverImprovementRisk {
  riskLevel: 'low' | 'moderate' | 'high';
  rehabToARVPercent: number;        // Total rehab as % of ARV
  explanation: string;
  dominantZone: string | null;      // Zone consuming > 40% of budget (if any)
  dominantZonePercent: number;
}

/**
 * Flags over-improvement risk.
 * Rule: Total rehab > 30% of ARV = high risk. 20-30% = moderate. < 20% = low.
 * Also flags when any single zone consumes > 40% of the total budget.
 */
export function computeOverImprovementRisk(
  totalRehabCost: number,
  arv: number,
  zones: ZoneROIBreakdown[]
): OverImprovementRisk {
  const rehabToARVPercent = arv > 0 ? Math.round((totalRehabCost / arv) * 100) : 0;

  // Find dominant zone (any zone > 40% of total budget)
  const dominant = zones.find(z => z.budgetPercent > 40);

  let riskLevel: 'low' | 'moderate' | 'high';
  let explanation: string;

  if (rehabToARVPercent > 30) {
    riskLevel = 'high';
    explanation = `Your renovation spend is ${rehabToARVPercent}% of ARV — exceeding the 30% threshold. You are over-improving. Every dollar past 30% has diminishing returns at resale.`;
  } else if (rehabToARVPercent > 20) {
    riskLevel = 'moderate';
    explanation = `Your renovation spend is ${rehabToARVPercent}% of ARV — approaching the 30% ceiling. Monitor closely and cut non-essential upgrades.`;
  } else {
    riskLevel = 'low';
    explanation = `Your renovation spend is ${rehabToARVPercent}% of ARV — well within safe limits. Budget allocation is healthy.`;
  }

  if (dominant && dominant.zone !== 'Kitchen') {
    // Kitchen can legitimately dominate. Other zones shouldn't.
    explanation += ` ⚠️ ${dominant.zone} is consuming ${dominant.budgetPercent}% of your total budget — consider redistributing to higher-ROI zones.`;
    if (riskLevel === 'low') riskLevel = 'moderate';
  }

  return {
    riskLevel,
    rehabToARVPercent,
    explanation,
    dominantZone: dominant?.zone ?? null,
    dominantZonePercent: dominant?.budgetPercent ?? 0,
  };
}

// ── Critical Path Method Engine ───────────────────────────────────────────────

/**
 * computeCriticalPath
 *
 * Implements the Critical Path Method (CPM) for rehab scheduling.
 * Identifies the longest chain of dependent tasks — any delay on this path
 * directly delays the entire project completion.
 *
 * Uses forward-pass (earliest start/finish) and backward-pass (latest start/finish)
 * to compute float. Tasks with zero float are on the critical path.
 */
export interface CriticalPathResult {
  criticalPathIds: string[];
  criticalPathDuration: number;   // Total days for the longest chain
  totalProjectDuration: number;   // Earliest possible completion (days from start)
  taskMetrics: Map<string, {
    earliestStart: number;
    earliestFinish: number;
    latestStart: number;
    latestFinish: number;
    float: number;
    isCritical: boolean;
  }>;
}

export function computeCriticalPath(tasks: RehabScheduleTask[]): CriticalPathResult {
  if (tasks.length === 0) {
    return { criticalPathIds: [], criticalPathDuration: 0, totalProjectDuration: 0, taskMetrics: new Map() };
  }

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const metrics = new Map<string, { earliestStart: number; earliestFinish: number; latestStart: number; latestFinish: number; float: number; isCritical: boolean }>();

  // Forward pass — compute earliest start and finish
  const computeES = (taskId: string, visited: Set<string>): number => {
    if (visited.has(taskId)) return metrics.get(taskId)?.earliestFinish ?? 0;
    visited.add(taskId);

    const task = taskMap.get(taskId);
    if (!task) return 0;

    let es = task.startDay;
    for (const depId of task.dependsOn) {
      const depFinish = computeES(depId, visited);
      es = Math.max(es, depFinish);
    }
    const ef = es + task.durationDays;
    metrics.set(taskId, { earliestStart: es, earliestFinish: ef, latestStart: 0, latestFinish: 0, float: 0, isCritical: false });
    return ef;
  };

  const visited = new Set<string>();
  let projectDuration = 0;
  for (const task of tasks) {
    const ef = computeES(task.id, visited);
    projectDuration = Math.max(projectDuration, ef);
  }

  // Backward pass — compute latest start and finish
  // Build reverse dependency map
  const dependents = new Map<string, string[]>();
  for (const task of tasks) {
    for (const depId of task.dependsOn) {
      if (!dependents.has(depId)) dependents.set(depId, []);
      dependents.get(depId)!.push(task.id);
    }
  }

  const computeLS = (taskId: string, visitedBack: Set<string>): void => {
    if (visitedBack.has(taskId)) return;
    visitedBack.add(taskId);

    const m = metrics.get(taskId);
    if (!m) return;

    const deps = dependents.get(taskId) || [];
    if (deps.length === 0) {
      // Terminal task — latest finish is project duration
      m.latestFinish = projectDuration;
    } else {
      // Latest finish = earliest latestStart of all dependents
      for (const depId of deps) {
        computeLS(depId, visitedBack);
      }
      m.latestFinish = Math.min(...deps.map(d => metrics.get(d)?.latestStart ?? projectDuration));
    }
    m.latestStart = m.latestFinish - (taskMap.get(taskId)?.durationDays ?? 0);
    m.float = m.latestStart - m.earliestStart;
    m.isCritical = m.float === 0;
  };

  const visitedBack = new Set<string>();
  for (const task of tasks) {
    computeLS(task.id, visitedBack);
  }

  // Collect critical path IDs
  const criticalPathIds = tasks
    .filter(t => metrics.get(t.id)?.isCritical)
    .sort((a, b) => (metrics.get(a.id)?.earliestStart ?? 0) - (metrics.get(b.id)?.earliestStart ?? 0))
    .map(t => t.id);

  const criticalPathDuration = criticalPathIds.reduce((sum, id) => sum + (taskMap.get(id)?.durationDays ?? 0), 0);

  return { criticalPathIds, criticalPathDuration, totalProjectDuration: projectDuration, taskMetrics: metrics };
}


// ── Rehab Stage Progress Engine ───────────────────────────────────────────────

/**
 * computeRehabStageProgress
 *
 * Maps rehab tasks into the 3-stage renovation timeline:
 * 1. Pre-Construction (Planning & Permits) — 1-2 weeks typical
 * 2. Active Renovation (Structural & Mechanical) — 2-4 weeks typical
 * 3. Punch List (Finishes & Staging) — 3-5 weeks typical
 *
 * Each stage reports completion %, task count, days elapsed, and whether
 * the stage is the currently active one.
 */
export interface StageProgress {
  stage: RehabStage;
  label: string;
  estimatedWeeks: string;          // e.g. "1–2 weeks"
  totalTasks: number;
  completedTasks: number;
  percentComplete: number;         // 0–100
  isActive: boolean;
  isComplete: boolean;
  inspectionsRequired: number;
  inspectionsCleared: number;
}

export interface RehabStageProgressResult {
  stages: StageProgress[];
  currentStage: RehabStage | null;
  overallPercent: number;          // 0–100
  daysElapsed: number;
  estimatedDaysRemaining: number;
  isOnSchedule: boolean;
  timelineBufferDays: number;      // 15-20% buffer recommendation
}

const STAGE_META: { stage: RehabStage; label: string; weeks: string }[] = [
  { stage: 'Pre-Construction', label: 'Planning & Permits', weeks: '1–2 weeks' },
  { stage: 'Active Renovation', label: 'Structural & Mechanical', weeks: '2–4 weeks' },
  { stage: 'Punch List', label: 'Finishes & Staging', weeks: '3–5 weeks' },
];

export function computeRehabStageProgress(
  tasks: RehabScheduleTask[],
  acquisitionDate?: Date | null,
  estimatedTimelineDays?: number
): RehabStageProgressResult {
  const now = new Date();
  const acqDate = acquisitionDate ? new Date(acquisitionDate) : now;
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - acqDate.getTime()) / (1000 * 60 * 60 * 24)));

  const stages: StageProgress[] = STAGE_META.map(meta => {
    const stageTasks = tasks.filter(t => t.phase === meta.stage);
    const completed = stageTasks.filter(t => t.status === 'Complete').length;
    const total = stageTasks.length;
    const inspectionsRequired = stageTasks.filter(t => t.inspectionRequired).length;
    const inspectionsCleared = stageTasks.filter(t => t.inspectionRequired && t.status === 'Complete').length;
    const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      stage: meta.stage,
      label: meta.label,
      estimatedWeeks: meta.weeks,
      totalTasks: total,
      completedTasks: completed,
      percentComplete,
      isActive: false,
      isComplete: percentComplete === 100 && total > 0,
      inspectionsRequired,
      inspectionsCleared,
    };
  });

  // Determine current stage (first incomplete stage)
  let currentStage: RehabStage | null = null;
  for (const s of stages) {
    if (!s.isComplete) {
      s.isActive = true;
      currentStage = s.stage;
      break;
    }
  }
  // If all complete, no active stage
  if (stages.every(s => s.isComplete)) currentStage = null;

  const totalTasks = tasks.length;
  const totalCompleted = tasks.filter(t => t.status === 'Complete').length;
  const overallPercent = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const timeline = estimatedTimelineDays || 90; // Default 90-day hold
  const estimatedDaysRemaining = Math.max(0, timeline - daysElapsed);
  const bufferDays = Math.round(timeline * 0.175); // 17.5% buffer (midpoint of 15-20%)
  const isOnSchedule = daysElapsed <= timeline;

  return {
    stages,
    currentStage,
    overallPercent,
    daysElapsed,
    estimatedDaysRemaining,
    isOnSchedule,
    timelineBufferDays: bufferDays,
  };
}


// ── Yesterday's Cost Engine ───────────────────────────────────────────────────

/**
 * computeYesterdayCost
 *
 * "What did yesterday cost this account?"
 * Combines daily holding burn rate with any approved expenses from yesterday.
 * This gives the operator both macro (cumulative) and incremental (daily) cost visibility.
 */
export interface YesterdayCostResult {
  yesterdayHoldingCost: number;     // Daily burn rate component
  yesterdayApprovedSpend: number;   // Expenses approved/logged yesterday
  yesterdayTotalCost: number;       // Sum of both
  cumulativeHoldingCost: number;    // Total holding costs to date
  cumulativeRehabSpend: number;     // Total rehab spend to date
  cumulativeTotalCost: number;      // Grand total project cost to date
  projectedTotalCost: number;       // At current burn rate through estimated timeline
  daysElapsed: number;
  daysRemaining: number;
  isOverBudget: boolean;
  budgetUtilization: number;        // 0–100 % of total project budget used
}

export function computeYesterdayCost(
  burnRate: BurnRateBreakdown,
  costs: { amount: number; createdAt?: Date | string; status?: string }[],
  acquisitionDate?: Date | null,
  estimatedTimelineDays?: number,
  totalProjectBudget?: number
): YesterdayCostResult {
  const now = new Date();
  const acqDate = acquisitionDate ? new Date(acquisitionDate) : now;
  const daysElapsed = Math.max(1, Math.floor((now.getTime() - acqDate.getTime()) / (1000 * 60 * 60 * 24)));
  const timeline = estimatedTimelineDays || 90;
  const daysRemaining = Math.max(0, timeline - daysElapsed);

  // Yesterday's holding cost = daily burn rate
  const yesterdayHoldingCost = burnRate.dailyBurnRate;

  // Yesterday's approved spend — expenses created/approved in the last 24 hours
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayApprovedSpend = costs
    .filter(c => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      return d >= yesterday && d < now && (c.status === 'Approved' || !c.status);
    })
    .reduce((sum, c) => sum + c.amount, 0);

  const yesterdayTotalCost = yesterdayHoldingCost + yesterdayApprovedSpend;

  // Cumulative costs
  const cumulativeHoldingCost = Math.round(burnRate.dailyBurnRate * daysElapsed);
  const cumulativeRehabSpend = costs
    .filter(c => c.status === 'Approved' || !c.status)
    .reduce((sum, c) => sum + c.amount, 0);
  const cumulativeTotalCost = cumulativeHoldingCost + cumulativeRehabSpend;

  // Projected total at current rate
  const projectedTotalCost = cumulativeRehabSpend + Math.round(burnRate.dailyBurnRate * timeline);

  const budget = totalProjectBudget || (cumulativeTotalCost * 1.2); // Fallback: assume 20% headroom
  const budgetUtilization = budget > 0 ? Math.round((cumulativeTotalCost / budget) * 100) : 0;
  const isOverBudget = budgetUtilization > 100;

  return {
    yesterdayHoldingCost: Math.round(yesterdayHoldingCost * 100) / 100,
    yesterdayApprovedSpend,
    yesterdayTotalCost: Math.round(yesterdayTotalCost * 100) / 100,
    cumulativeHoldingCost,
    cumulativeRehabSpend,
    cumulativeTotalCost,
    projectedTotalCost,
    daysElapsed,
    daysRemaining,
    isOverBudget,
    budgetUtilization: Math.min(budgetUtilization, 999), // Cap display at 999%
  };
}

// ── R0 — Dual-Scope Metrics Engine ────────────────────────────────────────────

import type { InvestorMetrics, DualScopeMetrics } from '@/types/schema';

/**
 * Scales asset-level metrics by the owner's ownership percentage.
 * Property-level ratios (capRate, DSCR, LTV) pass through unchanged.
 * Cash-flow and profit metrics are multiplied by ownership fraction.
 * CoC Return and ROI use ownerCashInvested as the denominator.
 */
export function computeInvestorMetrics(
  assetMetrics: DerivedMetrics,
  ownershipPercentage: number,     // 0-100, default 100
  ownerCashInvested?: number,      // Actual cash the owner put in
  netProfit?: number,              // For flip deals — total net profit
  propertyValue?: number           // Current property value for equity calc
): InvestorMetrics {
  const fraction = Math.max(0, Math.min(ownershipPercentage, 100)) / 100;

  // Use ownerCashInvested if provided, otherwise scale totalCashInvested by ownership
  const effectiveOwnerCash = ownerCashInvested ?? (assetMetrics.totalCashInvested * fraction);

  const investorNOI = assetMetrics.noi * fraction;
  const investorAnnualCashFlow = assetMetrics.annualCashFlow * fraction;
  const investorMonthlyCashFlow = assetMetrics.monthlyCashFlow * fraction;
  const investorNetProfit = (netProfit ?? 0) * fraction;
  const investorEquityValue = (propertyValue ?? 0) * fraction;

  // CoC Return uses investor's actual cash, not total property cash
  const investorCoCReturn = effectiveOwnerCash > 0
    ? (investorAnnualCashFlow / effectiveOwnerCash) * 100
    : null;

  // ROI uses investor's actual cash
  const investorROI = effectiveOwnerCash > 0
    ? (investorNetProfit / effectiveOwnerCash) * 100
    : 0;

  return {
    ownershipPercentage,
    ownerCashInvested: effectiveOwnerCash,
    investorNOI,
    investorAnnualCashFlow,
    investorMonthlyCashFlow,
    investorCapRate: assetMetrics.capRate,       // Property-level — unchanged
    investorCoCReturn,
    investorNetProfit,
    investorROI,
    investorEquityValue,
  };
}

/**
 * Wraps deriveAllMetrics + computeInvestorMetrics to return both
 * asset-level and investor-scaled metrics in a single call.
 *
 * Backward-compatible: when ownershipPercentage is 100 (default),
 * investor metrics will match asset metrics exactly.
 */
export function deriveDualScopeMetrics(
  financials: ProjectFinancials,
  currentPropertyValue?: number,
  dispositionType?: string,
  currentPhase?: number,
  createdAt?: Date | string | null
): DualScopeMetrics {
  const assetMetrics = deriveAllMetrics(
    financials,
    currentPropertyValue,
    dispositionType,
    currentPhase,
    createdAt
  );

  const ownershipPct = financials.ownershipPercentage ?? 100;
  const propertyValue = currentPropertyValue ?? financials.estimatedARV ?? financials.purchasePrice ?? 0;

  // Net profit for flip deals: ARV - allInCost
  const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? 0;
  const rehabCost = financials.rehabActual ?? financials.rehabBudget ?? 0;
  const closingCosts = financials.closingCosts ?? 0;
  const sellingCosts = financials.sellingCosts ?? 0;
  const allInCost = purchasePrice + rehabCost + closingCosts;
  const salePrice = financials.actualSalePrice ?? financials.estimatedARV ?? 0;
  const netProfit = salePrice > 0 ? salePrice - allInCost - sellingCosts : 0;

  const investorMetrics = computeInvestorMetrics(
    assetMetrics,
    ownershipPct,
    financials.ownerCashInvested,
    netProfit,
    propertyValue
  );

  return {
    asset: assetMetrics,
    investor: investorMetrics,
  };
}

/**
 * Occupancy Rate by Days: ((Total Days − Vacant Days) ÷ Total Days) × 100
 * Use this variant when tracking by calendar days rather than unit count.
 *
 * @param vacantDays Number of days units were vacant in the period.
 * @param totalDays  Total days in the period (default 365 for trailing 12 months).
 * @returns Occupancy rate as a percentage (e.g. 92.0), or 0 if totalDays is zero.
 */
export function computeOccupancyRateByDays(
  vacantDays: number,
  totalDays = 365
): number {
  if (totalDays <= 0) return 0;
  const clampedVacant = Math.max(0, Math.min(vacantDays, totalDays));
  const daysOccupied = totalDays - clampedVacant;
  return Math.round(((daysOccupied / totalDays) * 100) * 100) / 100; // 2 decimal places
}

export interface ActiveProjectMetrics {
  purchasePrice: number;
  renovationCosts: number;
  closingCostsBuy: number;
  closingCostsSell: number;
  holdingCosts: number;
  salePrice: number;
  netProfit: number;
  roi: number;
  annualizedIrr: number;
  holdDays: number;
  totalInvestment: number;
}

export function deriveAllProjectMetrics(
  project: Project,
  whatIfOffsetMonths = 0,
  ledgerItems: LedgerItem[] = []
): ActiveProjectMetrics {
  const financials = project.financials || {};
  const purchasePrice = financials.purchasePrice || 0;

  // 1. Renovation Costs (sum of all approved ledger entries from sub-collection)
  let renovationCosts = 0;
  if (ledgerItems.length > 0) {
    ledgerItems.forEach(item => {
      if (item.status === 'Approved') {
        renovationCosts += item.amount;
      }
    });
  } else if (financials.costs) {
    financials.costs.forEach(c => {
      if (c.approved) renovationCosts += c.amount;
    });
  }

  const inspectionsCost = financials.inspections?.reduce((acc, curr) => acc + (curr.actualCost || 0), 0) || 0;
  renovationCosts += inspectionsCost;

  // 2. Capital Costs (Closing Costs Buy — origination points)
  const points = (financials.loanOriginationPoints || 0) / 100;
  const loanAmount = financials.loanAmount || (purchasePrice + renovationCosts);
  const closingCostsBuy = loanAmount * points;

  // 3. Hold Days & Holding Costs
  const now = new Date();
  const soldDate = parseDate(financials.soldDate);
  const createdDate = parseDate(project.createdAt) || now;

  let holdDays = financials.estimatedTimelineDays || 90;
  if (soldDate) {
    const ms = soldDate.getTime() - createdDate.getTime();
    holdDays = Math.max(1, ms / (1000 * 60 * 60 * 24));
  } else {
    const ms = now.getTime() - createdDate.getTime();
    const elapsed = ms / (1000 * 60 * 60 * 24);
    holdDays = Math.max(holdDays, elapsed);
  }

  const adjustedHoldDays = Math.max(0, holdDays + whatIfOffsetMonths * 30);

  // Use daily burn rate from computeDailyBurnRate
  const burnRateBreakdown = computeDailyBurnRate(financials);
  const holdingCosts = Math.round(burnRateBreakdown.dailyBurnRate * adjustedHoldDays * 100) / 100;

  // 4. Sale Price
  const salePrice = financials.actualSalePrice || financials.estimatedARV || 0;

  // 5. Closing Costs Sell (agent commissions + final closing costs + exit ledger)
  const buyerPercent = financials.buyersAgentCommission || 0;
  const sellerPercent = financials.sellersAgentCommission || 0;
  const agentCommissions = salePrice * ((buyerPercent + sellerPercent) / 100);
  const finalClosingCosts = financials.finalClosingCosts || 0;

  let ledgerExitCosts = 0;
  project.exitCosts?.forEach(ec => {
    if (ec.isPercentage && ec.percentageRate) {
      ledgerExitCosts += (ec.percentageRate / 100) * salePrice;
    } else {
      ledgerExitCosts += ec.amount;
    }
  });

  const closingCostsSell = agentCommissions + finalClosingCosts + ledgerExitCosts;

  // 6. Net Profit & Investment
  const totalInvestment = purchasePrice + closingCostsBuy + closingCostsSell + renovationCosts + holdingCosts;
  const netProfit = salePrice - totalInvestment;

  const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;

  // 7. Annualized IRR (Newton-Raphson cash flow solver)
  const holdMonths = financials.projectedHoldTimeMonths ?? 60;
  const holdYears = Math.max(1, Math.round(holdMonths / 12));
  const appreciation = financials.annualAppreciationPercent ?? 3;
  const totalCashInvested = computeTotalCashInvested(financials);

  let annualizedIrr = 0;
  if (totalCashInvested > 0) {
    const noi = computeNOI(financials, project.dispositionType, project.currentPhase);
    const loanRate = financials.loanInterestRate ?? 0;
    const loanTermYears = financials.loanTermYears ?? 30;
    const annualDS = computeAnnualDebtService(loanAmount, loanRate, loanTermYears * 12);
    const { annual: annualCashFlow } = computeCashFlow(noi, annualDS);

    const cashFlows = buildIRRCashFlows(
      totalCashInvested,
      annualCashFlow,
      holdYears,
      purchasePrice,
      appreciation,
      loanAmount,
      loanRate,
      loanTermYears
    );

    const irr = computeIRR(cashFlows);
    if (irr !== null) {
      annualizedIrr = irr * 100;
    } else {
      // Fallback to linear if Newton-Raphson does not converge
      annualizedIrr = holdDays > 0 ? roi * (365 / holdDays) : 0;
    }
  }

  return {
    purchasePrice,
    renovationCosts,
    closingCostsBuy,
    closingCostsSell,
    holdingCosts,
    salePrice,
    netProfit,
    roi: Math.round(roi * 100) / 100,
    annualizedIrr: Math.round(annualizedIrr * 100) / 100,
    holdDays: Math.round(holdDays),
    totalInvestment,
  };
}

/**
 * Debt Yield: NOI / Loan Amount * 100
 */
export function computeDebtYield(noi: number, loanAmount: number): number | null {
  if (loanAmount <= 0) return null;
  return Math.round((noi / loanAmount) * 100 * 100) / 100;
}

/**
 * Equity Multiple: (Cumulative Cash Flow + Exit Value) / Total Cash Invested
 */
export function computeEquityMultiple(
  totalCashInvested: number,
  annualCashFlow: number,
  propertyValue: number,
  holdingYears: number = 10
): number | null {
  if (totalCashInvested <= 0) return null;
  const totalReturn = (annualCashFlow * holdingYears) + propertyValue;
  return Math.round((totalReturn / totalCashInvested) * 100) / 100;
}

/**
 * Payback Period: Total Cash Invested / Annual Cash Flow
 */
export function computePaybackPeriod(
  totalCashInvested: number,
  annualCashFlow: number
): number | null {
  if (totalCashInvested <= 0 || annualCashFlow <= 0) return null;
  return Math.round((totalCashInvested / annualCashFlow) * 100) / 100;
}

export interface SolverCriteria {
  cashFlow?: { enabled: boolean; value: number };
  coc?: { enabled: boolean; value: number };
  capRate?: { enabled: boolean; value: number };
  dscr?: { enabled: boolean; value: number };
  netProfit?: { enabled: boolean; value: number };
  cashNeeded?: { enabled: boolean; value: number };
}

export function solveOfferPrice(
  financials: ProjectFinancials,
  dispositionType: string,
  criteria: SolverCriteria,
  customPeriods: number[] = [30, 90, 180, 270]
) {
  // Helper to evaluate derived metrics for a given price
  const getMetricsForPrice = (price: number) => {
    const pp = price;
    let la = financials.loanAmount || 0;
    if (financials.financingType === 'Financed') {
      const dp = financials.downPaymentPercent || 25;
      la = pp * (1 - dp / 100);
    }

    const norm: ProjectFinancials = {
      ...financials,
      purchasePrice: pp,
      loanAmount: la,
    };

    return deriveAllMetrics(
      norm,
      norm.estimatedARV || undefined,
      dispositionType,
      1,
      null,
      customPeriods
    );
  };

  const targets: {
    key: keyof SolverCriteria;
    label: string;
    checkFn: (m: DerivedMetrics) => boolean;
    targetVal: number;
    isHigherBetter: boolean;
    getComputed: (m: DerivedMetrics) => number;
  }[] = [];

  if (criteria.cashFlow?.enabled) {
    targets.push({
      key: 'cashFlow',
      label: 'Min Monthly Cash Flow',
      checkFn: (m) => m.monthlyCashFlow >= (criteria.cashFlow?.value || 0),
      targetVal: criteria.cashFlow.value,
      isHigherBetter: true,
      getComputed: (m) => m.monthlyCashFlow,
    });
  }
  if (criteria.coc?.enabled) {
    targets.push({
      key: 'coc',
      label: 'Min Cash-on-Cash Return',
      checkFn: (m) => m.cashOnCashReturn !== null && m.cashOnCashReturn >= (criteria.coc?.value || 0),
      targetVal: criteria.coc.value,
      isHigherBetter: true,
      getComputed: (m) => m.cashOnCashReturn ?? 0,
    });
  }
  if (criteria.capRate?.enabled) {
    targets.push({
      key: 'capRate',
      label: 'Min Cap Rate',
      checkFn: (m) => m.capRate !== null && m.capRate >= (criteria.capRate?.value || 0),
      targetVal: criteria.capRate.value,
      isHigherBetter: true,
      getComputed: (m) => m.capRate ?? 0,
    });
  }
  if (criteria.dscr?.enabled) {
    targets.push({
      key: 'dscr',
      label: 'Min DSCR',
      checkFn: (m) => m.dscr >= (criteria.dscr?.value || 0),
      targetVal: criteria.dscr.value,
      isHigherBetter: true,
      getComputed: (m) => m.dscr,
    });
  }
  if (criteria.netProfit?.enabled && dispositionType === 'SALE') {
    targets.push({
      key: 'netProfit',
      label: 'Min Net Profit',
      checkFn: (m) => {
        const sp = m.projections?.saleProjections?.find((p: any) => p.days === 90);
        return sp ? sp.netProfit >= (criteria.netProfit?.value || 0) : false;
      },
      targetVal: criteria.netProfit.value,
      isHigherBetter: true,
      getComputed: (m) => {
        const sp = m.projections?.saleProjections?.find((p: any) => p.days === 90);
        return sp ? sp.netProfit : 0;
      },
    });
  }
  if (criteria.cashNeeded?.enabled) {
    targets.push({
      key: 'cashNeeded',
      label: 'Max Cash Needed',
      checkFn: (m) => m.totalCashInvested <= (criteria.cashNeeded?.value || 0),
      targetVal: criteria.cashNeeded.value,
      isHigherBetter: false,
      getComputed: (m) => m.totalCashInvested,
    });
  }

  if (targets.length === 0) return null;

  const results: { key: keyof SolverCriteria; label: string; maxPrice: number | null; achievedAtMin: number }[] = [];
  const minPrice = 1000;
  const maxPrice = 10000000;
  const metricsAtMin = getMetricsForPrice(minPrice);

  for (const t of targets) {
    const computedAtMin = t.getComputed(metricsAtMin);
    if (!t.checkFn(metricsAtMin)) {
      results.push({ key: t.key, label: t.label, maxPrice: null, achievedAtMin: computedAtMin });
      continue;
    }

    const metricsAtMax = getMetricsForPrice(maxPrice);
    if (t.checkFn(metricsAtMax)) {
      results.push({ key: t.key, label: t.label, maxPrice: maxPrice, achievedAtMin: computedAtMin });
      continue;
    }

    let low = minPrice;
    let high = maxPrice;
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2;
      if (t.checkFn(getMetricsForPrice(mid))) {
        low = mid;
      } else {
        high = mid;
      }
    }
    results.push({ key: t.key, label: t.label, maxPrice: low, achievedAtMin: computedAtMin });
  }

  const offenders = results.filter((r) => r.maxPrice === null);
  if (offenders.length > 0) {
    return {
      feasible: false,
      offenders: offenders.map((o) => ({
        key: o.key,
        label: o.label,
        feasibleVal: o.achievedAtMin,
      })),
    };
  }

  const solvedPrice = Math.min(...results.map((r) => r.maxPrice as number));

  let limiting = results[0];
  let minDiff = Infinity;
  for (const r of results) {
    const diff = Math.abs((r.maxPrice as number) - solvedPrice);
    if (diff < minDiff) {
      minDiff = diff;
      limiting = r;
    }
  }

  const metricsAtSolved = getMetricsForPrice(solvedPrice);
  const margins = targets.map((t) => {
    const computed = t.getComputed(metricsAtSolved);
    const diff = t.isHigherBetter ? (computed - t.targetVal) : (t.targetVal - computed);
    return {
      key: t.key,
      label: t.label,
      computed,
      target: t.targetVal,
      margin: diff,
      satisfied: diff >= -1e-5,
    };
  });

  return {
    feasible: true,
    solvedPrice,
    limitingCriterion: limiting.label,
    margins,
  };
}


