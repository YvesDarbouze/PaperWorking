import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  categoriesForTab,
  formatFinancialTransactionRow,
  parseFinancialTransactionsQuery,
  type FinancialTransactionsByProjectQuery,
} from '../../../lib/financial-transactions/filters.js';

export type ListFinancialTransactionsFn = (input: {
  projectId: string;
  status?: string;
  categories?: readonly string[] | null;
  search?: string;
}) => Promise<Array<Record<string, unknown>>>;

export interface FinancialTransactionsByProjectGetDeps {
  requireAuth?: RequireAuthFn;
  listTransactions?: ListFinancialTransactionsFn;
}

/**
 * GET /api/financial-transactions/project/[projectId]
 */
export async function handleFinancialTransactionsByProjectGet(
  projectId: string,
  query: FinancialTransactionsByProjectQuery = {},
  deps: FinancialTransactionsByProjectGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!projectId?.trim()) {
    return jsonResponse(400, { success: false, error: 'projectId is required' });
  }

  const parsed = parseFinancialTransactionsQuery(query);

  try {
    const categories = categoriesForTab(parsed.tab);
    const rows = deps.listTransactions
      ? await deps.listTransactions({
          projectId,
          status: parsed.status !== 'ALL' ? parsed.status : undefined,
          categories,
          search: parsed.search,
        })
      : [];

    const formatted = rows.map(formatFinancialTransactionRow);

    return jsonResponse(200, {
      success: true,
      projectId,
      count: formatted.length,
      transactions: formatted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[GET /api/financial-transactions/${projectId}] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
