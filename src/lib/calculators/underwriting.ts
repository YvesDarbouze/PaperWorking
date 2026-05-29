/**
 * Underwriting Calculator — Pure Functions
 * All real-estate investment underwriting calculations.
 *
 * These functions are stateless and can be tested independently.
 */

// ─── Types ───────────────────────────────────────────────
export interface UnderwritingInputs {
  purchasePrice: number;
  arv: number;
  repairCosts: number;
  closingCostsPct: number;
  downPaymentPct: number;
  interestRate: number;
  amortizationYears: number;
  grossRentMonthly: number;
  vacancyRatePct: number;
  propertyTaxAnnual: number;
  insuranceAnnual: number;
  maintenancePct: number;
  managementPct: number;
}

export interface UnderwritingResults {
  // Intermediate values
  loanAmount: number;
  downPaymentAmount: number;
  closingCostsAmount: number;
  monthlyPayment: number;
  effectiveGrossIncome: number;
  totalOperatingExpenses: number;
  noi: number;
  annualDebtService: number;
  totalCashNeeded: number;

  // Key metrics
  monthlyCashFlow: number;
  annualCashFlow: number;
  capRate: number;
  cashOnCash: number;
  dscr: number;
}

export type HealthBand = 'good' | 'fair' | 'poor';

// ─── Core Calculations ───────────────────────────────────

/**
 * Calculate monthly mortgage payment using standard amortization formula:
 * P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calcMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Run all underwriting calculations from a set of inputs.
 */
export function calculateUnderwriting(
  inputs: UnderwritingInputs
): UnderwritingResults {
  const {
    purchasePrice,
    repairCosts,
    closingCostsPct,
    downPaymentPct,
    interestRate,
    amortizationYears,
    grossRentMonthly,
    vacancyRatePct,
    propertyTaxAnnual,
    insuranceAnnual,
    maintenancePct,
    managementPct,
  } = inputs;

  // Financing
  const downPaymentAmount = purchasePrice * (downPaymentPct / 100);
  const loanAmount = purchasePrice - downPaymentAmount;
  const closingCostsAmount = purchasePrice * (closingCostsPct / 100);
  const monthlyPayment = calcMonthlyPayment(
    loanAmount,
    interestRate,
    amortizationYears
  );
  const annualDebtService = monthlyPayment * 12;

  // Income
  const grossAnnualRent = grossRentMonthly * 12;
  const effectiveGrossIncome =
    grossAnnualRent * (1 - vacancyRatePct / 100);

  // Operating Expenses
  const maintenanceAmount = effectiveGrossIncome * (maintenancePct / 100);
  const managementAmount = effectiveGrossIncome * (managementPct / 100);
  const totalOperatingExpenses =
    propertyTaxAnnual +
    insuranceAnnual +
    maintenanceAmount +
    managementAmount;

  // NOI & Cash Flow
  const noi = effectiveGrossIncome - totalOperatingExpenses;
  const annualCashFlow = noi - annualDebtService;
  const monthlyCashFlow = annualCashFlow / 12;

  // Total Cash Needed
  const totalCashNeeded =
    downPaymentAmount + closingCostsAmount + repairCosts;

  // Key Metrics
  const capRate =
    purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
  const cashOnCash =
    totalCashNeeded > 0
      ? (annualCashFlow / totalCashNeeded) * 100
      : 0;
  const dscr =
    annualDebtService > 0 ? noi / annualDebtService : 0;

  return {
    loanAmount,
    downPaymentAmount,
    closingCostsAmount,
    monthlyPayment,
    effectiveGrossIncome,
    totalOperatingExpenses,
    noi,
    annualDebtService,
    totalCashNeeded,
    monthlyCashFlow,
    annualCashFlow,
    capRate,
    cashOnCash,
    dscr,
  };
}

// ─── Health Band Logic ───────────────────────────────────

export function getCashFlowHealth(monthlyCashFlow: number): HealthBand {
  if (monthlyCashFlow > 200) return 'good';
  if (monthlyCashFlow >= 0) return 'fair';
  return 'poor';
}

export function getCapRateHealth(capRate: number): HealthBand {
  if (capRate >= 6) return 'good';
  if (capRate >= 4) return 'fair';
  return 'poor';
}

export function getCashOnCashHealth(coc: number): HealthBand {
  if (coc >= 8) return 'good';
  if (coc >= 5) return 'fair';
  return 'poor';
}

export function getDscrHealth(dscr: number): HealthBand {
  if (dscr >= 1.25) return 'good';
  if (dscr >= 1.0) return 'fair';
  return 'poor';
}

// ─── Formatting Helpers ──────────────────────────────────

export function formatCurrency(value: number, decimals = 0): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return value < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parse a formatted currency string to a number.
 * Strips "$", ",", and whitespace before parsing.
 */
export function parseCurrencyInput(raw: string): number {
  const cleaned = raw.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
