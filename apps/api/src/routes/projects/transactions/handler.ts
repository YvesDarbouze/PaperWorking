import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  computeTransactionsNextCursor,
  parseProjectTransactionsQuery,
  type ProjectTransactionsQuery,
} from '../../../lib/projects/transactions-query.js';

export type { ProjectTransactionsQuery };

export type VerifyProjectOrgAccessFn = (input: {
  projectId: string;
  uid: string;
}) => Promise<{ ok: true } | { ok: false; status: number; error: string }>;

export type LoadProjectTransactionsFn = (input: {
  projectId: string;
  reviewedFalseOnly: boolean;
  limit: number;
  cursor: string | null;
}) => Promise<
  Array<{
    id: string;
    plaidId: string | null;
    amount: number;
    date: string;
    merchantName: string | null;
    reiCategory: string | null;
    confidence: number | null;
    pending: boolean;
    reviewedByUser: boolean;
    attributedAt: string | null;
    category: string | null;
  }>
>;

export interface ProjectTransactionsGetDeps {
  requireAuth?: RequireAuthFn;
  verifyOrgAccess?: VerifyProjectOrgAccessFn;
  loadTransactions?: LoadProjectTransactionsFn;
}

/**
 * GET /api/projects/[id]/transactions
 */
export async function handleProjectTransactionsGet(
  projectId: string,
  query: ProjectTransactionsQuery = {},
  deps: ProjectTransactionsGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!projectId?.trim()) {
    return jsonResponse(400, { success: false, error: 'Project ID is required' });
  }

  if (deps.verifyOrgAccess) {
    const access = await deps.verifyOrgAccess({ projectId, uid: auth.uid });
    if (!access.ok) {
      return jsonResponse(access.status, { success: false, error: access.error });
    }
  }

  const parsed = parseProjectTransactionsQuery(query);

  try {
    const transactions = deps.loadTransactions
      ? await deps.loadTransactions({
          projectId,
          reviewedFalseOnly: parsed.reviewedFalseOnly,
          limit: parsed.limit,
          cursor: parsed.cursor,
        })
      : [];

    const nextCursor = computeTransactionsNextCursor(
      transactions.map((t) => t.date),
      parsed.limit,
    );

    return jsonResponse(200, { success: true, transactions, nextCursor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GET /api/projects/[id]/transactions] DB error:', message);
    return jsonResponse(500, { success: false, error: 'Failed to load transactions' });
  }
}
