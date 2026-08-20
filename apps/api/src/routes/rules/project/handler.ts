import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type ListProjectRulesFn = (
  projectId: string,
) => Promise<Array<Record<string, unknown>>>;

export interface RulesProjectGetDeps {
  requireAuth?: RequireAuthFn;
  listRules?: ListProjectRulesFn;
}

/**
 * GET /api/rules/project/[projectId]
 */
export async function handleRulesProjectGet(
  projectId: string,
  deps: RulesProjectGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!projectId) {
    return jsonResponse(400, { success: false, error: 'projectId is required' });
  }

  try {
    const rules = deps.listRules ? await deps.listRules(projectId) : [];

    return jsonResponse(200, {
      success: true,
      projectId,
      count: rules.length,
      rules,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/rules/${projectId}] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
