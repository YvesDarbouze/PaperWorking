import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type FinalizeReconciliationFn = (input: {
  periodId: string;
  uid: string;
  notes?: string;
}) => Promise<Record<string, unknown>>;

export interface ReconciliationFinalizePostDeps {
  requireAuth?: RequireAuthFn;
  finalizeReconciliation?: FinalizeReconciliationFn;
}

/**
 * POST /api/reconciliations/[periodId]/finalize
 */
export async function handleReconciliationFinalizePost(
  periodId: string,
  body: { notes?: unknown } = {},
  deps: ReconciliationFinalizePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const period = deps.finalizeReconciliation
      ? await deps.finalizeReconciliation({
          periodId,
          uid: auth.uid,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
        })
      : { id: periodId, status: 'FINALIZED' };

    return jsonResponse(200, { success: true, period });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[POST /api/reconciliations/[periodId]/finalize] Error:', message);
    return jsonResponse(400, { success: false, error: message });
  }
}
