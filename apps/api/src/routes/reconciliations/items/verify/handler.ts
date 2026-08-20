import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';

export type VerifyReconciliationItemFn = (input: {
  itemId: string;
  uid: string;
  notes?: string;
}) => Promise<Record<string, unknown>>;

export interface ReconciliationItemVerifyPostDeps {
  requireAuth?: RequireAuthFn;
  verifyItem?: VerifyReconciliationItemFn;
}

/**
 * POST /api/reconciliations/items/[itemId]/verify
 */
export async function handleReconciliationItemVerifyPost(
  itemId: string,
  body: { notes?: unknown } = {},
  deps: ReconciliationItemVerifyPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const period = deps.verifyItem
      ? await deps.verifyItem({
          itemId,
          uid: auth.uid,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
        })
      : { itemId, status: 'VERIFIED' };

    return jsonResponse(200, { success: true, period });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[POST /api/reconciliations/items/[itemId]/verify] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
