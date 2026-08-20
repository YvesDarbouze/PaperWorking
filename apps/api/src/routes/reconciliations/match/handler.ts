import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type MatchReconciliationItemsFn = (
  periodId: string,
) => Promise<Record<string, unknown>>;

export interface ReconciliationMatchPostDeps {
  requireAuth?: RequireAuthFn;
  matchItems?: MatchReconciliationItemsFn;
}

/**
 * POST /api/reconciliations/[periodId]/match
 */
export async function handleReconciliationMatchPost(
  periodId: string,
  deps: ReconciliationMatchPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const period = deps.matchItems
      ? await deps.matchItems(periodId)
      : { id: periodId, status: 'MATCHED' };

    return jsonResponse(200, { success: true, period });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[POST /api/reconciliations/[periodId]/match] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
