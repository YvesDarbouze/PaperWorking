/* ═══════════════════════════════════════════════════════
   PaperWorking — Deals Funding & Card Mapping Utilities
   (PROMPT 3 — Deals Marketplace Browse + Detail Page)
   ═══════════════════════════════════════════════════════ */

export interface FundingProgressInfo {
  fundingTarget: number;
  committedAmount: number;
  remainingAmount: number;
  percentFunded: number;
  isFullyFunded: boolean;
  currency: string;
  formattedTarget: string;
  formattedCommitted: string;
  formattedRemaining: string;
  investorCount: number;
}

export function formatCurrencyAmount(amount: number, currency: string = 'USD'): string {
  const abs = Math.abs(amount || 0);
  const formatted = abs.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return amount < 0 ? `-${formatted}` : formatted;
}

/**
 * Calculates funding progress percentage, remaining amounts, and formatted currency strings.
 */
export function calculateFundingProgress(
  fundingTarget: number = 0,
  committedAmount: number = 0,
  investorCount: number = 0,
  currency: string = 'USD'
): FundingProgressInfo {
  const target = Math.max(0, fundingTarget);
  const committed = Math.max(0, committedAmount);
  const remaining = Math.max(0, target - committed);
  const percentFunded = target > 0 ? Math.min(100, Math.round((committed / target) * 100)) : 0;
  const isFullyFunded = target > 0 && committed >= target;

  return {
    fundingTarget: target,
    committedAmount: committed,
    remainingAmount: remaining,
    percentFunded,
    isFullyFunded,
    currency,
    formattedTarget: formatCurrencyAmount(target, currency),
    formattedCommitted: formatCurrencyAmount(committed, currency),
    formattedRemaining: formatCurrencyAmount(remaining, currency),
    investorCount: Math.max(0, investorCount),
  };
}

/**
 * Maps raw Deal or Listing data to headline metrics for the Deal Card.
 */
export function mapDealCardMetrics(deal: {
  price?: number;
  rehabCost?: number;
  arv?: number;
  askingPriceCents?: number;
  capRate?: number;
  cashOnCash?: number;
  projectedROI?: number;
  netOperatingIncome?: number;
  estimatedRent?: number;
}) {
  const purchasePrice = deal.price || (deal.askingPriceCents ? deal.askingPriceCents / 100 : 0);
  const rehabCost = deal.rehabCost || 0;
  const arv = deal.arv || (purchasePrice ? purchasePrice * 1.35 : 0);
  const monthlyRent = deal.estimatedRent || (purchasePrice ? (purchasePrice * 0.009) : 0);

  // Derived metrics if not present
  const noi = deal.netOperatingIncome || (monthlyRent ? monthlyRent * 12 * 0.65 : 0);
  const capRate = deal.capRate !== undefined ? deal.capRate : (purchasePrice > 0 ? (noi / purchasePrice) * 100 : 7.5);
  const totalInvestment = purchasePrice + rehabCost;
  const cashOnCash = deal.cashOnCash !== undefined ? deal.cashOnCash : (totalInvestment > 0 ? ((noi - (purchasePrice * 0.75 * 0.07)) / (totalInvestment * 0.25)) * 100 : 12.0);
  const projectedROI = deal.projectedROI !== undefined ? deal.projectedROI : (arv && purchasePrice ? ((arv - (purchasePrice + rehabCost)) / (purchasePrice + rehabCost)) * 100 : 22.0);

  return {
    purchasePrice,
    rehabCost,
    arv,
    monthlyRent,
    noi,
    capRate: Number(capRate.toFixed(1)),
    cashOnCash: Number(cashOnCash.toFixed(1)),
    projectedROI: Number(projectedROI.toFixed(1)),
  };
}
