export type ExitStrategy = 'Sell' | 'Refinance' | 'Hold';

export interface ExitCompleteBody {
  projectId?: unknown;
  strategy?: unknown;
}

export function parseExitCompleteBody(
  body: ExitCompleteBody,
): { ok: true; projectId: string; strategy: ExitStrategy } | { ok: false; error: string } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!projectId) {
    return { ok: false, error: 'projectId is required' };
  }

  const strategyRaw = typeof body.strategy === 'string' ? body.strategy : 'Sell';
  if (strategyRaw !== 'Sell' && strategyRaw !== 'Refinance' && strategyRaw !== 'Hold') {
    return { ok: false, error: 'Invalid exit strategy' };
  }

  return { ok: true, projectId, strategy: strategyRaw };
}

export function computeExitWaterfall(financials: Record<string, unknown> = {}): {
  purchasePrice: number;
  rehabCosts: number;
  holdingCosts: number;
  salePrice: number;
  loanPayoff: number;
  cashInvested: number;
  grossProfit: number;
  netProfit: number;
  lpReturns: number;
  leadInvestorPromote: number;
  holdPeriodDays: number;
} {
  const purchasePrice = (Number(financials.purchasePrice) || 22000000) / 100;
  const rehabCosts = (Number(financials.projectedRehabCost) || 4500000) / 100;
  const holdingCosts = (Number(financials.annualDebtService) || 1200000) / 100;
  const salePrice = Number(financials.exitListPrice) || 320000;
  const loanPayoff = (Number(financials.loanAmount) || 18000000) / 100;
  const cashInvested = (Number(financials.totalCashInvested) || 8000000) / 100;

  const grossProfit = salePrice - purchasePrice - rehabCosts - holdingCosts;
  const netProfit = grossProfit - salePrice * 0.08;
  const lpReturns = cashInvested * 1.08;
  const leadInvestorPromote = Math.max(0, (netProfit - (lpReturns - cashInvested)) * 0.2);

  return {
    purchasePrice,
    rehabCosts,
    holdingCosts,
    salePrice,
    loanPayoff,
    cashInvested,
    grossProfit,
    netProfit,
    lpReturns,
    leadInvestorPromote,
    holdPeriodDays: 325,
  };
}
