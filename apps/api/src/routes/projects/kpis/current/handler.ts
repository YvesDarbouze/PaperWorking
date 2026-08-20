import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import {
  buildMockKpiTrends,
  mapRecentActivityFromTransactions,
} from '../../../../lib/projects/kpis.js';

export type RecalculateProjectKpisFn = (projectId: string) => Promise<Record<string, unknown>>;

export type LoadRecentApprovedTransactionsFn = (
  projectId: string,
) => Promise<
  Array<{
    id: string;
    payee: string | null;
    category: string;
    amount: number;
    transactionDate: string;
  }>
>;

export interface ProjectKpisCurrentGetDeps {
  requireAuth?: RequireAuthFn;
  recalculateKpis?: RecalculateProjectKpisFn;
  loadRecentTransactions?: LoadRecentApprovedTransactionsFn;
}

/**
 * GET /api/projects/[id]/kpis/current
 */
export async function handleProjectKpisCurrentGet(
  projectId: string,
  deps: ProjectKpisCurrentGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  if (!projectId?.trim()) {
    return jsonResponse(400, { success: false, error: 'id is required' });
  }

  try {
    const kpis = deps.recalculateKpis
      ? await deps.recalculateKpis(projectId)
      : { snapshotAt: new Date().toISOString() };

    const recentApproved = deps.loadRecentTransactions
      ? await deps.loadRecentTransactions(projectId)
      : [];

    const recentActivity = mapRecentActivityFromTransactions(recentApproved);
    const trends = buildMockKpiTrends();

    return jsonResponse(200, {
      success: true,
      id: projectId,
      kpis,
      recentActivity,
      trends,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[GET /api/projects/${projectId}/kpis/current] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
