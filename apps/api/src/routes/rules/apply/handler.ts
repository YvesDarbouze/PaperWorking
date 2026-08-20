import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type ApplyTransactionRuleFn = (
  ruleId: string,
) => Promise<Record<string, unknown>>;

export interface RulesApplyPostDeps {
  requireAuth?: RequireAuthFn;
  applyRule?: ApplyTransactionRuleFn;
}

/**
 * POST /api/rules/[id]/apply
 */
export async function handleRulesApplyPost(
  ruleId: string,
  deps: RulesApplyPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!ruleId?.trim()) {
    return jsonResponse(400, { success: false, error: 'id is required' });
  }

  try {
    const result = deps.applyRule
      ? await deps.applyRule(ruleId)
      : { matchedCount: 0, updatedCount: 0 };

    return jsonResponse(200, { success: true, id: ruleId, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[POST /api/rules/${ruleId}/apply] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
