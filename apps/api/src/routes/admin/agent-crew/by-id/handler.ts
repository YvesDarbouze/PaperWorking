import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import {
  isAdminAuthFailure,
  type RequireAdminFn,
} from '../../../../lib/auth/admin-types.js';

export type LoadAgentDetailFn = (agentId: string) => Promise<Record<string, unknown> | null>;

export type DeleteSyntheticAgentFn = (agentId: string) => Promise<{ message: string }>;

export interface AdminAgentCrewByIdGetDeps {
  requireAdmin?: RequireAdminFn;
  loadAgent?: LoadAgentDetailFn;
}

export interface AdminAgentCrewByIdDeleteDeps {
  requireAdmin?: RequireAdminFn;
  deleteAgent?: DeleteSyntheticAgentFn;
}

/**
 * GET /api/admin/agent-crew/[id]
 */
export async function handleAdminAgentCrewByIdGet(
  agentId: string,
  deps: AdminAgentCrewByIdGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAdmin) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const auth = await deps.requireAdmin();
  if (isAdminAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const agent = deps.loadAgent ? await deps.loadAgent(agentId) : null;
    if (!agent) {
      return jsonResponse(404, { error: 'Agent not found' });
    }

    return jsonResponse(200, { success: true, agent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AdminAgentCrew/[id] GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch agent details', message });
  }
}

/**
 * DELETE /api/admin/agent-crew/[id]
 */
export async function handleAdminAgentCrewByIdDelete(
  agentId: string,
  deps: AdminAgentCrewByIdDeleteDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAdmin) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const auth = await deps.requireAdmin();
  if (isAdminAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const result = deps.deleteAgent
      ? await deps.deleteAgent(agentId)
      : { message: `Successfully deleted synthetic agent ${agentId} and all associated records.` };

    return jsonResponse(200, { success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AdminAgentCrew/[id] DELETE]', message);
    return jsonResponse(500, { error: 'Failed to delete synthetic agent', message });
  }
}
