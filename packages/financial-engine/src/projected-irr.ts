import { computeAmortizationSchedule } from './amortization-engine.js';

export interface ProjectedIrrAssumptions {
  /** Hold period in years. Default: 5 */
  holdPeriodYears?: number;
  /** Annual property appreciation rate in percent (basis for exit valuation). Default: 3.0 */
  annualAppreciationPct?: number;
  /** Alias for annualAppreciationPct. Default: 3.0 */
  appreciationPct?: number;
  /** Annual rent growth rate in percent. Default: 0.0 */
  rentGrowthPct?: number;
  /** Annual expense growth rate in percent. Default: 0.0 */
  expenseGrowthPct?: number;
  /** Selling costs percentage at exit (broker commissions, transfer taxes, legal). Default: 6.0 */
  sellingCostsPct?: number;
  /** Debt structure type: amortizing, interest_only, or arm. Default: 'amortizing' */
  loanType?: 'amortizing' | 'interest_only' | 'arm';
  /** Interest-only duration in years when loanType is interest_only. Default: 5 */
  ioPeriodYears?: number;
  /** Fixed rate period in years for ARM loans. Default: 5 */
  armFixedPeriodYears?: number;
  /** Assumed annual/lifetime adjustment percentage for ARM loans. Default: 2.0 */
  armAdjustmentPct?: number;
  /** W2-11: Lease-up and stabilization duration in months (0 = stabilized, default 0) */
  stabilizationMonths?: number;
  /** W2-11: Initial months completely vacant immediately after closing (default 0) */
  monthsVacantAtClose?: number;
  /** W2-11: Concessions in months of free rent granted during lease-up (default 0) */
  concessionsMonths?: number;
  /** W2-11: Rent ramp % during active lease-up months (default 100) */
  leaseUpRentRampPct?: number;
}

export interface AnnualProjectionItem {
  year: number;
  grossRent: number;
  vacancyAmount: number;
  goi: number;
  opex: number;
  noi: number;
  debtService: number;
  operatingCashFlow: number;
  netSaleProceeds: number;
  totalCashFlow: number;
  loanBalance: number;
}

export interface ProjectedIrrParams extends ProjectedIrrAssumptions {
  /** Initial cash equity invested at t0 (purchase price + closing costs + rehab - loan amount) */
  totalCashInvested: number;
  /** Annual pre-tax operational cash flow (NOI - Annual Debt Service) */
  annualPreTaxCashFlow: number;
  /** Purchase price of the property */
  purchasePrice: number;
  /** First-mortgage loan amount */
  loanAmount: number;
  /** Annual interest rate in percent (e.g., 6.5) */
  interestRatePct: number;
  /** Amortization period in years (e.g., 30) */
  amortizationYears: number;
  /** Optional explicit exit valuation override. If omitted, derived from purchasePrice * (1 + appreciation)^holdPeriod */
  exitValue?: number;
  /** Baseline Year 1 Gross Annual Rent for multi-year escalation */
  grossAnnualRent?: number;
  /** Baseline Vacancy Rate percentage (e.g. 5.0) */
  vacancyRatePct?: number;
  /** Baseline Other Annual Income */
  otherAnnualIncome?: number;
  /** Baseline Year 1 Operating Expenses */
  totalOperatingExpenses?: number;
  /** Baseline Annual Debt Service */
  annualDebtService?: number;
}

export interface IrrRoot {
  /** Full-precision rate as a percentage (e.g. 3.8209 for 3.8209%) */
  ratePct: number;
  /** |NPV(r)| residual — must be < 1e-7 for acceptance */
  npvResidual: number;
}

export type IrrStatus = 'converged' | 'no_sign_change' | 'multiple_roots' | 'non_convergent';

