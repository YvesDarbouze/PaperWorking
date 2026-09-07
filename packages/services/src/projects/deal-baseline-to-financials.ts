import { mergeProjectFinancials } from './merge-project-financials.js';

export type DealBaselineInput = {
  purchasePrice?: number;
  rehabCost?: number;
  arv?: number;
  projectedMonthlyRent?: number;
  holdingCosts?: number;
};

/** Maps deal underwriting baseline fields into project.financials (camelCase). */
export function dealBaselineToFinancials(
  input: DealBaselineInput,
  existing?: Record<string, unknown> | null,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (typeof input.purchasePrice === 'number' && Number.isFinite(input.purchasePrice)) {
    patch.purchasePrice = input.purchasePrice;
  }
  if (typeof input.rehabCost === 'number' && Number.isFinite(input.rehabCost)) {
    patch.projectedRehabCost = input.rehabCost;
  }
  if (typeof input.arv === 'number' && Number.isFinite(input.arv)) {
    patch.projectedSalePrice = input.arv;
  }
  if (typeof input.projectedMonthlyRent === 'number' && Number.isFinite(input.projectedMonthlyRent)) {
    patch.monthlyGrossRent = input.projectedMonthlyRent;
    patch.projectedMonthlyRent = input.projectedMonthlyRent;
    patch.potentialRentalIncomeMonthly = input.projectedMonthlyRent;
  }
  if (typeof input.holdingCosts === 'number' && Number.isFinite(input.holdingCosts)) {
    patch.holdingCostTaxes = input.holdingCosts;
  }

  return mergeProjectFinancials(existing, patch);
}
