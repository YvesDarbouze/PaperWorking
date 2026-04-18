/**
 * ── Financial Engine — PaperWorking
 * Precision-based real estate accounting logic using integer arithmetic (cents).
 * 
 * Formula: Net Profit = Sale Price - (Purchase Price + Closing Costs + Renovation Costs + Holding Costs)
 */

export interface ProfitVariance {
  projectedProfit: number;
  actualProfit: number;
  variance: number;
  percentageVariance: number;
}

/**
 * Calculates the core profit formula.
 * All inputs and outputs are in Cents (integers).
 */
export function calculateNetProfit(
  salePrice: number,
  purchasePrice: number,
  closingCosts: number,
  renovationCosts: number,
  holdingCosts: number
): number {
  return salePrice - (purchasePrice + closingCosts + renovationCosts + holdingCosts);
}

/**
 * Formats cents into a dollar string for UI display.
 */
export function formatCentsToDollars(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Aggregate multiple deal financials into a performance snapshot.
 */
export function aggregateFinancials(financials: any[]) {
  return financials.reduce((acc, curr) => {
    acc.totalPurchasePrice += curr.purchasePrice || 0;
    acc.totalSalePrice += curr.salePrice || 0;
    acc.totalClosingCosts += curr.closingCosts || 0;
    acc.totalRenovationCosts += curr.renovationCosts || 0;
    acc.totalHoldingCosts += curr.holdingCosts || 0;
    return acc;
  }, {
    totalPurchasePrice: 0,
    totalSalePrice: 0,
    totalClosingCosts: 0,
    totalRenovationCosts: 0,
    totalHoldingCosts: 0,
  });
}

/**
 * Calculates the Waterfall distribution based on priority roles.
 */
export interface WaterfallDistribution {
  payee: string;
  role: string;
  amount: number;
}

export function calculateWaterfall(
  availableCash: number,
  payoutRules: { role: string, payee: string, amount: number }[]
): WaterfallDistribution[] {
  let remaining = availableCash;
  const distribution: WaterfallDistribution[] = [];

  // Simple priority order logic can be added here
  for (const rule of payoutRules) {
    const payout = Math.min(remaining, rule.amount);
    distribution.push({
      payee: rule.payee,
      role: rule.role,
      amount: payout
    });
    remaining -= payout;
  }

  return distribution;
}