export interface ProjectedIrrBreakdown {
  /** Display value rounded to 1 decimal, or null if ambiguous / no solution */
  projectedIrrPct: number | null;
  /** Solver status: why projectedIrrPct is the value it is */
  irrStatus: IrrStatus;
  /** All discovered roots with full-precision rates and NPV residuals */
  roots: IrrRoot[];
  holdPeriodYears: number;
  annualAppreciationPct: number;
  rentGrowthPct: number;
  expenseGrowthPct: number;
  sellingCostsPct: number;
  exitValue: number;
  amortizedLoanBalanceAtExit: number;
  sellingCostsAmount: number;
  netSaleProceeds: number;
  /** Exact unrounded cash-flow vector solved on */
  cashFlowVector: number[];
  /** Year-by-year multi-period projection schedule (W2-09) */
  annualProjections: AnnualProjectionItem[];
  loanType?: 'amortizing' | 'interest_only' | 'arm';
  ioPeriodYears?: number;
  armFixedPeriodYears?: number;
  armAdjustmentPct?: number;
  /** W2-11: Lease-up and stabilization duration in months */
  stabilizationMonths?: number;
  /** W2-11: Initial months completely vacant immediately after closing */
  monthsVacantAtClose?: number;
  /** W2-11: Concessions in months of free rent granted */
  concessionsMonths?: number;
  /** W2-11: Rent ramp % during active lease-up months */
  leaseUpRentRampPct?: number;
}

/**
 * Computes True Discounted Cash Flow (DCF) Internal Rate of Return (IRR) for an equity investment.
 *
 * Mathematical Specification:
 * Solves for discount rate r where:
 *   NPV(r) = -totalCashInvested + ∑ [ annualCashFlow / (1 + r)^t ] (t=1..N-1)
 *            + [ annualCashFlow + netSaleProceeds ] / (1 + r)^N = 0
 *
 * where:
 *   netSaleProceeds = exitValue - amortizedLoanBalance - (sellingCostsPct × exitValue)
 *   exitValue = purchasePrice × (1 + annualAppreciationPct)^N (or explicit override)
 *   amortizedLoanBalance = exact principal balance from 30-yr amortization schedule at month N*12
 *
 * Returns null if cash flows do not converge or do not have opposite signs (Honesty Rule).
 */
export function computeProjectedIrr(params: ProjectedIrrParams): number | null {
  const breakdown = calculateProjectedIrrDetails(params);
  return breakdown.projectedIrrPct;
}

/**
 * Calculates complete details of the projected IRR including intermediate cash flows and exit proceeds.
 */
