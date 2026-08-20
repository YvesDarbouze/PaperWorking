import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import { validateCreateRuleBody } from '../../lib/rules/validation.js';

export type CreateTransactionRuleFn = (input: {
  uid: string;
  projectId: string;
  name: string;
  ruleType?: string;
  conditions: unknown;
  action: unknown;
  priority?: number;
}) => Promise<{ rule: Record<string, unknown>; applyResults?: unknown }>;

export interface RulesPostDeps {
  requireAuth?: RequireAuthFn;
  createRule?: CreateTransactionRuleFn;
}

/**
 * POST /api/rules — create rule and apply to pending transactions.
 */
export async function handleRulesPost(
  body: Record<string, unknown>,
  deps: RulesPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateCreateRuleBody(body);
  if (!validated.ok) {
    return jsonResponse(400, { success: false, error: validated.error });
  }

  try {
    const result = deps.createRule
      ? await deps.createRule({
          uid: auth.uid,
          ...validated.value,
        })
      : { rule: { id: 'rule-mock' } };

    return jsonResponse(200, {
      success: true,
      rule: result.rule,
      applyResults: result.applyResults,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/rules] Failed:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
