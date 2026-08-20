import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import { aggregateKpiBreakdown } from '../../../../lib/projects/kpis.js';

export type LoadApprovedTransactionsForBreakdownFn = (input: {
  projectId: string;
  startDate?: string | null;
  endDate?: string | null;
}) => Promise<Array<{ category: string; source?: string | null; amount: number }>>;

export interface ProjectKpisBreakdownGetQuery {
  groupBy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ProjectKpisBreakdownGetDeps {
  requireAuth?: RequireAuthFn;
  loadTransactions?: LoadApprovedTransactionsForBreakdownFn;
}

/**
 * GET /api/projects/[id]/kpis/breakdown
 */
export async function handleProjectKpisBreakdownGet(
  projectId: string,
  query: ProjectKpisBreakdownGetQuery = {},
  deps: ProjectKpisBreakdownGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const groupBy = query.groupBy || 'classification';

  try {
    const transactions = deps.loadTransactions
      ? await deps.loadTransactions({
          projectId,
          startDate: query.startDate,
          endDate: query.endDate,
        })
      : [];

    const breakdown = aggregateKpiBreakdown(transactions, groupBy);

    return jsonResponse(200, {
      success: true,
      id: projectId,
      groupBy,
      totalCount: transactions.length,
      breakdown,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[GET /api/projects/${projectId}/kpis/breakdown] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
