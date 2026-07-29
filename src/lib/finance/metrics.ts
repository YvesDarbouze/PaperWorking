/**
 * Shared Real Estate Finance & Underwriting Metrics Engine
 * Single source of truth for pure financial metric calculations across PaperWorking.
 */

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

// ─── Pure Calculation Functions ──────────────────────────────

/**
 * Calculate Net Operating Income (NOI)
 * NOI = Gross Income - Operating Expenses
 */
export function calculateNOI(grossIncome: number, operatingExpenses: number): number {
  return grossIncome - operatingExpenses;
}

/**
 * Calculate Cap Rate (%)
 * Cap Rate = (NOI / Property Value or Purchase Price) * 100
 */
export function calculateCapRate(noi: number, propertyValue: number): number {
  if (propertyValue <= 0) return 0;
  return (noi / propertyValue) * 100;
}

/**
 * Calculate Cash-on-Cash Return (CoC %)
 * CoC = (Annual Cash Flow / Total Cash Invested) * 100
 */
export function calculateCoC(annualCashFlow: number, totalCashInvested: number): number {
  if (totalCashInvested <= 0) return 0;
  return (annualCashFlow / totalCashInvested) * 100;
}

/**
 * Calculate Debt Service Coverage Ratio (DSCR)
 * DSCR = NOI / Annual Debt Service
 */
export function calculateDSCR(noi: number, annualDebtService: number): number {
  if (annualDebtService <= 0) return 0;
  return noi / annualDebtService;
}

/**
 * Calculate Price Per Unit ($)
 */
export function calculatePricePerUnit(price: number, units: number): number {
  if (units <= 0) return 0;
  return price / units;
}

/**
 * Calculate Gross Rent Multiplier (GRM)
 * GRM = Price / Annual Gross Rent
 */
export function calculateGRM(price: number, grossAnnualRent: number): number {
  if (grossAnnualRent <= 0) return 0;
  return price / grossAnnualRent;
}

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
 * Calculate Internal Rate of Return (IRR %) using Newton-Raphson method
 * Returns rate as percentage (e.g. 14.5 for 14.5%)
 */
export function calculateIRR(cashFlows: number[], guess: number = 0.1): number {
  if (cashFlows.length < 2) return 0;
  let rate = guess;
  const maxIterations = 100;
  const precision = 0.00001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      if (isNaN(denom) || denom === 0) break;
      npv += cashFlows[t] / denom;
      dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dNpv) < 1e-10) break;
    const nextRate = rate - npv / dNpv;
    if (isNaN(nextRate) || !isFinite(nextRate)) break;
    if (Math.abs(nextRate - rate) < precision) {
      return nextRate * 100;
    }
    rate = nextRate;
  }

  return rate * 100;
}

/**
 * Calculate Equity Multiple (x)
 * Equity Multiple = Total Cash Returned / Total Cash Invested
 */
export function calculateEquityMultiple(totalCashReturned: number, totalCashInvested: number): number {
  if (totalCashInvested <= 0) return 0;
  return totalCashReturned / totalCashInvested;
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

// ─── Pro Forma & Sensitivity Engine ──────────────────────────

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
  const cashFlows: number[] = [-totalCashInvested];

  let currentGrossAnnualRent = monthlyGrossRent * 12;
  let currentAnnualExpenses = monthlyExpenses * 12;

  for (let y = 1; y <= holdingPeriodYears; y++) {
    const grossPotentialRent = currentGrossAnnualRent;
    const vacancyLoss = grossPotentialRent * (vacancyRate / 100);
    const effectiveGrossIncome = grossPotentialRent - vacancyLoss;
    const operatingExpenses = currentAnnualExpenses;
    const capexReserve = effectiveGrossIncome * (capexReservePct / 100);
    const noi = effectiveGrossIncome - operatingExpenses - capexReserve;
    const netCashFlow = noi - annualDebtService;

    const capRate = calculateCapRate(noi, purchasePrice);
    const coc = calculateCoC(netCashFlow, totalCashInvested);
    const dscr = calculateDSCR(noi, annualDebtService);

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

    // Advance growth rates for next year
    currentGrossAnnualRent *= 1 + rentGrowthRate / 100;
    currentAnnualExpenses *= 1 + expenseGrowthRate / 100;
  }

  // Terminal Year Exit
  const lastYearNoi = years[years.length - 1]?.noi ?? 0;
  const exitValue = exitCapRate > 0 ? (lastYearNoi / (exitCapRate / 100)) : 0;
  const sellingCosts = exitValue * 0.05; // 5% selling expenses
  const remainingLoanBalance = calculateRemainingLoanBalance(loanAmount, interestRate, amortizationYears, holdingPeriodYears);
  const netExitProceeds = Math.max(0, exitValue - sellingCosts - remainingLoanBalance);

  // Build cash flow series for IRR
  for (let i = 0; i < years.length; i++) {
    const isTerminal = i === years.length - 1;
    cashFlows.push(years[i].netCashFlow + (isTerminal ? netExitProceeds : 0));
  }

  const leveredIRR = calculateIRR(cashFlows);
  const totalCashReturned = years.reduce((sum, yr) => sum + yr.netCashFlow, 0) + netExitProceeds;
  const equityMultiple = calculateEquityMultiple(totalCashReturned, totalCashInvested);

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
    pricePerUnit: calculatePricePerUnit(purchasePrice, units),
    grm: calculateGRM(purchasePrice, year1.grossPotentialRent),
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
