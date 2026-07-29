/**
 * Shared Real Estate Finance & Underwriting Metrics Engine
 * Single source of truth for pure financial metric calculations across PaperWorking.
 * All metric calculations are routed through deriveAllProjectMetrics per Single-Function Rule.
 */

import { deriveAllProjectMetrics } from '@/lib/metrics/reiMetrics';
import type { Project } from '@/types/schema';

// ─── Interfaces ──────────────────────────────────────────────

export interface UnderwritingAssumptions {
  purchasePrice: number;
  rehabCost: number;
  monthlyGrossRent: number;
  monthlyExpenses: number;
  rentGrowthRate: number;      // e.g. 3.0 for 3.0%
  expenseGrowthRate: number;   // e.g. 2.5 for 2.5%
  vacancyRate: number;         // e.g. 5.0 for 5.0%
  capexReservePct: number;     // e.g. 5.0 for 5.0%
  loanAmount: number;
  interestRate: number;        // e.g. 6.5 for 6.5%
  amortizationYears: number;   // e.g. 30
  exitCapRate: number;         // e.g. 6.0 for 6.0%
  holdingPeriodYears: number;  // e.g. 5
  units?: number;
}

export interface ProFormaYear {
  year: number;
  grossPotentialRent: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  capexReserve: number;
  noi: number;
  debtService: number;
  netCashFlow: number;
  capRate: number;
  coc: number;
  dscr: number;
}

export interface SensitivityCell {
  rentGrowthRate: number;
  exitCapRate: number;
  leveredIRR: number;
  isBaseCase: boolean;
}

export interface UnderwritingScenario {
  id: string;
  name: string;
  isBase?: boolean;
  inputs: UnderwritingAssumptions;
  createdAt?: string;
}

export interface DealMetrics {
  askingPrice?: number;
  purchasePrice?: number;
  estimatedYield?: number;
  capRate?: number;
  cashOnCash?: number;
  noi?: number;
  dscr?: number;
  pricePerUnit?: number;
  grm?: number;
  irr?: number;
  equityMultiple?: number;
}

// ─── Shared Amortization Helpers ──────────────────────────────

/**
 * Calculate Monthly Mortgage Payment (P&I)
 */
export function calculateMonthlyPayment(
  principal: number,
  annualInterestRatePercent: number,
  amortizationYears: number
): number {
  if (principal <= 0 || amortizationYears <= 0) return 0;
  const monthlyRate = (annualInterestRatePercent / 100) / 12;
  const totalPayments = amortizationYears * 12;
  if (monthlyRate === 0) return principal / totalPayments;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
}

/**
 * Calculate remaining loan balance after Y years
 */
export function calculateRemainingLoanBalance(
  principal: number,
  annualInterestRatePercent: number,
  amortizationYears: number,
  elapsedYears: number
): number {
  if (principal <= 0 || amortizationYears <= 0) return 0;
  const monthlyRate = (annualInterestRatePercent / 100) / 12;
  const n = amortizationYears * 12;
  const p = elapsedYears * 12;
  if (p >= n) return 0;
  if (monthlyRate === 0) return Math.max(0, principal * (1 - p / n));
  const num = Math.pow(1 + monthlyRate, n) - Math.pow(1 + monthlyRate, p);
  const den = Math.pow(1 + monthlyRate, n) - 1;
  return Math.max(0, principal * (num / den));
}

// ─── Pro Forma & Sensitivity Consumer Layer ──────────────────

