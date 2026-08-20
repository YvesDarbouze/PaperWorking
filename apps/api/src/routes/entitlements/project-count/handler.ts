import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';

export type CountActiveProjectsFn = (uid: string) => Promise<number>;

export interface EntitlementsProjectCountGetDeps {
  requireAuth?: RequireAuthFn;
  countActiveProjects?: CountActiveProjectsFn;
}

/**
 * GET /api/entitlements/project-count
 */
export async function handleEntitlementsProjectCountGet(
  deps: EntitlementsProjectCountGetDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const count = deps.countActiveProjects
      ? await deps.countActiveProjects(auth.uid)
      : 0;

    return jsonResponse(200, { count });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Entitlements project-count] Error:', message);
    return jsonResponse(500, { error: 'Failed to fetch project count' });
  }
}
