import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { buildRuleUpdatePatch, validateRuleId } from '../../../lib/rules/validation.js';

export type UpdateTransactionRuleFn = (
  ruleId: string,
  patch: ReturnType<typeof buildRuleUpdatePatch>,
) => Promise<{ rule: Record<string, unknown>; applyResults?: unknown }>;

export type DeactivateTransactionRuleFn = (ruleId: string) => Promise<void>;

export interface RulesByIdPutDeps {
  requireAuth?: RequireAuthFn;
  updateRule?: UpdateTransactionRuleFn;
}

export interface RulesByIdDeleteDeps {
  requireAuth?: RequireAuthFn;
  deactivateRule?: DeactivateTransactionRuleFn;
}

/**
 * PUT /api/rules/[id] — update rule and re-apply.
 */
export async function handleRulesPut(
  ruleId: string,
  body: Record<string, unknown>,
  deps: RulesByIdPutDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!validateRuleId(ruleId)) {
    return jsonResponse(400, { success: false, error: 'id is required' });
  }

  try {
    const patch = buildRuleUpdatePatch(body);
    const result = deps.updateRule
      ? await deps.updateRule(ruleId, patch)
      : { rule: { id: ruleId, ...patch } };

    return jsonResponse(200, {
      success: true,
      rule: result.rule,
      applyResults: result.applyResults,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[PUT /api/rules/${ruleId}] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}

/**
 * DELETE /api/rules/[id] — deactivate rule.
 */
export async function handleRulesDelete(
  ruleId: string,
  deps: RulesByIdDeleteDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!validateRuleId(ruleId)) {
    return jsonResponse(400, { success: false, error: 'id is required' });
  }

  try {
    if (deps.deactivateRule) {
      await deps.deactivateRule(ruleId);
    }

    return jsonResponse(200, { success: true, message: 'Rule deactivated' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[DELETE /api/rules/${ruleId}] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
