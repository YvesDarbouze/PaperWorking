import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  buildFinancialTransactionsPagination,
  parseFinancialTransactionsListQuery,
  serializeFinancialTransactionRow,
  validateManualFinancialTransactionBody,
  type FinancialTransactionsListQuery,
} from '../../../lib/financial/transactions.js';

export type ListFinancialTransactionsUnifiedFn = (
  uid: string,
  filters: ReturnType<typeof parseFinancialTransactionsListQuery>,
) => Promise<{ rows: Array<Record<string, unknown>>; total: number }>;

export type CreateManualFinancialTransactionFn = (
  uid: string,
  body: Record<string, unknown>,
) => Promise<Record<string, unknown>>;

export type VerifyFinancialTransactionProjectFn = (
  uid: string,
  projectId: string,
) => Promise<boolean>;

export interface FinancialTransactionsGetDeps {
  requireAuth?: RequireAuthFn;
  listTransactions?: ListFinancialTransactionsUnifiedFn;
}

export interface FinancialTransactionsPostDeps {
  requireAuth?: RequireAuthFn;
  verifyProject?: VerifyFinancialTransactionProjectFn;
  createTransaction?: CreateManualFinancialTransactionFn;
}

/**
 * GET /api/financial/transactions
 */
export async function handleFinancialTransactionsGet(
  query: FinancialTransactionsListQuery = {},
  deps: FinancialTransactionsGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const filters = parseFinancialTransactionsListQuery(query);

  try {
    const result = deps.listTransactions
      ? await deps.listTransactions(auth.uid, filters)
      : { rows: [], total: 0 };

    return jsonResponse(200, {
      success: true,
      transactions: result.rows.map(serializeFinancialTransactionRow),
      pagination: buildFinancialTransactionsPagination(filters.page, filters.pageSize, result.total),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FinancialTransactions GET] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}

/**
 * POST /api/financial/transactions
 */
export async function handleFinancialTransactionsPost(
  body: Record<string, unknown>,
  deps: FinancialTransactionsPostDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateManualFinancialTransactionBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { success: false, error: validated.error });
  }

  const allowed = deps.verifyProject
    ? await deps.verifyProject(auth.uid, validated.projectId)
    : true;

  if (!allowed) {
    return jsonResponse(403, { success: false, error: 'Project not found or access denied' });
  }

  try {
    const tx = deps.createTransaction
      ? await deps.createTransaction(auth.uid, body)
      : {
          id: 'tx-demo',
          projectId: validated.projectId,
          amount: validated.amount.toFixed(2),
        };

    return jsonResponse(200, {
      success: true,
      transaction: serializeFinancialTransactionRow(tx),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FinancialTransactions POST] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