export function calculateProjectedIrrDetails(params: ProjectedIrrParams): ProjectedIrrBreakdown {
  const holdPeriodYears = params.holdPeriodYears !== undefined ? params.holdPeriodYears : 5;
  const annualAppreciationPct = params.appreciationPct ?? params.annualAppreciationPct ?? 3.0;
  const rentGrowthPct = params.rentGrowthPct ?? 0.0;
  const expenseGrowthPct = params.expenseGrowthPct ?? 0.0;
  const sellingCostsPct = params.sellingCostsPct ?? 6.0;

  const totalCashInvested = params.totalCashInvested;
  const annualPreTaxCashFlow = params.annualPreTaxCashFlow;
  const stabilizationMonths = Math.max(0, params.stabilizationMonths ?? 0);
  const monthsVacantAtClose = Math.max(0, params.monthsVacantAtClose ?? 0);
  const concessionsMonths = Math.max(0, params.concessionsMonths ?? 0);
  const leaseUpRentRampPct = Math.max(0, Math.min(100, params.leaseUpRentRampPct ?? 100.0));

  if (holdPeriodYears <= 0 || totalCashInvested <= 0) {
    return {
      projectedIrrPct: null,
      irrStatus: 'no_sign_change',
      roots: [],
      holdPeriodYears,
      annualAppreciationPct,
      rentGrowthPct,
      expenseGrowthPct,
      sellingCostsPct,
      exitValue: 0,
      amortizedLoanBalanceAtExit: 0,
      sellingCostsAmount: 0,
      netSaleProceeds: 0,
      cashFlowVector: totalCashInvested > 0 ? [-totalCashInvested] : [],
      annualProjections: [],
      loanType: params.loanType,
      ioPeriodYears: params.ioPeriodYears,
      armFixedPeriodYears: params.armFixedPeriodYears,
      armAdjustmentPct: params.armAdjustmentPct,
      stabilizationMonths,
      monthsVacantAtClose,
      concessionsMonths,
      leaseUpRentRampPct,
    };
  }

  const loanType = params.loanType ?? 'amortizing';
  const ioPeriodYears = params.ioPeriodYears ?? 5;
  const armFixedPeriodYears = params.armFixedPeriodYears ?? 5;
  const armAdjustmentPct = params.armAdjustmentPct ?? 2.0;

  // 1. Amortization Schedule & Exact Loan Balance at Exit
  let amortSchedule: Array<{ balance: number }> = [];
  if (params.loanAmount > 0 && params.interestRatePct > 0 && params.amortizationYears > 0) {
    const ioPeriodMonths = loanType === 'interest_only' ? ioPeriodYears * 12 : 0;
    const armFixedPeriodMonths = loanType === 'arm' ? armFixedPeriodYears * 12 : 0;
    const armAdjustmentRate = loanType === 'arm' ? armAdjustmentPct / 100 : 0;

    const amort = computeAmortizationSchedule(
      params.loanAmount,
      params.interestRatePct / 100,
      params.amortizationYears,
      {
        ioPeriodMonths,
        armFixedPeriodMonths,
        armAdjustmentRate,
      },
    );
    amortSchedule = amort.schedule;
  }
  const exitMonth = holdPeriodYears * 12;
  const amortizedLoanBalanceAtExit =
    exitMonth <= amortSchedule.length && exitMonth > 0
      ? amortSchedule[exitMonth - 1].balance
      : 0;

  // 2. Exit Valuation
  const exitValue =
    params.exitValue !== undefined
      ? params.exitValue
      : Math.round(
          params.purchasePrice * Math.pow(1 + annualAppreciationPct / 100, holdPeriodYears),
        );

  // 3. Selling Costs & Net Sale Proceeds
  const sellingCostsAmount = Math.round(exitValue * (sellingCostsPct / 100));
  const netSaleProceeds = Math.max(
    0,
    Math.round(exitValue - amortizedLoanBalanceAtExit - sellingCostsAmount),
  );

  // 4. Construct Multi-Year Discrete Annual Equity Cash Flow Vector (W2-09 Progression)
  const annualProjections: AnnualProjectionItem[] = [];
  const cashFlowVector: number[] = [-totalCashInvested];

  const hasItemized =
    params.grossAnnualRent !== undefined && params.totalOperatingExpenses !== undefined;
  const baseGrossRent = params.grossAnnualRent ?? 0;
  const vacancyRate = Math.max(0, Math.min(100, params.vacancyRatePct ?? 0));
  const baseOtherIncome = params.otherAnnualIncome ?? 0;
  const baseOpEx = params.totalOperatingExpenses ?? 0;
  const baseDebtService =
    params.annualDebtService ??
    (hasItemized ? Math.round(baseGrossRent * (1 - vacancyRate / 100) + baseOtherIncome - baseOpEx - annualPreTaxCashFlow) : 0);

  for (let yr = 1; yr <= holdPeriodYears; yr++) {
    const t = yr - 1; // 0 for year 1
    const yrMonth = yr * 12;
    const loanBalance =
      yrMonth <= amortSchedule.length && yrMonth > 0
        ? amortSchedule[yrMonth - 1].balance
        : 0;

    // Determine annual debt service for the current year
    let yrDebtService = baseDebtService;
    if (loanType === 'interest_only') {
      if (yr <= ioPeriodYears) {
        yrDebtService = Math.round(((params.loanAmount * (params.interestRatePct / 100)) / 12) * 12);
      } else {
        const remainingYears = Math.max(1, params.amortizationYears - ioPeriodYears);
        const reamortPayment = computeAmortizationSchedule(
          params.loanAmount,
          params.interestRatePct / 100,
          remainingYears,
        ).monthlyPayment;
        yrDebtService = Math.round(reamortPayment * 12);
      }
    } else if (loanType === 'arm') {
      if (yr <= armFixedPeriodYears) {
        yrDebtService = baseDebtService;
      } else {
        const remainingYears = Math.max(1, params.amortizationYears - armFixedPeriodYears);
        const fixedMonth = armFixedPeriodYears * 12;
        const balanceAtReset =
          fixedMonth <= amortSchedule.length && fixedMonth > 0
            ? amortSchedule[fixedMonth - 1].balance
            : params.loanAmount;
        const adjustedRate = (params.interestRatePct + armAdjustmentPct) / 100;
        const armPayment = computeAmortizationSchedule(balanceAtReset, adjustedRate, remainingYears).monthlyPayment;
        yrDebtService = Math.round(armPayment * 12);
      }
    }

    let grossRent = 0;
    let vacancyAmount = 0;
    let goi = 0;
    let opex = 0;
    let noi = 0;
    let debtService = yrDebtService;
    let operatingCashFlow = 0;

    if (yr === 1 && stabilizationMonths > 0) {
      // W2-11: Active lease-up in Year 1
      const mStab = Math.min(12, stabilizationMonths);
      const mVac = Math.min(mStab, monthsVacantAtClose);
      const mActive = mStab - mVac;
      const mRent = baseGrossRent / 12;
      const activeRent = mActive * mRent * (leaseUpRentRampPct / 100);
      const concessionDeduction = concessionsMonths * mRent;
      const leaseUpCollectedRent = Math.max(0, activeRent - concessionDeduction);

      // Post-stabilization phase: vacancy applies ONLY to post-stabilization months
      const mPost = 12 - mStab;
      const postScheduledRent = mPost * mRent;
      const postVacancyLoss = postScheduledRent * (vacancyRate / 100);
      const postCollectedRent = postScheduledRent - postVacancyLoss;
      const effectiveRent = leaseUpCollectedRent + postCollectedRent;

      grossRent = baseGrossRent;
      vacancyAmount = Number((baseGrossRent - effectiveRent).toFixed(2));
      goi = Number((effectiveRent + baseOtherIncome).toFixed(2));
      opex = baseOpEx;
      noi = Number((goi - opex).toFixed(2));
      debtService = yrDebtService;
      operatingCashFlow = Number((noi - debtService).toFixed(2));
    } else if (rentGrowthPct === 0 && expenseGrowthPct === 0) {
      // Exact zero-growth regression parity: flat annuity cash flow exactly matches baseline
      grossRent = baseGrossRent;
      vacancyAmount = Math.round(grossRent * (vacancyRate / 100));
      goi = grossRent - vacancyAmount + baseOtherIncome;
      opex = baseOpEx;
      noi = hasItemized ? (goi - opex) : (baseDebtService + annualPreTaxCashFlow);
      debtService = yrDebtService;
      operatingCashFlow = hasItemized
        ? Number((noi - debtService).toFixed(2))
        : (annualPreTaxCashFlow + (baseDebtService - yrDebtService));
    } else if (hasItemized) {
      const rentFactor = Math.pow(1 + rentGrowthPct / 100, t);
      const expFactor = Math.pow(1 + expenseGrowthPct / 100, t);

      grossRent = Number((baseGrossRent * rentFactor).toFixed(2));
      vacancyAmount = Number((grossRent * (vacancyRate / 100)).toFixed(2));
      goi = Number((grossRent - vacancyAmount + baseOtherIncome * rentFactor).toFixed(2));
      opex = Number((baseOpEx * expFactor).toFixed(2));
      noi = Number((goi - opex).toFixed(2));
      debtService = yrDebtService;
      operatingCashFlow = Number((noi - debtService).toFixed(2));
    } else {
      // Fallback when itemized revenue/opex are not passed
      const rentFactor = Math.pow(1 + rentGrowthPct / 100, t);
      operatingCashFlow = Number(((annualPreTaxCashFlow + (baseDebtService - yrDebtService)) * rentFactor).toFixed(2));
      noi = operatingCashFlow;
      debtService = yrDebtService;
    }

    const isTerminalYear = yr === holdPeriodYears;
    const terminalProceeds = isTerminalYear ? netSaleProceeds : 0;
    const totalCashFlow = Number((operatingCashFlow + terminalProceeds).toFixed(2));

    annualProjections.push({
      year: yr,
      grossRent,
      vacancyAmount,
      goi,
      opex,
      noi,
      debtService,
      operatingCashFlow,
      netSaleProceeds: terminalProceeds,
      totalCashFlow,
      loanBalance,
    });

    cashFlowVector.push(totalCashFlow);
  }

  // 5. Solve for IRR via Root-Finding (Hardened W2-05)
  let projectedIrrPct: number | null = null;
  let irrStatus: IrrStatus = 'non_convergent';
  const roots: IrrRoot[] = [];

  if (totalCashInvested > 0) {
    const hasNegative = cashFlowVector.some((c) => c < 0);
    const hasPositive = cashFlowVector.some((c) => c > 0);

    if (hasNegative && hasPositive) {
      const npv = (r: number): number => {
        let sum = 0;
        for (let t = 0; t < cashFlowVector.length; t++) {
          sum += cashFlowVector[t] / Math.pow(1 + r, t);
        }
        return sum;
      };

      const dnpv = (r: number): number => {
        let sum = 0;
        for (let t = 1; t < cashFlowVector.length; t++) {
          sum -= (t * cashFlowVector[t]) / Math.pow(1 + r, t + 1);
        }
        return sum;
      };

      // Phase 1: 200-point grid scan over [-0.99, 10.0] to find ALL sign-change intervals
      const gridLow = -0.99;
      const gridHigh = 10.0;
      const gridPoints = 200;
      const gridStep = (gridHigh - gridLow) / gridPoints;
      const signChangeIntervals: Array<[number, number]> = [];

      let prevRate = gridLow;
      let prevNpv = npv(prevRate);

      for (let i = 1; i <= gridPoints; i++) {
        const currRate = gridLow + i * gridStep;
        const currNpv = npv(currRate);

        if (Math.sign(prevNpv) !== Math.sign(currNpv) && prevNpv !== 0) {
          signChangeIntervals.push([prevRate, currRate]);
        }
        prevRate = currRate;
        prevNpv = currNpv;
      }

      if (signChangeIntervals.length === 0) {
        irrStatus = 'no_sign_change';
      } else {
        // Phase 2: Solve each isolated interval using Newton-bisection
        for (const [low, high] of signChangeIntervals) {
          const rootRate = solveInterval(npv, dnpv, low, high);
          if (rootRate !== null) {
            const residual = Math.abs(npv(rootRate));
            if (residual < 1e-7) {
              const rootPct = rootRate * 100;
              const isDuplicate = roots.some(
                (existing) => Math.abs(existing.ratePct - rootPct) < 0.001,
              );
              if (!isDuplicate) {
                roots.push({ ratePct: rootPct, npvResidual: residual });
              }
            }
          }
        }

        if (roots.length === 1) {
          irrStatus = 'converged';
          projectedIrrPct = Number(roots[0].ratePct.toFixed(1));
        } else if (roots.length > 1) {
          irrStatus = 'multiple_roots';
          projectedIrrPct = null;
        } else {
          irrStatus = 'non_convergent';
          projectedIrrPct = null;
        }
      }
    } else {
      irrStatus = 'no_sign_change';
    }
  }

  return {
    projectedIrrPct,
    irrStatus,
    roots,
    holdPeriodYears,
    annualAppreciationPct,
    rentGrowthPct,
    expenseGrowthPct,
    sellingCostsPct,
    exitValue,
    amortizedLoanBalanceAtExit: Math.round(amortizedLoanBalanceAtExit),
    sellingCostsAmount,
    netSaleProceeds,
    cashFlowVector,
    annualProjections,
    loanType,
    ioPeriodYears,
    armFixedPeriodYears,
    armAdjustmentPct,
    stabilizationMonths,
    monthsVacantAtClose,
    concessionsMonths,
    leaseUpRentRampPct,
  };
}

/**
 * Newton-bisection hybrid solver for a single bracketed interval.
 * Returns the rate (as a decimal, e.g. 0.038) or null if non-convergent.
 */
function solveInterval(
  npv: (r: number) => number,
  dnpv: (r: number) => number,
  low: number,
  high: number,
): number | null {
  let rate = (low + high) / 2;

  for (let i = 0; i < 100; i++) {
    const val = npv(rate);
    if (Math.abs(val) < 1e-9) {
      return rate;
    }

    // Update bracket bounds
    if (val > 0) {
      low = rate;
    } else {
      high = rate;
    }

    // Newton step
    const deriv = dnpv(rate);
    let nextRate: number;
    if (Math.abs(deriv) > 1e-10) {
      nextRate = rate - val / deriv;
    } else {
      nextRate = (low + high) / 2;
    }

    // Safeguard: if Newton jumps out of bracket, use bisection
    if (nextRate <= low || nextRate >= high || isNaN(nextRate)) {
      nextRate = (low + high) / 2;
    }

    if (Math.abs(nextRate - rate) < 1e-10) {
      return nextRate;
    }

    rate = nextRate;
  }

  // Final convergence check
  if (Math.abs(npv(rate)) < 1e-7) {
    return rate;
  }
  return null;
}
