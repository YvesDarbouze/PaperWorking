import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  isBridgeServicePaused,
  mapBridgeOpenHouseResults,
  parseBridgeOpenHouseTop,
} from '../../../lib/bridge/helpers.js';

export type GetBridgeOpenHouseFn = (openHouseKey: string) => Promise<Record<string, unknown> | null>;
export type ListBridgeOpenHousesFn = (
  top: number,
  listingKey?: string,
) => Promise<Array<Record<string, unknown>>>;

export interface BridgeOpenhousesGetDeps {
  requireAuth?: RequireAuthFn;
  getOpenHouse?: GetBridgeOpenHouseFn;
  listOpenHouses?: ListBridgeOpenHousesFn;
}

/**
 * GET /api/bridge/openhouses
 */
export async function handleBridgeOpenhousesGet(
  query: { listingKey?: string | null; key?: string | null; top?: string | null },
  deps: BridgeOpenhousesGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const listingKey = query.listingKey?.trim();
  const key = query.key?.trim();
  const top = parseBridgeOpenHouseTop(query.top);

  try {
    if (key) {
      const openHouse = deps.getOpenHouse ? await deps.getOpenHouse(key) : null;
      if (!openHouse) return jsonResponse(404, { error: 'Open house not found.' });
      return jsonResponse(200, { openHouse });
    }

    const results = deps.listOpenHouses
      ? await deps.listOpenHouses(top, listingKey || undefined)
      : [];
    return jsonResponse(200, { results: mapBridgeOpenHouseResults(results) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (isBridgeServicePaused(message)) {
      return jsonResponse(200, { results: [], unavailable: true });
    }
    console.error('[BRIDGE OPENHOUSES] Error:', message);
    return jsonResponse(502, { error: 'Open house search unavailable.', results: [] });
  }
}
