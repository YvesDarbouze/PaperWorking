import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import {
  isAdminAuthFailure,
  type RequireAdminFn,
} from '../../../../lib/auth/admin-types.js';
import { buildPurgeAllSummary } from '../../../../lib/admin/agent-crew.js';

export type PurgeAllSyntheticAgentsFn = () => Promise<{
  usersDeleted: number;
  projectsDeleted: number;
  listingsDeleted: number;
  messagesDeleted: number;
  subscriptionsCanceled: number;
}>;

export interface AdminAgentCrewPurgeAllDeleteDeps {
  requireAdmin?: RequireAdminFn;
  purgeAll?: PurgeAllSyntheticAgentsFn;
}

/**
 * DELETE /api/admin/agent-crew/purge-all
 */
export async function handleAdminAgentCrewPurgeAllDelete(
  deps: AdminAgentCrewPurgeAllDeleteDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAdmin) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const auth = await deps.requireAdmin();
  if (isAdminAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const counts = deps.purgeAll
      ? await deps.purgeAll()
      : {
          usersDeleted: 0,
          projectsDeleted: 0,
          listingsDeleted: 0,
          messagesDeleted: 0,
          subscriptionsCanceled: 0,
        };

    return jsonResponse(200, buildPurgeAllSummary(counts));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AdminAgentCrew/purge-all DELETE]', message);
    return jsonResponse(500, { error: 'Failed to purge synthetic agent data', message });
  }
}
