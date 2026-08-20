export function validateHoldAutoAdvanceBody(body: {
  costBasis?: unknown;
  capitalizedImprovements?: unknown;
  holdingCosts?: unknown;
  outcome?: unknown;
}): {
  ok: true;
  costBasis: number;
  capitalizedImprovements: number;
  holdingCosts: number;
  outcome: string;
} | { ok: false; error: string; status: number; details?: unknown } {
  if (typeof body.costBasis !== 'number') {
    return { ok: false, error: 'Validation failed', status: 400, details: { costBasis: ['Required number'] } };
  }
  if (typeof body.capitalizedImprovements !== 'number') {
    return {
      ok: false,
      error: 'Validation failed',
      status: 400,
      details: { capitalizedImprovements: ['Required number'] },
    };
  }
  if (typeof body.holdingCosts !== 'number') {
    return { ok: false, error: 'Validation failed', status: 400, details: { holdingCosts: ['Required number'] } };
  }
  if (typeof body.outcome !== 'string' || !body.outcome.trim()) {
    return { ok: false, error: 'Validation failed', status: 400, details: { outcome: ['Required string'] } };
  }
  return {
    ok: true,
    costBasis: body.costBasis,
    capitalizedImprovements: body.capitalizedImprovements,
    holdingCosts: body.holdingCosts,
    outcome: body.outcome,
  };
}

export function checkHoldExitGating(financials: Record<string, unknown>): { ok: true } | { ok: false; error: string } {
  const tenantRegistry = financials.tenantRegistry;
  const hasActiveLease =
    Array.isArray(tenantRegistry) && tenantRegistry.some((t) => (t as { status?: string }).status === 'active');
  const incomeLedger = financials.incomeLedger;
  const hasRentPayment =
    Array.isArray(incomeLedger) && incomeLedger.some((i) => (i as { amount?: number }).amount! > 0);
  const hasSaleContract = financials.sale_under_contract === true;
  if (!hasActiveLease && !hasRentPayment && !hasSaleContract) {
    return {
      ok: false,
      error:
        'Gating violation: Hold to Exit transition requires a verified event (active lease, rent payment, or sale under contract).',
    };
  }
  return { ok: true };
}

export function buildHoldAutoAdvanceUpdate(input: {
  existingFinancials: Record<string, unknown>;
  costBasis: number;
  capitalizedImprovements: number;
  holdingCosts: number;
  outcome: string;
}): Record<string, unknown> {
  return {
    phaseStatus: 'Phase 4: Exit',
    currentPhase: 4,
    status: 'exit',
    financials: {
      ...input.existingFinancials,
      exit_cost_basis: input.costBasis,
      exit_capitalized_improvements: input.capitalizedImprovements,
      exit_holding_cost_total: input.holdingCosts,
      exit_marketing_outcome: input.outcome,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function validateReilCronAuth(input: {
  cronSecret?: string;
  authorization?: string | null;
  queryToken?: string | null;
  isAdmin?: boolean;
}): boolean {
  if (input.cronSecret) {
    if (input.authorization === `Bearer ${input.cronSecret}`) return true;
    if (input.queryToken === input.cronSecret) return true;
  }
  return input.isAdmin === true;
}
