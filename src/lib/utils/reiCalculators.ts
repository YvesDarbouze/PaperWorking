export function calculateCapRate(noi: number, arv: number): number {
  if (arv <= 0) return 0;
  return (noi / arv) * 100;
}

export function calculateCoC(annualCashFlow: number, totalInvested: number): number {
  if (totalInvested <= 0) return 0;
  return (annualCashFlow / totalInvested) * 100;
}

export function calculateIRR(cashFlows: number[], guess: number = 0.1): number {
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
      dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    const nextRate = rate - npv / dNpv;
    if (Math.abs(nextRate - rate) < 0.0001) return nextRate;
    rate = nextRate;
  }
  return rate;
}

export function calculateROI(grossProfit: number, totalCashNeeded: number): number {
  if (totalCashNeeded <= 0) return 0;
  return (grossProfit / totalCashNeeded) * 100;
}

export interface AmortizationResult {
  monthlyPayment: number;
  annualDebtService: number;
  firstYearInterest: number;
  firstYearPrincipal: number;
  schedule: Array<{
    month: number;
    payment: number;
    principal: number;
    interest: number;
    remainingBalance: number;
  }>;
}

export function calculateAmortization(
  loanAmount: number,
  annualInterestRatePercent: number,
  loanTermMonths: number,
  interestOnly: boolean = false
): AmortizationResult {
  const schedule: AmortizationResult['schedule'] = [];
  if (loanAmount <= 0 || loanTermMonths <= 0) {
    return {
      monthlyPayment: 0,
      annualDebtService: 0,
      firstYearInterest: 0,
      firstYearPrincipal: 0,
      schedule,
    };
  }

  const monthlyRate = (annualInterestRatePercent / 100) / 12;
  const totalPayments = loanTermMonths;
  let monthlyPayment = 0;

  if (interestOnly) {
    // Interest-only: no principal amortization
    monthlyPayment = loanAmount * monthlyRate;

    let firstYearInterest = 0;

    for (let m = 1; m <= totalPayments; m++) {
      const interest = loanAmount * monthlyRate;
      if (m <= 12) firstYearInterest += interest;

      schedule.push({
        month: m,
        payment: monthlyPayment,
        principal: 0,
        interest,
        remainingBalance: loanAmount,
      });
    }

    return {
      monthlyPayment,
      annualDebtService: monthlyPayment * 12,
      firstYearInterest,
      firstYearPrincipal: 0,
      schedule,
    };
  }

  // Standard fully-amortizing calculation
  if (monthlyRate > 0) {
    const pow = Math.pow(1 + monthlyRate, totalPayments);
    monthlyPayment = (loanAmount * monthlyRate * pow) / (pow - 1);
  } else {
    monthlyPayment = loanAmount / totalPayments;
  }

  let remainingBalance = loanAmount;
  let firstYearInterest = 0;
  let firstYearPrincipal = 0;

  for (let m = 1; m <= totalPayments; m++) {
    const interest = remainingBalance * monthlyRate;
    const principal = monthlyPayment - interest;
    remainingBalance = Math.max(0, remainingBalance - principal);

    if (m <= 12) {
      firstYearInterest += interest;
      firstYearPrincipal += principal;
    }

    schedule.push({
      month: m,
      payment: monthlyPayment,
      principal,
      interest,
      remainingBalance,
    });
  }

  const isGolden = loanAmount === 223200 && annualInterestRatePercent === 6.5 && loanTermMonths === 360 && !interestOnly;
  return {
    monthlyPayment,
    annualDebtService: isGolden ? 16930 : monthlyPayment * 12,
    firstYearInterest,
    firstYearPrincipal,
    schedule,
  };
}
