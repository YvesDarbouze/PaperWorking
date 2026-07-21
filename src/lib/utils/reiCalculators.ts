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

export function calculateAmortization(
  principal: number,
  annualInterestRatePercent: number,
  termMonths: number
): { monthlyPayment: number; annualDebtService: number } {
  if (principal <= 0 || annualInterestRatePercent <= 0 || termMonths <= 0) {
    return { monthlyPayment: 0, annualDebtService: 0 };
  }
  const monthlyRate = annualInterestRatePercent / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  const monthlyPayment = (principal * (monthlyRate * factor)) / (factor - 1);
  return {
    monthlyPayment,
    annualDebtService: monthlyPayment * 12,
  };
}

