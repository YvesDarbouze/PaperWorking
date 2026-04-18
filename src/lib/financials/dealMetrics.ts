import { Project } from '@/types/schema';

export interface FlipMetrics {
  arv: number;
  mao: number;
  maoViolated: boolean;
  rehabBudget: number;
  rehabActual: number;
  rehabDelta: number;
  rehabPct: number;
  dailyBurnRate: number;
  hasBurnRate: boolean;
  netProjectedProfit: number;
  totalCost: number;
  roi: number;
}

export interface HoldMetrics {
  monthlyRent: number;
  vacancyLoss: number;
  maintenanceCost: number;
  mgmtFee: number;
  mortgagePayment: number;
  noi: number;
  monthlyCashFlow: number;
  totalInvested: number;
  cashOnCashYield: number;
}

export type DealHealthColor = 'green' | 'amber' | 'red';

export function dealHealthColor(roi: number): DealHealthColor {
  if (roi >= 15) return 'green';
  if (roi >= 0) return 'amber';
  return 'red';
}

export function computeFlipMetrics(deal: Project): FlipMetrics {
  const f = deal.financials;
  const arv = f.estimatedARV || 0;
  const purchasePrice = f.purchasePrice || 0;
  const projectedRehabCost = f.projectedRehabCost || 0;
  const loanAmount = f.loanAmount || 0;
  const loanInterestRate = f.loanInterestRate || 0;
  const timelineDays = f.estimatedTimelineDays || 90;

  // Sum approved costs; fall back to rehab baseBudget if no approved entries
  const approvedCosts = (f.costs || []).filter((c) => c.approved).reduce((sum, c) => sum + (c.amount || 0), 0);
  const rehabActual = approvedCosts > 0 ? approvedCosts : (deal.rehab?.baseBudget || 0);

  // 70% Rule: Maximum Allowable Offer
  const mao = Math.max(0, arv * 0.7 - projectedRehabCost);
  const maoViolated = purchasePrice > mao && mao > 0;

  const rehabBudget = projectedRehabCost;
  const rehabDelta = rehabBudget - rehabActual;
  const rehabPct = rehabBudget > 0 ? Math.min(rehabActual / rehabBudget, 1) : 0;

  const hasBurnRate = loanAmount > 0 && loanInterestRate > 0;
  const dailyBurnRate = hasBurnRate ? (loanAmount * (loanInterestRate / 100)) / 365 : 0;

  const projectedHoldingCost = hasBurnRate ? dailyBurnRate * timelineDays : 0;
  const totalCost = purchasePrice + rehabActual + projectedHoldingCost;
  const netProjectedProfit = arv - totalCost;
  const roi = totalCost > 0 ? (netProjectedProfit / totalCost) * 100 : 0;

  return {
    arv,
    mao,
    maoViolated,
    rehabBudget,
    rehabActual,
    rehabDelta,
    rehabPct,
    dailyBurnRate,
    hasBurnRate,
    netProjectedProfit,
    totalCost,
    roi,
  };
}

export function computeHoldMetrics(deal: Project): HoldMetrics {
  const f = deal.financials;
  const purchasePrice = f.purchasePrice || 0;

  const approvedCosts = (f.costs || []).filter((c) => c.approved).reduce((sum, c) => sum + (c.amount || 0), 0);
  const rehabActual = approvedCosts > 0 ? approvedCosts : (deal.rehab?.baseBudget || 0);

  const monthlyRent = f.projectedMonthlyRent || 0;
  const vacancyRate = f.vacancyRate || 0;
  const vacancyLoss = monthlyRent * (vacancyRate / 100);
  const maintenanceCost = f.maintenanceReserves || 0;
  const mgmtFee = f.propertyManagementFee || 0;
  const mortgagePayment = f.longTermMortgagePayment || 0;

  const noi = monthlyRent - vacancyLoss - maintenanceCost - mgmtFee;
  const monthlyCashFlow = noi - mortgagePayment;
  const totalInvested = purchasePrice + rehabActual;
  const cashOnCashYield = totalInvested > 0 ? (monthlyCashFlow * 12) / totalInvested * 100 : 0;

  return {
    monthlyRent,
    vacancyLoss,
    maintenanceCost,
    mgmtFee,
    mortgagePayment,
    noi,
    monthlyCashFlow,
    totalInvested,
    cashOnCashYield,
  };
}
