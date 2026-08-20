import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type GetReconciliationPeriodFn = (
  periodId: string,
) => Promise<Record<string, unknown> | null>;

export interface ReconciliationPeriodGetDeps {
  requireAuth?: RequireAuthFn;
  getPeriod?: GetReconciliationPeriodFn;
}

/**
 * GET /api/reconciliations/[periodId]
 */
export async function handleReconciliationPeriodGet(
  periodId: string,
  deps: ReconciliationPeriodGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const period = deps.getPeriod ? await deps.getPeriod(periodId) : null;
    if (!period) {
      return jsonResponse(404, { success: false, error: 'Reconciliation period not found' });
    }

    return jsonResponse(200, { success: true, period });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[GET /api/reconciliations/[periodId]] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
