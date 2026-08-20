import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { validateBulkClassifyBody } from '../../../lib/financial-transactions/bulk-classify.js';

export type BulkClassifyTransactionsFn = (input: {
  ids: string[];
  category: string;
  uid: string;
  createRule?: boolean;
}) => Promise<{ updatedCount: number; projectId?: string }>;

export type EmitProjectEventFn = (projectId: string, event: string) => Promise<void>;

export interface FinancialTransactionsBulkClassifyPostDeps {
  requireAuth?: RequireAuthFn;
  bulkClassify?: BulkClassifyTransactionsFn;
  emitProjectEvent?: EmitProjectEventFn;
}

export interface FinancialTransactionsBulkClassifyBody {
  ids?: unknown;
  category?: unknown;
  createRule?: unknown;
}

/**
 * POST /api/financial-transactions/bulk-classify
 */
export async function handleFinancialTransactionsBulkClassifyPost(
  body: FinancialTransactionsBulkClassifyBody,
  deps: FinancialTransactionsBulkClassifyPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateBulkClassifyBody(body);
  if (!validated.ok) {
    return jsonResponse(400, { success: false, error: validated.error });
  }

  try {
    const result = deps.bulkClassify
      ? await deps.bulkClassify({
          ids: validated.ids,
          category: validated.category,
          uid: auth.uid,
          createRule: body.createRule === true,
        })
      : { updatedCount: 0 };

    if (result.projectId && deps.emitProjectEvent) {
      await deps.emitProjectEvent(result.projectId, 'transactions:approved');
      await deps.emitProjectEvent(result.projectId, 'kpi:updated');
    }

    return jsonResponse(200, {
      success: true,
      updatedCount: result.updatedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/financial-transactions/bulk-classify] Failed:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
