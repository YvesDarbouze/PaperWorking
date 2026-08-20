import { binaryResponse, jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import { buildGoogleStaticMapUrl, clampMapTileParams } from '../../lib/map-tile/static.js';

export type FetchMapTileFn = (url: string) => Promise<{ buffer: ArrayBuffer; contentType: string } | null>;

/**
 * GET /api/map-tile
 */
export async function handleMapTileGet(
  query: { lat?: string | null; lng?: string | null; zoom?: string | null; w?: string | null; h?: string | null },
  deps: { requireAuth?: RequireAuthFn; placesApiKey?: string; fetchTile?: FetchMapTileFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const clamped = clampMapTileParams(query);
  if (!clamped.ok) return jsonResponse(400, { error: clamped.error });

  const apiKey = deps.placesApiKey ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return jsonResponse(503, { error: 'Map service not configured' });

  const url = buildGoogleStaticMapUrl({ ...clamped, apiKey });
  try {
    const fetched = deps.fetchTile ? await deps.fetchTile(url) : null;
    if (!fetched) return jsonResponse(502, { error: 'Map fetch failed' });
    return binaryResponse(200, fetched.buffer, {
      'Content-Type': fetched.contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Map-Source': 'google-static-maps',
    });
  } catch (err: unknown) {
    console.error('[map-tile] Proxy error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
