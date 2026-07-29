import { deriveAllProjectMetrics, computeIRR } from '@/lib/metrics/reiMetrics';
import type { Project } from '@/types/schema';

export interface HoldVsSellInput {
  estimatedCurrentValue: number;
  sellingCostPercent: number; // e.g. 6.0 for 6%
  mortgagePayoff: number;
  purchasePrice: number;
  totalCashInvested: number;
  monthlyGrossRent: number;
  monthlyExpenses: number;
  annualDebtService?: number;
  annualAppreciationPercent?: number;
  holdYears?: number;
}

export interface HoldVsSellResult {
  sellNow: {
    grossSalePrice: number;
    sellingCosts: number;
    mortgagePayoff: number;
    netProceeds: number;
    equityMultiple: number;
  };
  holdPath: {
    holdYears: number;
    annualCashFlow: number;
    cumulativeCashFlow: number;
    projectedTerminalValue: number;
    terminalSellingCosts: number;
    terminalMortgagePayoff: number;
    netTerminalProceeds: number;
    totalHoldNetReturns: number;
    irr: number; // percentage e.g. 14.5
    equityMultiple: number;
  };
  winner: 'HOLD' | 'SELL';
  netDifference: number; // Positive means Hold wins by $X, negative means Sell wins by $X
  verdictBanner: string; // Purely mathematical statement
}

export function computeHoldVsSellComparison(input: HoldVsSellInput): HoldVsSellResult {
  const sellingCostPct = Math.max(0, input.sellingCostPercent || 6.0);
  const holdYears = input.holdYears || 3;
  const appreciationRate = (input.annualAppreciationPercent ?? 3.0) / 100;
  const initialInvested = Math.max(1, input.totalCashInvested || 1);

  // 1. Sell Now Path
  const grossSellNow = Math.max(0, input.estimatedCurrentValue || 0);
  const sellNowCosts = grossSellNow * (sellingCostPct / 100);
  const sellNowPayoff = Math.max(0, input.mortgagePayoff || 0);
  const netProceedsSellNow = Math.max(0, grossSellNow - sellNowCosts - sellNowPayoff);
  const equityMultipleSellNow = Number((netProceedsSellNow / initialInvested).toFixed(2));

  // 2. Hold Path (sourced via deriveAllProjectMetrics engine)
  const project = {
    id: 'hold-vs-sell',
    name: 'Hold vs Sell Analysis',
    currentPhase: 3,
    dispositionType: 'RENT',
    financials: {
      purchasePrice: input.purchasePrice,
      monthlyGrossRent: input.monthlyGrossRent,
      monthlyExpenses: input.monthlyExpenses,
      estimatedCurrentValue: input.estimatedCurrentValue,
      annualAppreciationPercent: input.annualAppreciationPercent ?? 3.0,
      projectedHoldTimeMonths: holdYears * 12,
    },
  } as unknown as Project;

  const derived = deriveAllProjectMetrics(project);

  const annualCashFlow = derived.annualCashFlow;
  const cumulativeCashFlow = annualCashFlow * holdYears;

  // Terminal value after holdYears of appreciation
  const projectedTerminalValue = grossSellNow * Math.pow(1 + appreciationRate, holdYears);
  const terminalSellingCosts = projectedTerminalValue * (sellingCostPct / 100);
  const estimatedPaydown = sellNowPayoff * 0.015 * holdYears;
  const terminalMortgagePayoff = Math.max(0, sellNowPayoff - estimatedPaydown);
  const netTerminalProceeds = Math.max(0, projectedTerminalValue - terminalSellingCosts - terminalMortgagePayoff);

  const totalHoldNetReturns = cumulativeCashFlow + netTerminalProceeds;
  const equityMultipleHold = derived.kpi33?.equityMultiple || Number((totalHoldNetReturns / initialInvested).toFixed(2));

  const irrCashFlows = [-initialInvested];
  for (let i = 1; i < holdYears; i++) {
    irrCashFlows.push(annualCashFlow);
  }
  irrCashFlows.push(annualCashFlow + netTerminalProceeds);

  let holdIRR = 0;
  try {
    const rawIRR = computeIRR(irrCashFlows);
    if (rawIRR !== null && !isNaN(rawIRR)) {
      holdIRR = Number((rawIRR * 100).toFixed(1));
    }
  } catch {
    holdIRR = derived.irr || derived.annualizedIrr || 0;
  }

  // 3. Verdict & Comparison
  const netDifference = totalHoldNetReturns - netProceedsSellNow;
  const winner: 'HOLD' | 'SELL' = netDifference >= 0 ? 'HOLD' : 'SELL';

  const fmtCurrency = (val: number) =>
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  let verdictBanner = '';
  if (winner === 'HOLD') {
    verdictBanner = `Hold 3-Years projects ${fmtCurrency(netDifference)} higher total net proceeds (${equityMultipleHold.toFixed(2)}x equity multiple, ${holdIRR}% IRR) compared to selling now.`;
  } else {
    verdictBanner = `Sell Now yields ${fmtCurrency(Math.abs(netDifference))} higher immediate liquidity (${fmtCurrency(netProceedsSellNow)} net proceeds) compared to holding for ${holdYears} years.`;
  }

  return {
    sellNow: {
      grossSalePrice: Math.round(grossSellNow),
      sellingCosts: Math.round(sellNowCosts),
      mortgagePayoff: Math.round(sellNowPayoff),
      netProceeds: Math.round(netProceedsSellNow),
      equityMultiple: equityMultipleSellNow,
    },
    holdPath: {
      holdYears,
      annualCashFlow: Math.round(annualCashFlow),
      cumulativeCashFlow: Math.round(cumulativeCashFlow),
      projectedTerminalValue: Math.round(projectedTerminalValue),
      terminalSellingCosts: Math.round(terminalSellingCosts),
      terminalMortgagePayoff: Math.round(terminalMortgagePayoff),
      netTerminalProceeds: Math.round(netTerminalProceeds),
      totalHoldNetReturns: Math.round(totalHoldNetReturns),
      irr: holdIRR,
      equityMultiple: equityMultipleHold,
    },
    winner,
    netDifference: Math.round(netDifference),
    verdictBanner,
  };
}

