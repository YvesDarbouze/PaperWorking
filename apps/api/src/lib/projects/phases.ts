export function mergeProjectFinancials(
  existing: Record<string, unknown> | undefined,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  return { ...(existing || {}), ...patch };
}

export function buildPhasePatchUpdate(input: {
  existingFinancials?: Record<string, unknown>;
  financials?: Record<string, unknown>;
  topLevelUpdates?: Record<string, unknown>;
  rehab?: Record<string, unknown>;
  existingRehab?: Record<string, unknown>;
  holdingCosts?: unknown;
  rehabExpenses?: unknown;
}): Record<string, unknown> {
  const update: Record<string, unknown> = {
    ...(input.topLevelUpdates || {}),
    updatedAt: new Date().toISOString(),
  };
  if (input.financials) {
    update.financials = mergeProjectFinancials(input.existingFinancials, input.financials);
  }
  if (input.rehab) {
    update.rehab = {
      baseBudget: 0,
      contingencyBufferPercentage: 0.15,
      tasks: [],
      permits: [],
      pendingReceipts: [],
      drawRequests: [],
      ...(input.existingRehab || {}),
      ...input.rehab,
    };
  }
  if (input.holdingCosts !== undefined) update.holdingCosts = input.holdingCosts;
  if (input.rehabExpenses !== undefined) update.rehabExpenses = input.rehabExpenses;
  return update;
}

export const PURCHASE_FINANCING_FIELDS = new Set([
  'loanAmount',
  'loanInterestRate',
  'loanTermYears',
  'financingType',
  'loanOriginationPoints',
  'closingCosts',
  'totalCashInvested',
  'loanProcessorName',
  'closingAttorneyName',
  'inspectionCost',
  'titleSearchCost',
  'insuranceCost',
  'hoaMonthly',
  'purchasePrice',
  'initialCapitalizedBasis',
]);

export function filterPurchaseFinancingFields(
  financials: Record<string, unknown>,
): Record<string, unknown> {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(financials)) {
    if (PURCHASE_FINANCING_FIELDS.has(key)) filtered[key] = value;
  }
  return filtered;
}

export function buildExitRealizedUpdate(): Record<string, unknown> {
  return {
    exitRealized: true,
    status: 'exit',
    updatedAt: new Date().toISOString(),
  };
}
