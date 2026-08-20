import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  categoriesForTab,
  formatFinancialTransaction,
  normalizeSearchQuery,
  type FinancialTransactionRecord,
} from '../../../lib/financial-transactions/categories.js';

export interface FinancialTransactionsListQuery {
  status?: string | null;
  tab?: string | null;
  search?: string | null;
}

export type ListFinancialTransactionsFn = (filters: {
  projectId: string;
  status: string;
  tab: string;
  search?: string;
}) => Promise<FinancialTransactionRecord[]>;

export interface FinancialTransactionsListGetDeps {
  requireAuth?: RequireAuthFn;
  listTransactions?: ListFinancialTransactionsFn;
}

/**
 * GET /api/financial-transactions/project/[projectId]
 */
export async function handleFinancialTransactionsListGet(
  projectId: string,
  query: FinancialTransactionsListQuery,
  deps: FinancialTransactionsListGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!projectId) {
    return jsonResponse(400, { success: false, error: 'projectId is required' });
  }

  const statusParam = query.status || 'PENDING_REVIEW';
  const tabParam = (query.tab || 'ALL').toUpperCase();
  const searchQuery = normalizeSearchQuery(query.search);

  try {
    const raw = deps.listTransactions
      ? await deps.listTransactions({
          projectId,
          status: statusParam,
          tab: tabParam,
          search: searchQuery,
        })
      : [];

    let transactions = raw;

    if (statusParam !== 'ALL') {
      transactions = transactions.filter((t) => t.status === statusParam);
    }

    const tabCategories = categoriesForTab(tabParam);
    if (tabCategories) {
      transactions = transactions.filter(
        (t) => t.category && tabCategories.includes(t.category),
      );
    }

    if (searchQuery) {
      transactions = transactions.filter((t) => {
        const payee = (t.payee || '').toLowerCase();
        const description = (t.description || '').toLowerCase();
        return payee.includes(searchQuery) || description.includes(searchQuery);
      });
    }

    const formatted = transactions.map(formatFinancialTransaction);

    return jsonResponse(200, {
      success: true,
      projectId,
      count: formatted.length,
      transactions: formatted,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[GET /api/financial-transactions/${projectId}] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
