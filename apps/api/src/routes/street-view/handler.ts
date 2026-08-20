import { binaryResponse, jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  buildStreetViewMetadataUrl,
  buildStreetViewStaticUrl,
  parseStreetViewCoordinates,
  parseStreetViewQuery,
  type StreetViewQueryInput,
} from '../../lib/maps/street-view-params.js';

export interface StreetViewImageResult {
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  available: boolean;
}

export type FetchStreetViewMetadataFn = (url: string) => Promise<Record<string, unknown>>;

export type FetchStreetViewImageFn = (
  url: string,
) => Promise<{ ok: boolean; status: number; buffer: ArrayBuffer; contentType: string }>;

export type GetStreetViewImageFn = (lat: number, lng: number) => Promise<StreetViewImageResult>;

export interface StreetViewGetDeps {
  requireAuth?: RequireAuthFn;
  placesApiKey?: string | null;
  fetchMetadata?: FetchStreetViewMetadataFn;
  fetchImage?: FetchStreetViewImageFn;
}

export interface StreetViewPostBody {
  lat?: unknown;
  lng?: unknown;
}

export interface StreetViewPostDeps {
  getStreetViewImage?: GetStreetViewImageFn;
}

/**
 * GET /api/street-view — proxy Google Street View Static API / metadata.
 */
export async function handleStreetViewGet(
  query: StreetViewQueryInput,
  deps: StreetViewGetDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return binaryResponse(500, 'Auth not configured', { 'Content-Type': 'text/plain' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const coords = parseStreetViewCoordinates(query.lat, query.lng);
  if (!coords.ok) {
    return binaryResponse(400, coords.error, { 'Content-Type': 'text/plain' });
  }

  const apiKey = deps.placesApiKey;
  if (!apiKey) {
    return binaryResponse(503, 'Street View service not configured', { 'Content-Type': 'text/plain' });
  }

  const parsed = parseStreetViewQuery(query);
  if (!parsed) {
    return binaryResponse(400, 'Invalid street view query', { 'Content-Type': 'text/plain' });
  }

  if (parsed.metadataOnly) {
    const metadataUrl = buildStreetViewMetadataUrl(apiKey, parsed.lat, parsed.lng);
    try {
      const data = deps.fetchMetadata
        ? await deps.fetchMetadata(metadataUrl)
        : { status: 'ZERO_RESULTS' };
      return jsonResponse(200, data);
    } catch (err) {
      console.error('[street-view] Metadata error:', err);
      return jsonResponse(200, { status: 'ZERO_RESULTS' });
    }
  }

  const imageUrl = buildStreetViewStaticUrl(apiKey, parsed);

  try {
    const upstream = deps.fetchImage
      ? await deps.fetchImage(imageUrl)
      : { ok: true, status: 200, buffer: new ArrayBuffer(0), contentType: 'image/jpeg' };

    if (!upstream.ok) {
      return binaryResponse(upstream.status, 'Street View unavailable for location', {
        'Content-Type': 'text/plain',
      });
    }

    return binaryResponse(200, new Uint8Array(upstream.buffer), {
      'Content-Type': upstream.contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-StreetView-Source': 'google-street-view-static',
    });
  } catch (err) {
    console.error('[street-view] Proxy error:', err);
    return binaryResponse(500, 'Internal server error', { 'Content-Type': 'text/plain' });
  }
}

/**
 * POST /api/street-view — returns image URL + availability metadata.
 */
export async function handleStreetViewPost(
  body: StreetViewPostBody,
  deps: StreetViewPostDeps = {},
): Promise<RouteResult> {
  try {
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
      return jsonResponse(400, { error: 'Invalid coordinates' });
    }

    const result = deps.getStreetViewImage
      ? await deps.getStreetViewImage(body.lat, body.lng)
      : { imageUrl: null, metadata: null, available: false };

    return jsonResponse(200, result);
  } catch (error) {
    console.error('Street View API error:', error);
    return jsonResponse(500, { imageUrl: null, metadata: null, available: false });
  }
}
