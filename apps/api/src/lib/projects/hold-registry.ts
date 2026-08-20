export function mergeHoldRegistryUpdate(
  existing: Record<string, unknown>,
  validated: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing };

  const scalarFields = [
    'renovationTier',
    'rehabBudget',
    'rehabCompletionTarget',
    'rehabCompletedDate',
    'targetRent',
    'targetLeaseTerms',
    'listPriceSale',
    'occupancyDuringHold',
    'utilitiesResponsibility',
    'reservePolicies',
  ] as const;

  for (const field of scalarFields) {
    if (validated[field] !== undefined) merged[field] = validated[field];
  }

  const arrayFields = [
    'rehabSpend',
    'currentValueSeries',
    'listingAdLog',
    'showingsLog',
    'screeningChecklist',
    'reserveFundingStatus',
  ] as const;

  for (const field of arrayFields) {
    if (validated[field] !== undefined) merged[field] = validated[field];
  }

  if (validated.holdingCosts !== undefined) {
    merged.holdingCosts = {
      ...((existing.holdingCosts as Record<string, unknown> | undefined) || {}),
      ...(validated.holdingCosts as Record<string, unknown>),
    };
  }

  const rehabSpend = merged.rehabSpend as Array<{ amount: number }> | undefined;
  if (rehabSpend?.length) {
    merged.rehabSpendTotal = rehabSpend.reduce((sum, entry) => sum + entry.amount, 0);
  }

  return merged;
}

export function buildExitRealizedPayload(input: {
  existingFinancials: Record<string, unknown>;
  financials?: Record<string, unknown>;
  topLevelUpdates?: Record<string, unknown>;
}): Record<string, unknown> {
  const now = new Date().toISOString();
  const mergedFinancials: Record<string, unknown> = {
    ...input.existingFinancials,
    ...(input.financials || {}),
  };

  if (!mergedFinancials.soldDate) mergedFinancials.soldDate = now;
  if (!mergedFinancials.actualSalePrice && mergedFinancials.projectedSalePrice) {
    mergedFinancials.actualSalePrice = mergedFinancials.projectedSalePrice;
  } else if (!mergedFinancials.actualSalePrice && input.existingFinancials.projectedSalePrice) {
    mergedFinancials.actualSalePrice = input.existingFinancials.projectedSalePrice;
  }
  mergedFinancials.exitRealized = true;
  mergedFinancials.realizedAt = now;

  return {
    ...(input.topLevelUpdates || {}),
    reiStatus: 'realized',
    currentPhase: 4,
    status: 'exit',
    closedAt: now,
    phaseStatus: 'Phase 4: Realized',
    financials: mergedFinancials,
    updatedAt: now,
  };
}

export const CANONICAL_PROJECT_STATUSES = ['acquisition', 'fund', 'hold', 'exit'] as const;

export function validateExitStatus(status: string): { ok: true } | { ok: false; error: string } {
  if (!(CANONICAL_PROJECT_STATUSES as readonly string[]).includes(status)) {
    return {
      ok: false,
      error: `Invalid status: '${status}'. Status must be a canonical lowercase key: 'acquisition', 'fund', 'hold', or 'exit'.`,
    };
  }
  return { ok: true };
}

export function validateAssignmentStatusPatch(body: {
  status?: unknown;
}): { ok: true; status: 'OPEN' | 'FILLED' } | { ok: false; error: string; status: number } {
  const status = body.status;
  if (status !== 'OPEN' && status !== 'FILLED') {
    return { ok: false, error: 'status must be OPEN or FILLED', status: 422 };
  }
  return { ok: true, status };
}
