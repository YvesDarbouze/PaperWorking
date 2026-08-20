import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type IdentifyTransactionFn = (
  transactionId: string,
) => Promise<{ transactionId: string; result: Record<string, unknown> }>;

export interface TransactionIdentifyPostDeps {
  requireAuth?: RequireAuthFn;
  identifyTransaction?: IdentifyTransactionFn;
}

/**
 * POST /api/transactions/[id]/identify
 */
export async function handleTransactionIdentifyPost(
  transactionId: string,
  deps: TransactionIdentifyPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!transactionId?.trim()) {
    return jsonResponse(400, { success: false, error: 'Transaction ID is required' });
  }

  try {
    const identified = deps.identifyTransaction
      ? await deps.identifyTransaction(transactionId)
      : {
          transactionId,
          result: { paperWorkingCategory: 'MISC_EXPENSE', confidenceScore: 0.5 },
        };

    return jsonResponse(200, { success: true, ...identified });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return jsonResponse(404, { success: false, error: 'Transaction not found' });
    }
    console.error(`[POST /api/transactions/${transactionId}/identify] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