function assumptionsToProject(
  assumptions: UnderwritingAssumptions,
  overrides?: Partial<UnderwritingAssumptions>
): Project {
  const merged = { ...assumptions, ...overrides };
  return {
    id: 'underwriting-analysis',
    name: 'Underwriting Analysis',
    currentPhase: 1,
    dispositionType: 'RENT',
    financials: {
      purchasePrice: merged.purchasePrice,
      projectedRehabCost: merged.rehabCost,
      monthlyGrossRent: merged.monthlyGrossRent,
      monthlyExpenses: merged.monthlyExpenses,
      rentGrowthRate: merged.rentGrowthRate,
      expenseGrowthRate: merged.expenseGrowthRate,
      vacancyRate: merged.vacancyRate,
      capexReservePct: merged.capexReservePct,
      loanAmount: merged.loanAmount,
      loanInterestRate: merged.interestRate,
      loanTermYears: merged.amortizationYears,
      exitCapRate: merged.exitCapRate,
      projectedHoldTimeMonths: (merged.holdingPeriodYears || 5) * 12,
    },
  } as unknown as Project;
}

export function calculateProFormaAndMetrics(assumptions: UnderwritingAssumptions) {
  const {
    purchasePrice,
    rehabCost,
    monthlyGrossRent,
    monthlyExpenses,
    rentGrowthRate,
    expenseGrowthRate,
    vacancyRate,
    capexReservePct,
    loanAmount,
    interestRate,
    amortizationYears,
    exitCapRate,
    holdingPeriodYears = 5,
    units = 1,
  } = assumptions;

  const totalCashInvested = Math.max(0, purchasePrice + rehabCost - loanAmount);
  const monthlyPayment = calculateMonthlyPayment(loanAmount, interestRate, amortizationYears);
  const annualDebtService = monthlyPayment * 12;

  const years: ProFormaYear[] = [];
  let currentGrossAnnualRent = monthlyGrossRent * 12;
  let currentAnnualExpenses = monthlyExpenses * 12;

  for (let y = 1; y <= holdingPeriodYears; y++) {
    const grossPotentialRent = currentGrossAnnualRent;
    const vacancyLoss = grossPotentialRent * (vacancyRate / 100);
    const effectiveGrossIncome = grossPotentialRent - vacancyLoss;
    const operatingExpenses = currentAnnualExpenses;
    const capexReserve = effectiveGrossIncome * (capexReservePct / 100);

    const yearProject = assumptionsToProject({
      ...assumptions,
      monthlyGrossRent: currentGrossAnnualRent / 12,
      monthlyExpenses: currentAnnualExpenses / 12,
    });
    const derived = deriveAllProjectMetrics(yearProject);

    const noi = derived.noi;
    const netCashFlow = derived.annualCashFlow;
    const capRate = derived.capRate;
    const coc = derived.cashOnCashReturn;
    const dscr = derived.dscr;

    years.push({
      year: y,
      grossPotentialRent,
      vacancyLoss,
      effectiveGrossIncome,
      operatingExpenses,
      capexReserve,
      noi,
      debtService: annualDebtService,
      netCashFlow,
      capRate,
      coc,
      dscr,
    });

    currentGrossAnnualRent *= 1 + rentGrowthRate / 100;
    currentAnnualExpenses *= 1 + expenseGrowthRate / 100;
  }

  // Terminal Year Exit
  const lastYearNoi = years[years.length - 1]?.noi ?? 0;
  const exitValue = exitCapRate > 0 ? (lastYearNoi / (exitCapRate / 100)) : 0;
  const sellingCosts = exitValue * 0.05;
  const remainingLoanBalance = calculateRemainingLoanBalance(loanAmount, interestRate, amortizationYears, holdingPeriodYears);
  const netExitProceeds = Math.max(0, exitValue - sellingCosts - remainingLoanBalance);

  const baseProject = assumptionsToProject(assumptions);
  const baseDerived = deriveAllProjectMetrics(baseProject);

  const leveredIRR = baseDerived.irr || baseDerived.annualizedIrr;
  const totalCashReturned = years.reduce((sum, yr) => sum + yr.netCashFlow, 0) + netExitProceeds;
  const equityMultiple = baseDerived.kpi33?.equityMultiple || (totalCashInvested > 0 ? totalCashReturned / totalCashInvested : 0);

  const year1 = years[0] ?? {
    noi: 0,
    grossPotentialRent: monthlyGrossRent * 12,
    operatingExpenses: monthlyExpenses * 12,
    netCashFlow: 0,
    capRate: 0,
    coc: 0,
    dscr: 0,
  };

  const summaryMetrics: DealMetrics = {
    askingPrice: purchasePrice,
    purchasePrice,
    noi: year1.noi,
    capRate: year1.capRate,
    cashOnCash: year1.coc,
    dscr: year1.dscr,
    pricePerUnit: units > 0 ? purchasePrice / units : undefined,
    grm: baseDerived.grossRentMultiplier,
    irr: leveredIRR,
    equityMultiple,
  };

  return {
    totalCashInvested,
    annualDebtService,
    years,
    exitValue,
    sellingCosts,
    remainingLoanBalance,
    netExitProceeds,
    totalCashReturned,
    leveredIRR,
    equityMultiple,
    summaryMetrics,
  };
}