export interface ActualizedReturnsResult {
  actualIRR: number | null;
  actualEquityMultiple: number | null;
  totalCashInvested: number;
  netProfit: number;
  completenessPercent: number;
  missingFields: string[];
}

export function computeActualizedReturns(params: {
  purchasePrice: number;
  totalCashInvested: number;
  estimatedCurrentValue: number;
  loanAmount: number;
  monthlyGrossRent: number;
  monthlyExpenses: number;
  annualDebtService: number;
  createdAt: string | Date;
  soldDate?: string;
  isRealized: boolean;
  rentReceived?: { amount: number; date: string; confirmed: boolean }[];
  leaseIncome?: { amount: number; date: string; confirmed: boolean }[];
  opexTax?: { amount: number; date: string; confirmed: boolean }[];
  opexInsurance?: { amount: number; date: string; confirmed: boolean }[];
  opexSecurity?: { amount: number; date: string; confirmed: boolean }[];
  opexMaintenance?: { amount: number; date: string; confirmed: boolean }[];
  opexUtilities?: { amount: number; date: string; confirmed: boolean }[];
  opexManagement?: { amount: number; date: string; confirmed: boolean }[];
  opexHoa?: { amount: number; date: string; confirmed: boolean }[];
  opexCapex?: { amount: number; date: string; confirmed: boolean }[];
  sellingCostPercent?: number;
  mortgagePayoff?: number;
  actualSalePrice?: number;
  sellingCostsAmount?: number;
}): ActualizedReturnsResult {
  const purchasePrice = params.purchasePrice || 0;
  const loanAmount = params.loanAmount || 0;
  const monthlyGrossRent = params.monthlyGrossRent || 0;
  const estimatedCurrentValue = params.estimatedCurrentValue || 0;

  // 1. Calculate completeness
  const missingFields: string[] = [];
  if (!(purchasePrice > 0)) missingFields.push('financials.purchasePrice');
  if (!(monthlyGrossRent > 0)) missingFields.push('financials.monthlyGrossRent');
  if (!(loanAmount > 0)) missingFields.push('financials.loanAmount');
  if (!(estimatedCurrentValue > 0) && !params.isRealized) {
    missingFields.push('financials.estimatedCurrentValue');
  }

  const totalFields = 4;
  const completenessPercent = ((totalFields - missingFields.length) / totalFields) * 100;

  // 2. Initial investment basis
  const totalCashInvested = params.totalCashInvested || Math.max(1, purchasePrice - loanAmount);

  // 3. Metric calculation routed through deriveAllProjectMetrics
  const project = {
    id: 'actualized-returns',
    name: 'Actualized Returns',
    currentPhase: params.isRealized ? 4 : 3,
    dispositionType: 'RENT',
    createdAt: params.createdAt,
    financials: {
      purchasePrice: params.purchasePrice,
      monthlyGrossRent: params.monthlyGrossRent,
      monthlyExpenses: params.monthlyExpenses,
      loanAmount: params.loanAmount,
      estimatedCurrentValue: params.estimatedCurrentValue,
      actualSalePrice: params.actualSalePrice,
      soldDate: params.soldDate,
    },
  } as unknown as Project;

  const derived = deriveAllProjectMetrics(project);

  const actualIRR = derived.irr || derived.annualizedIrr || null;
  const actualEquityMultiple = derived.kpi33?.equityMultiple || (totalCashInvested > 0 ? Number(((derived.netProfit + totalCashInvested) / totalCashInvested).toFixed(2)) : null);
  const netProfit = derived.netProfit;

  return {
    actualIRR,
    actualEquityMultiple,
    totalCashInvested,
    netProfit,
    completenessPercent,
    missingFields,
  };
}
