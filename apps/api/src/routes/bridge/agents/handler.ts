import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  isBridgeServicePaused,
  mapBridgeAgentResults,
  validateBridgeLookupParams,
  validateBridgeNameQuery,
} from '../../../lib/bridge/helpers.js';

export type GetBridgeAgentFn = (memberKey: string) => Promise<Record<string, unknown> | null>;
export type GetBridgeAgentListingsFn = (memberKey: string) => Promise<Array<Record<string, unknown>>>;
export type SearchBridgeAgentsFn = (query: string, limit?: number) => Promise<Array<Record<string, unknown>>>;

export interface BridgeAgentsGetDeps {
  requireAuth?: RequireAuthFn;
  getAgent?: GetBridgeAgentFn;
  getAgentListings?: GetBridgeAgentListingsFn;
  searchAgents?: SearchBridgeAgentsFn;
}

/**
 * GET /api/bridge/agents
 */
export async function handleBridgeAgentsGet(
  query: { q?: string | null; key?: string | null; listings?: string | null },
  deps: BridgeAgentsGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const parsed = validateBridgeLookupParams(query);
  if (!parsed.ok) return jsonResponse(parsed.status, { error: parsed.error });

  try {
    if (parsed.mode === 'lookup' && parsed.key) {
      const agent = deps.getAgent ? await deps.getAgent(parsed.key) : null;
      if (!agent) return jsonResponse(404, { error: 'Agent not found.' });
      const listings =
        query.listings === 'true' && deps.getAgentListings
          ? await deps.getAgentListings(parsed.key)
          : undefined;
      return jsonResponse(200, { agent, listings });
    }

    const validated = validateBridgeNameQuery(parsed.q);
    if (!validated.ok) {
      if (validated.status === 200) return jsonResponse(200, { results: [] });
      return jsonResponse(validated.status, { results: [], error: validated.error });
    }

    const results = deps.searchAgents ? await deps.searchAgents(validated.query, 10) : [];
    return jsonResponse(200, { results: mapBridgeAgentResults(results) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (isBridgeServicePaused(message)) {
      return jsonResponse(200, { results: [], unavailable: true });
    }
    console.error('[BRIDGE AGENTS] Error:', message);
    return jsonResponse(502, { error: 'Agent search unavailable.', results: [] });
  }
}
