import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  isAdminAuthFailure,
  type RequireAdminFn,
} from '../../../lib/auth/admin-types.js';

export interface SyntheticAgentSummary {
  id: string;
  uid: string;
  name: string;
  email: string;
  persona: string;
  handle: string;
  stats: {
    projectsCount: number;
    listingsCount: number;
    messagesCount: number;
  };
  [key: string]: unknown;
}

export type ListSyntheticAgentsFn = () => Promise<SyntheticAgentSummary[]>;

export interface AdminAgentCrewGetDeps {
  requireAdmin?: RequireAdminFn;
  listAgents?: ListSyntheticAgentsFn;
}

/**
 * GET /api/admin/agent-crew — migrated read path (data loading injected for dual-DB wiring).
 */
export async function handleAdminAgentCrewGet(
  deps: AdminAgentCrewGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAdmin) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  const auth = await deps.requireAdmin();
  if (isAdminAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  try {
    const agents = deps.listAgents ? await deps.listAgents() : [];

    return jsonResponse(200, {
      success: true,
      count: agents.length,
      agents,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[AdminAgentCrew GET]', message);
    return jsonResponse(500, { error: 'Failed to fetch synthetic agents', message });
  }
}
