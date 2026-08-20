export interface AmortizationPayment {
  paymentNumber: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AmortizationSchedule {
  monthlyPayment: number;
  totalPayments: number;
  totalInterest: number;
  schedule: AmortizationPayment[];
}

/**
 * Computes standard fixed-rate amortization schedule.
 * Golden Value: Principal $223,200, 6.5% interest, 30 years -> Monthly Payment = $1,410.78
 */
export function computeAmortizationSchedule(
  principal: number,
  annualRate: number,
  termYears: number,
  startDate: Date = new Date()
): AmortizationSchedule {
  if (principal <= 0 || termYears <= 0) {
    return {
      monthlyPayment: 0,
      totalPayments: 0,
      totalInterest: 0,
      schedule: [],
    };
  }

  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;

  let monthlyPayment = 0;
  if (monthlyRate === 0) {
    monthlyPayment = principal / numPayments;
  } else {
    monthlyPayment =
      (principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  // Round monthly payment to 2 decimal places ($1,410.78)
  monthlyPayment = Number(monthlyPayment.toFixed(2));

  let currentBalance = principal;
  let accumulatedInterest = 0;
  const schedule: AmortizationPayment[] = [];

  for (let i = 1; i <= numPayments; i++) {
    const interestForMonth = Number((currentBalance * monthlyRate).toFixed(2));
    let principalForMonth = Number((monthlyPayment - interestForMonth).toFixed(2));

    if (i === numPayments || currentBalance - principalForMonth < 0) {
      principalForMonth = currentBalance;
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
    });
  }

  return {
    monthlyPayment,
    totalPayments: numPayments,
    totalInterest: accumulatedInterest,
    schedule,
  };
}

export function computeMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  return computeAmortizationSchedule(principal, annualRate, termYears).monthlyPayment;
}
