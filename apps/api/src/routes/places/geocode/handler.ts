import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { parseGeocodeApiResponse, validateGeocodeQuery } from '../../../lib/places/geocode.js';

export type FetchGeocodeFn = (address: string, apiKey: string) => Promise<Record<string, unknown>>;

/**
 * GET /api/places/geocode?address=
 */
export async function handlePlacesGeocodeGet(
  query: { address?: string | null },
  deps: { requireAuth?: RequireAuthFn; placesApiKey?: string; fetchGeocode?: FetchGeocodeFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const validated = validateGeocodeQuery(query.address);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  const apiKey = deps.placesApiKey ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return jsonResponse(500, { error: 'Google Places API key not configured' });

  try {
    const data = deps.fetchGeocode
      ? await deps.fetchGeocode(validated.address, apiKey)
      : {
          status: 'OK',
          results: [{ formatted_address: validated.address, geometry: { location: { lat: 0, lng: 0 } } }],
        };
    return jsonResponse(200, parseGeocodeApiResponse(data as Parameters<typeof parseGeocodeApiResponse>[0]));
  } catch (err: unknown) {
    console.error('[Geocode] Proxy error:', err);
    return jsonResponse(500, { error: 'Internal server error' });
  }
}
