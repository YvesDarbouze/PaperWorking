export interface AmortizationPayment {
  paymentNumber: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
  isInterestOnly?: boolean;
}

export interface AmortizationSchedule {
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  balloonBalance?: number;
  schedule: AmortizationPayment[];
}

export interface AmortizationOptions {
  startDate?: Date;
  balloonTermYears?: number | null;
  ioPeriodMonths?: number | null;
  floatingIndex?: 'SOFR' | 'Prime' | null;
  floatingSpreadBps?: number | null;
  /**
   * Forward curve annual adjustment in bps.
   * Default institutional assumption: market forward curve projects a 25 bps annual
   * easing from historical highs until terminal rate is reached.
   */
  forwardCurveAdjustBpsPerYear?: number | null;
  armFixedPeriodMonths?: number | null;
  armAdjustmentRate?: number | null;
}

export const BASELINE_INDEX_RATES = {
  SOFR: 0.053, // 5.30%
  Prime: 0.085, // 8.50%
} as const;

/**
 * Computes Annual Debt Constant (k) = (Annual Debt Service / Loan Amount).
 * For a $1.00 loan with annualRate and termYears:
 * Used for DSCR-constrained loan sizing: Max Loan = NOI / (minDSCR * debtConstant).
 */
export function computeAnnualDebtConstant(annualRate: number, termYears: number): number {
  if (annualRate <= 0 || termYears <= 0) return 1 / Math.max(1, termYears);
  const monthlyRate = annualRate / 12;
  const n = termYears * 12;
  const monthlyPmtPerDollar =
    (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
  return monthlyPmtPerDollar * 12;
}

/**
 * Computes amortization schedule with full support for:
 * 1. Fixed and floating rates (forward curve modeled)
 * 2. Interest-only (IO) periods
 * 3. Balloon maturities
 *
 * Golden Value: Principal $223,200, 6.5% interest, 30 years -> Monthly Payment = $1,410.78
 */
export function computeAmortizationSchedule(
  principal: number,
  annualRate: number,
  termYears: number,
  startDateOrOptions?: Date | AmortizationOptions,
): AmortizationSchedule {
  if (principal <= 0 || termYears <= 0) {
    return {
      monthlyPayment: 0,
      totalPayments: 0,
      totalInterest: 0,
      schedule: [],
    };
  }

  const options: AmortizationOptions =
    startDateOrOptions instanceof Date
      ? { startDate: startDateOrOptions }
      : startDateOrOptions || {};

  const startDate = options.startDate || new Date();
  const ioPeriodMonths = Math.max(0, options.ioPeriodMonths || 0);
  const balloonTermYears = options.balloonTermYears;
  const totalMonths = termYears * 12;
  const maxMonths = balloonTermYears && balloonTermYears > 0 ? Math.min(balloonTermYears * 12, totalMonths) : totalMonths;

  // Resolve base interest rate (if floating with spread specified)
  let baseRate = annualRate;
  if (options.floatingIndex && options.floatingSpreadBps !== undefined && options.floatingSpreadBps !== null) {
    const idx = BASELINE_INDEX_RATES[options.floatingIndex] ?? 0.053;
    baseRate = idx + options.floatingSpreadBps / 10000;
  }

  // Monthly payment calculation
  // If IO period exists, initial payment during IO is interest-only;
  // then amortizes over the remaining (totalMonths - ioPeriodMonths).
  const amortizingMonths = Math.max(1, totalMonths - ioPeriodMonths);
  const initialMonthlyRate = baseRate / 12;

  let standardAmortizingPayment = 0;
  if (initialMonthlyRate === 0) {
    standardAmortizingPayment = principal / amortizingMonths;
  } else {
    standardAmortizingPayment =
      (principal * (initialMonthlyRate * Math.pow(1 + initialMonthlyRate, amortizingMonths))) /
      (Math.pow(1 + initialMonthlyRate, amortizingMonths) - 1);
  }
  standardAmortizingPayment = Number(standardAmortizingPayment.toFixed(2));

  const ioMonthlyPayment = Number((principal * initialMonthlyRate).toFixed(2));
  const effectiveMonthlyPayment = ioPeriodMonths > 0 ? ioMonthlyPayment : standardAmortizingPayment;

  let currentBalance = principal;
  let accumulatedInterest = 0;
  const schedule: AmortizationPayment[] = [];

  for (let i = 1; i <= maxMonths; i++) {
    // ARM reset adjustment: re-amortize at reset month over remaining term
    if (options.armFixedPeriodMonths && i === options.armFixedPeriodMonths + 1) {
      const remainingMonths = Math.max(1, totalMonths - options.armFixedPeriodMonths);
      const adjustedRate = Math.max(0.001, baseRate + (options.armAdjustmentRate || 0));
      const adjustedMonthlyRate = adjustedRate / 12;
      standardAmortizingPayment = Number(
        (
          (currentBalance * (adjustedMonthlyRate * Math.pow(1 + adjustedMonthlyRate, remainingMonths))) /
          (Math.pow(1 + adjustedMonthlyRate, remainingMonths) - 1)
        ).toFixed(2),
      );
    }

    // Forward curve adjustment & ARM rate offset
    const yearIndex = Math.floor((i - 1) / 12);
    const forwardAdjust = (options.forwardCurveAdjustBpsPerYear || 0) * yearIndex / 10000;
    const armRateOffset =
      options.armFixedPeriodMonths && i > options.armFixedPeriodMonths
        ? options.armAdjustmentRate || 0
        : 0;
    const currentAnnualRate = Math.max(0.01, baseRate + forwardAdjust + armRateOffset);
    const currentMonthlyRate = currentAnnualRate / 12;

    const isIO = i <= ioPeriodMonths;
    let interestForMonth = Number((currentBalance * currentMonthlyRate).toFixed(2));
    let principalForMonth = 0;
    let paymentForMonth = 0;

    if (isIO) {
      principalForMonth = 0;
      paymentForMonth = interestForMonth;
    } else {
      paymentForMonth = standardAmortizingPayment;
      principalForMonth = Number((paymentForMonth - interestForMonth).toFixed(2));

      if (i === totalMonths || currentBalance - principalForMonth < 0) {
        principalForMonth = currentBalance;
        paymentForMonth = Number((principalForMonth + interestForMonth).toFixed(2));
      }
    }

    currentBalance = Number(Math.max(0, currentBalance - principalForMonth).toFixed(2));
    accumulatedInterest = Number((accumulatedInterest + interestForMonth).toFixed(2));

    const paymentDate = new Date(startDate);
    paymentDate.setMonth(paymentDate.getMonth() + (i - 1));

    schedule.push({
      paymentNumber: i,
      date: paymentDate.toISOString().split('T')[0],
      payment: Number((principalForMonth + interestForMonth).toFixed(2)),
      principal: principalForMonth,
      interest: interestForMonth,
      balance: currentBalance,
      isInterestOnly: isIO,
    });
  }

  return {
    monthlyPayment: effectiveMonthlyPayment,
    totalPayments: maxMonths,
    totalInterest: accumulatedInterest,
    balloonBalance: balloonTermYears && balloonTermYears < termYears ? currentBalance : undefined,
    schedule,
  };
}

export function computeMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number,
  options?: AmortizationOptions,
): number {
  return computeAmortizationSchedule(principal, annualRate, termYears, options).monthlyPayment;
}
