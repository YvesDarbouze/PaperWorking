import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { buildBridgeMetadataResponse } from '../../../lib/bridge/helpers.js';

export type GetBridgeAccessibleFieldsFn = () => Promise<string[]>;

export interface BridgeMetadataGetDeps {
  requireAuth?: RequireAuthFn;
  getAccessibleFields?: GetBridgeAccessibleFieldsFn;
}

/**
 * GET /api/bridge/metadata
 */
export async function handleBridgeMetadataGet(
  deps: BridgeMetadataGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  try {
    const fields = deps.getAccessibleFields ? await deps.getAccessibleFields() : [];
    if (!fields.length) {
      return jsonResponse(504, { error: 'Could not retrieve MLS fields from metadata.' });
    }
    return jsonResponse(200, buildBridgeMetadataResponse(fields));
  } catch (error: unknown) {
    console.error('❌ [API BRIDGE METADATA] Route error:', error);
    return jsonResponse(500, { error: 'Internal Server Error refreshing metadata.' });
  }
}
