import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type ApproveFinancialTransactionFn = (input: {
  id: string;
  uid: string;
}) => Promise<Record<string, unknown> | null>;

export type EmitProjectEventFn = (projectId: string, event: string) => Promise<void>;

export interface FinancialTransactionApprovePostDeps {
  requireAuth?: RequireAuthFn;
  approveTransaction?: ApproveFinancialTransactionFn;
  emitProjectEvent?: EmitProjectEventFn;
}

/**
 * POST /api/financial-transactions/[id]/approve
 */
export async function handleFinancialTransactionApprovePost(
  transactionId: string,
  deps: FinancialTransactionApprovePostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!transactionId) {
    return jsonResponse(400, { success: false, error: 'Transaction ID is required' });
  }

  try {
    const updated = deps.approveTransaction
      ? await deps.approveTransaction({ id: transactionId, uid: auth.uid })
      : null;

    if (!updated) {
      return jsonResponse(404, { success: false, error: 'Transaction not found' });
    }

    const projectId = updated.projectId;
    if (typeof projectId === 'string' && deps.emitProjectEvent) {
      await deps.emitProjectEvent(projectId, 'transactions:approved');
      await deps.emitProjectEvent(projectId, 'kpi:updated');
    }

    return jsonResponse(200, { success: true, transaction: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/financial-transactions/${transactionId}/approve] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
