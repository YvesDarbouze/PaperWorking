import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  isBridgeServicePaused,
  mapBridgeOfficeResults,
  OFFICE_QUERY_PATTERN,
  validateBridgeNameQuery,
  validateBridgeOfficeLookupParams,
} from '../../../lib/bridge/helpers.js';

export type GetBridgeOfficeFn = (officeKey: string) => Promise<Record<string, unknown> | null>;
export type GetBridgeOfficeAgentsFn = (officeKey: string) => Promise<Array<Record<string, unknown>>>;
export type SearchBridgeOfficesFn = (query: string, limit?: number) => Promise<Array<Record<string, unknown>>>;

export interface BridgeOfficesGetDeps {
  requireAuth?: RequireAuthFn;
  getOffice?: GetBridgeOfficeFn;
  getOfficeAgents?: GetBridgeOfficeAgentsFn;
  searchOffices?: SearchBridgeOfficesFn;
}

/**
 * GET /api/bridge/offices
 */
export async function handleBridgeOfficesGet(
  query: { q?: string | null; key?: string | null; agents?: string | null },
  deps: BridgeOfficesGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const parsed = validateBridgeOfficeLookupParams(query);
  if (!parsed.ok) return jsonResponse(parsed.status, { error: parsed.error });

  try {
    if (parsed.mode === 'lookup' && parsed.key) {
      const office = deps.getOffice ? await deps.getOffice(parsed.key) : null;
      if (!office) return jsonResponse(404, { error: 'Office not found.' });
      const agents =
        query.agents === 'true' && deps.getOfficeAgents
          ? await deps.getOfficeAgents(parsed.key)
          : undefined;
      return jsonResponse(200, { office, agents });
    }

    const validated = validateBridgeNameQuery(parsed.q, OFFICE_QUERY_PATTERN);
    if (!validated.ok) {
      if (validated.status === 200) return jsonResponse(200, { results: [] });
      return jsonResponse(validated.status, { results: [], error: validated.error });
    }

    const results = deps.searchOffices ? await deps.searchOffices(validated.query, 10) : [];
    return jsonResponse(200, { results: mapBridgeOfficeResults(results) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (isBridgeServicePaused(message)) {
      return jsonResponse(200, { results: [], unavailable: true });
    }
    console.error('[BRIDGE OFFICES] Error:', message);
    return jsonResponse(502, { error: 'Office search unavailable.', results: [] });
  }
}
