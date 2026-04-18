// ── Core Investment Formula Constants ────────────────────────
// These values are the authoritative source for all financial
// calculations across calculators, stores, and API routes.

// Maximum Allowable Offer: MAO = (ARV × 0.70) – Rehab Costs
export const MAO_RULE_FACTOR = 0.70;

// Rehab budget safety margin; use MAX (0.15) for conservative underwriting
export const CONTINGENCY_BUFFER_MIN = 0.10;
export const CONTINGENCY_BUFFER_MAX = 0.15;

// 1% Rule: monthly rent must be ≥ 1% of purchase price to cash-flow
export const ONE_PERCENT_RULE_THRESHOLD = 0.01;

// Properties held past this threshold trigger holding-cost profitability warnings
export const HOLDING_COST_WARNING_DAYS = 166;

// ── Derived Calculators ───────────────────────────────────────

/** MAO = (ARV × 70%) – rehab costs */
export function calculateMAO(arv: number, rehabCost: number): number {
  return arv * MAO_RULE_FACTOR - rehabCost;
}

/** Buffered rehab budget including contingency (defaults to conservative max) */
export function calculateBufferedRehab(
  baseBudget: number,
  buffer = CONTINGENCY_BUFFER_MAX,
): number {
  return baseBudget * (1 + buffer);
}

/** Monthly rent floor for the 1% rule */
export function onePercentRuleThreshold(purchasePrice: number): number {
  return purchasePrice * ONE_PERCENT_RULE_THRESHOLD;
}

/** Returns true when hold duration crosses the 166-day profitability cliff */
export function isHoldingCostWarning(holdDays: number): boolean {
  return holdDays >= HOLDING_COST_WARNING_DAYS;
}

/** Net profit after all costs */
export function calculateNetProfit(params: {
  salePrice: number;
  purchasePrice: number;
  rehabCosts: number;
  holdingCosts: number;
  closingCostsBuy: number;
  closingCostsSell: number;
}): number {
  const { salePrice, purchasePrice, rehabCosts, holdingCosts, closingCostsBuy, closingCostsSell } = params;
  return salePrice - purchasePrice - rehabCosts - holdingCosts - closingCostsBuy - closingCostsSell;
}

/** ROI as a percentage: (netProfit / totalInvestment) × 100 */
export function calculateROI(netProfit: number, totalInvestment: number): number {
  if (totalInvestment === 0) return 0;
  return (netProfit / totalInvestment) * 100;
}

/** Annualized IRR approximation: roi × (365 / holdDays) */
export function calculateAnnualizedIRR(roi: number, holdDays: number): number {
  if (holdDays === 0) return 0;
  return roi * (365 / holdDays);
}
