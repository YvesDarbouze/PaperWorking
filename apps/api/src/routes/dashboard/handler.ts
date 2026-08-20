import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';

export type LoadDashboardFn = (input: {
  uid: string;
  organizationId?: string | null;
}) => Promise<Record<string, unknown>>;

export interface DashboardGetQuery {
  organizationId?: string | null;
}

export interface DashboardGetDeps {
  requireAuth?: RequireAuthFn;
  loadDashboard?: LoadDashboardFn;
}

/**
 * GET /api/dashboard — organization dashboard aggregates.
 */
export async function handleDashboardGet(
  query: DashboardGetQuery,
  deps: DashboardGetDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    if (!deps.loadDashboard) {
      return jsonResponse(500, { error: 'Dashboard loader not configured' });
    }

    const payload = await deps.loadDashboard({
      uid: auth.uid,
      organizationId: query.organizationId,
    });

    return jsonResponse(200, payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Dashboard GET] Error:', message);
    return jsonResponse(500, { error: 'Failed to fetch dashboard data', details: message });
  }
}
