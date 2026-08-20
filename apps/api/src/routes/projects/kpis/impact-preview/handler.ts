import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';

export type GetKpiImpactPreviewFn = (transactionId: string) => Promise<Record<string, unknown>>;

export interface ProjectKpisImpactPreviewGetQuery {
  transactionId?: string | null;
}

export interface ProjectKpisImpactPreviewGetDeps {
  requireAuth?: RequireAuthFn;
  getImpactPreview?: GetKpiImpactPreviewFn;
}

/**
 * GET /api/projects/[id]/kpis/impact-preview?transactionId=xxx
 */
export async function handleProjectKpisImpactPreviewGet(
  _projectId: string,
  query: ProjectKpisImpactPreviewGetQuery = {},
  deps: ProjectKpisImpactPreviewGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { success: false, error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const transactionId = query.transactionId;
  if (!transactionId) {
    return jsonResponse(400, {
      success: false,
      error: 'transactionId query parameter is required',
    });
  }

  try {
    const preview = deps.getImpactPreview
      ? await deps.getImpactPreview(transactionId)
      : { transactionId, delta: {} };

    return jsonResponse(200, { success: true, preview });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[GET /api/projects/kpis/impact-preview] Failed:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}
