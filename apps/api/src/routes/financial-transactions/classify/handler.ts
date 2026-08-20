import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  validateClassifyBody,
  validateSplitAmounts,
  type TransactionSplit,
} from '../../../lib/financial-transactions/classify.js';

export interface FinancialTransactionEntity {
  id: string;
  projectId: string;
  payee: string | null;
  amount: number | bigint;
  category: string | null;
  matchedLeaseId: string | null;
  notes: string | null;
}

export type GetFinancialTransactionFn = (
  id: string,
) => Promise<FinancialTransactionEntity | null>;

export type ClassifyFinancialTransactionFn = (input: {
  id: string;
  uid: string;
  category?: string;
  matchedLeaseId?: string;
  notes?: string;
  isSplit?: boolean;
  splits?: TransactionSplit[];
  createRule?: boolean;
}) => Promise<FinancialTransactionEntity>;

export type EmitProjectEventFn = (projectId: string, event: string) => Promise<void>;

export interface FinancialTransactionClassifyPostDeps {
  requireAuth?: RequireAuthFn;
  getTransaction?: GetFinancialTransactionFn;
  classifyTransaction?: ClassifyFinancialTransactionFn;
  emitProjectEvent?: EmitProjectEventFn;
}

export interface FinancialTransactionClassifyBody {
  category?: unknown;
  matchedLeaseId?: unknown;
  notes?: unknown;
  isSplit?: unknown;
  splits?: unknown;
  createRule?: unknown;
}

/**
 * POST /api/financial-transactions/[id]/classify
 */
export async function handleFinancialTransactionClassifyPost(
  transactionId: string,
  body: FinancialTransactionClassifyBody,
  deps: FinancialTransactionClassifyPostDeps = {},
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

  const validated = validateClassifyBody(body);
  if (!validated.ok) {
    return jsonResponse(400, { success: false, error: validated.error });
  }

  const isSplit = body.isSplit === true;
  const splits = Array.isArray(body.splits)
    ? (body.splits as TransactionSplit[])
    : undefined;
  const category = typeof body.category === 'string' ? body.category : undefined;

  try {
    const ft = deps.getTransaction ? await deps.getTransaction(transactionId) : null;
    if (!ft) {
      return jsonResponse(404, { success: false, error: 'Transaction not found' });
    }

    if (isSplit && splits?.length) {
      const splitCheck = validateSplitAmounts(splits, Number(ft.amount));
      if (!splitCheck.ok) {
        return jsonResponse(400, { success: false, error: splitCheck.error });
      }
    }

    const updated = deps.classifyTransaction
      ? await deps.classifyTransaction({
          id: transactionId,
          uid: auth.uid,
          category,
          matchedLeaseId:
            typeof body.matchedLeaseId === 'string' ? body.matchedLeaseId : undefined,
          notes: typeof body.notes === 'string' ? body.notes : undefined,
          isSplit,
          splits,
          createRule: body.createRule === true,
        })
      : ft;

    if (deps.emitProjectEvent) {
      await deps.emitProjectEvent(ft.projectId, 'transactions:approved');
      await deps.emitProjectEvent(ft.projectId, 'kpi:updated');
    }

    return jsonResponse(200, { success: true, transaction: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[POST /api/financial-transactions/${transactionId}/classify] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
