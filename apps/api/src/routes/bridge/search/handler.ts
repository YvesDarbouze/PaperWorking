import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  isBridgeCredentialIssue,
  mapBridgeSearchRecords,
  validateBridgeAddressQuery,
} from '../../../lib/bridge/helpers.js';

export type SearchBridgePropertiesFn = (query: string) => Promise<Array<Record<string, unknown>>>;

export interface BridgeSearchGetDeps {
  requireAuth?: RequireAuthFn;
  searchProperties?: SearchBridgePropertiesFn;
}

/**
 * GET /api/bridge/search
 */
export async function handleBridgeSearchGet(
  query: { q?: string | null },
  deps: BridgeSearchGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const validated = validateBridgeAddressQuery(query.q);
  if (!validated.ok) {
    if (validated.status === 200) return jsonResponse(200, { results: [] });
    return jsonResponse(validated.status, { results: [], error: validated.error });
  }

  try {
    const records = deps.searchProperties ? await deps.searchProperties(validated.query) : [];
    return jsonResponse(200, { results: mapBridgeSearchRecords(records) });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    const message = err.message ?? '';
    if (isBridgeCredentialIssue(message, err.status)) {
      return jsonResponse(200, { results: [], credentialsMissing: true });
    }
    console.error('[BRIDGE SEARCH] Error:', message);
    return jsonResponse(502, { error: 'Search unavailable', results: [] });
  }
}
