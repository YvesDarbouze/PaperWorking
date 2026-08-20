import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';

export type AdjustReconciliationItemFn = (input: {
  itemId: string;
  amount?: number;
  category?: string;
  notes?: string;
}) => Promise<Record<string, unknown>>;

export interface ReconciliationItemAdjustPostDeps {
  requireAuth?: RequireAuthFn;
  adjustItem?: AdjustReconciliationItemFn;
}

/**
 * POST /api/reconciliations/items/[itemId]/adjust
 */
export async function handleReconciliationItemAdjustPost(
  itemId: string,
  body: { amount?: unknown; category?: unknown; notes?: unknown } = {},
  deps: ReconciliationItemAdjustPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const period = deps.adjustItem
      ? await deps.adjustItem({
          itemId,
          amount: body.amount !== undefined ? Number(body.amount) : undefined,
          category: typeof body.category === 'string' ? body.category : undefined,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
        })
      : { itemId, status: 'ADJUSTED' };

    return jsonResponse(200, { success: true, period });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[POST /api/reconciliations/items/[itemId]/adjust] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
