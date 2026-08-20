import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';

export type RecalculateProjectKpisFn = (projectId: string) => Promise<Record<string, unknown>>;

export interface ProjectKpisRecalculatePostDeps {
  requireAuth?: RequireAuthFn;
  recalculateKpis?: RecalculateProjectKpisFn;
}

/**
 * POST /api/projects/[id]/kpis/recalculate
 */
export async function handleProjectKpisRecalculatePost(
  projectId: string,
  deps: ProjectKpisRecalculatePostDeps = {},
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

    return jsonResponse(200, { success: true, id: projectId, kpis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[POST /api/projects/${projectId}/kpis/recalculate] Failed:`, message);
    return jsonResponse(500, { success: false, error: message });
  }
}