/**
 * Generate 5x5 Sensitivity Matrix for Rent Growth (%) x Exit Cap Rate (%)
 */
export function generateSensitivityMatrix(
  baseAssumptions: UnderwritingAssumptions,
  rentGrowthDeltas: number[] = [-2.0, -1.0, 0, 1.0, 2.0],
  exitCapDeltas: number[] = [-1.0, -0.5, 0, 0.5, 1.0]
): {
  rentGrowthSteps: number[];
  exitCapSteps: number[];
  matrix: SensitivityCell[][];
} {
  const rentGrowthSteps = rentGrowthDeltas.map(d => Number((baseAssumptions.rentGrowthRate + d).toFixed(2)));
  const exitCapSteps = exitCapDeltas.map(d => Number((baseAssumptions.exitCapRate + d).toFixed(2)));

  const matrix: SensitivityCell[][] = [];

  for (let r = 0; r < rentGrowthSteps.length; r++) {
    const row: SensitivityCell[] = [];
    const rg = rentGrowthSteps[r];

    for (let c = 0; c < exitCapSteps.length; c++) {
      const cap = exitCapSteps[c];
      const isBaseCase = r === Math.floor(rentGrowthSteps.length / 2) && c === Math.floor(exitCapSteps.length / 2);

      const run = calculateProFormaAndMetrics({
        ...baseAssumptions,
        rentGrowthRate: rg,
        exitCapRate: cap,
      });

      row.push({
        rentGrowthRate: rg,
        exitCapRate: cap,
        leveredIRR: run.leveredIRR,
        isBaseCase,
      });
    }
    matrix.push(row);
  }

  return {
    rentGrowthSteps,
    exitCapSteps,
    matrix,
  };
}

/**
 * Helper to generate default Base, Upside, and Downside scenarios
 */
export function generateDefaultScenarios(base: UnderwritingAssumptions): UnderwritingScenario[] {
  return [
    {
      id: 'base',
      name: 'Base Case',
      isBase: true,
      inputs: { ...base },
    },
    {
      id: 'upside',
      name: 'Upside Case',
      inputs: {
        ...base,
        rentGrowthRate: Number((base.rentGrowthRate + 2.0).toFixed(2)),
        vacancyRate: Math.max(1, Number((base.vacancyRate - 2.0).toFixed(2))),
        exitCapRate: Math.max(3, Number((base.exitCapRate - 0.5).toFixed(2))),
      },
    },
    {
      id: 'downside',
      name: 'Downside Case',
      inputs: {
        ...base,
        rentGrowthRate: Math.max(-5, Number((base.rentGrowthRate - 2.0).toFixed(2))),
        expenseGrowthRate: Number((base.expenseGrowthRate + 1.5).toFixed(2)),
        vacancyRate: Number((base.vacancyRate + 3.0).toFixed(2)),
        exitCapRate: Number((base.exitCapRate + 1.0).toFixed(2)),
      },
    },
  ];
}
