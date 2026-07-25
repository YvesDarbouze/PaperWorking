/**
 * PlacesGateway — DM-3 Single Integration Boundary
 *
 * ALL Google Maps / Places API traffic passes through this module.
 * No other code in the codebase may call Google Maps APIs directly.
 *
 * Responsibilities:
 * - Enforces field masks at the gateway level
 * - Logs SKU + caller to PostHog for billing visibility
 * - Rejects calls with missing session tokens where required
 * - Single env var: GOOGLE_PLACES_API_KEY (server-side only)
 */

import { telemetry } from '@/lib/telemetry';

const API_KEY = () => {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('[PlacesGateway] GOOGLE_PLACES_API_KEY is not configured');
  return key;
};

// ── Autocomplete (New) ─────────────────────────────────────────

export interface AutocompletePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

/**
 * Calls Places Autocomplete (New).
 * SKU: Autocomplete (New) — bundled with terminating call if session token is used.
 *
 * @param input - User search input (min 2 chars)
 * @param sessionToken - UUIDv4 session token (REQUIRED)
 * @param uid - Authenticated user ID for telemetry
 */
export async function autocomplete(
  input: string,
  sessionToken: string,
  uid: string,
): Promise<AutocompletePrediction[]> {
  if (!sessionToken) {
    throw new Error('[PlacesGateway] sessionToken is required for autocomplete');
  }

  telemetry.capture({
    distinctId: uid,
    event: 'places_api_called',
    properties: { sku: 'autocomplete-new', caller: 'autocomplete', sessionToken },
  });

  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY(),
    },
    body: JSON.stringify({
      input,
      sessionToken,
      includedPrimaryTypes: ['street_address', 'subpremise', 'premise'],
      includedRegionCodes: ['us'],
      languageCode: 'en',
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.warn(`[PlacesGateway] Autocomplete returned ${response.status}:`, JSON.stringify(errData));
    return [];
  }

  const data = await response.json();
  return (data.suggestions || [])
    .filter((s: any) => s.placePrediction)
    .map((s: any) => ({
      placeId: s.placePrediction.placeId,
      description: s.placePrediction.text?.text || '',
      mainText: s.placePrediction.structuredFormat?.mainText?.text || '',
      secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
    }));
}

// ── Place Details (New) — Session Terminating Call ─────────────

/** Essentials field mask — the cheapest tier ($5/1k). Never request Pro or Enterprise fields. */
const ESSENTIALS_FIELD_MASK = 'addressComponents,formattedAddress,location';

export interface PlaceDetailsResult {
  formattedAddress: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  placeId: string;
}

/**
 * Calls Place Details (New) to terminate an autocomplete session.
 * SKU: Place Details (New) — Essentials ($5/1k).
 *
 * @param placeId - Google place_id
 * @param sessionToken - UUIDv4 session token (REQUIRED — terminates the session)
 * @param uid - Authenticated user ID for telemetry
 */
export async function placeDetails(
  placeId: string,
  sessionToken: string,
  uid: string,
): Promise<PlaceDetailsResult> {
  if (!sessionToken) {
    throw new Error('[PlacesGateway] sessionToken is required for placeDetails (session termination)');
  }

  telemetry.capture({
    distinctId: uid,
    event: 'places_api_called',
    properties: { sku: 'place-details-essentials', caller: 'placeDetails', sessionToken },
  });

  const url = new URL(`https://places.googleapis.com/v1/places/${placeId}`);
  url.searchParams.append('sessionToken', sessionToken);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY(),
      'X-Goog-FieldMask': ESSENTIALS_FIELD_MASK,
    },
  });

  if (!response.ok) {
    throw new Error(`[PlacesGateway] Place Details returned ${response.status}`);
  }

  const data = await response.json();
  const components = data.addressComponents || [];

  const get = (type: string): string => {
    const comp = components.find((c: any) => c.types?.includes(type));
    return comp?.longText || comp?.shortText || '';
  };

  const streetNumber = get('street_number');
  const route = get('route');

  return {
    formattedAddress: data.formattedAddress || '',
    street: [streetNumber, route].filter(Boolean).join(' '),
    city: get('locality') || get('sublocality') || get('administrative_area_level_2'),
    state: components.find((c: any) => c.types?.includes('administrative_area_level_1'))?.shortText ?? '',
    zip: get('postal_code'),
    lat: data.location?.latitude ?? null,
    lng: data.location?.longitude ?? null,
    placeId,
  };
}

// ── Geocoding ──────────────────────────────────────────────────

export interface GeocodeResult {
  lat: number;
  lng: number;
  placeId: string | null;
}

/**
 * Geocodes an address via the Geocoding API.
 * SKU: Geocoding ($5/1k).
 * No session token — Geocoding is a standalone call.
 *
 * @param address - Address string to geocode
 * @param uid - Authenticated user ID for telemetry
 */
export async function geocode(address: string, uid: string): Promise<GeocodeResult | null> {
  telemetry.capture({
    distinctId: uid,
    event: 'places_api_called',
    properties: { sku: 'geocoding', caller: 'geocode' },
  });

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', API_KEY());

  const response = await fetch(url.toString());
  if (!response.ok) return null;

  const data = await response.json();
  if (data.status !== 'OK' || !data.results?.length) return null;

  const result = data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    placeId: result.place_id || null,
  };
}

// ── Address Validation ─────────────────────────────────────────

export interface AddressValidationResult {
  canonicalAddress: string;
  components: {
    streetNumber: string;
    route: string;
    unitNumber: string;
    city: string;
    state: string;
    zip: string;
  };
  placeId: string | null;
  verdict: Record<string, any>;
}

/**
 * Validates and standardizes an address via the Address Validation API.
 * SKU: Address Validation — Pro ($17/1k).
 *
 * @param address - Address string to validate
 * @param uid - Authenticated user ID for telemetry
 */
export async function validateAddress(
  address: string,
  uid: string,
): Promise<AddressValidationResult> {
  telemetry.capture({
    distinctId: uid,
    event: 'places_api_called',
    properties: { sku: 'address-validation', caller: 'validateAddress' },
  });

  const url = `https://addressvalidation.googleapis.com/v1:validateAddress?key=${API_KEY()}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      address: { addressLines: [address] },
      enableUspsCass: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`[PlacesGateway] Address Validation returned ${response.status}`);
  }

  const data = await response.json();
  const result = data.result;

  if (!result?.address) {
    throw new Error('[PlacesGateway] Invalid Address Validation response');
  }

  const components = result.address.addressComponents || [];
  const getComponent = (type: string) => {
    const comp = components.find((c: any) => c.componentType === type);
    return comp ? comp.componentName.text : '';
  };

  return {
    canonicalAddress: result.address.postalAddress?.addressLines?.join(', ') || address,
    components: {
      streetNumber: getComponent('street_number'),
      route: getComponent('route'),
      unitNumber: getComponent('subpremise'),
      city: getComponent('locality'),
      state: getComponent('administrative_area_level_1'),
      zip: getComponent('postal_code'),
    },
    placeId: result.geocode?.placeId || null,
    verdict: result.verdict || {},
  };
}

// ── Static Maps URL Builder ────────────────────────────────────

/**
 * Builds a server-proxied Static Maps URL.
 * The actual API key is added server-side by /api/map-tile.
 */
export function staticMapUrl(
  lat: number,
  lng: number,
  options?: { zoom?: number; w?: number; h?: number },
): string {
  const zoom = options?.zoom ?? 15;
  const w = options?.w ?? 640;
  const h = options?.h ?? 320;
  return `/api/map-tile?lat=${lat}&lng=${lng}&zoom=${zoom}&w=${w}&h=${h}`;
}

// ── Street View URL Builder ────────────────────────────────────

/**
 * Builds a server-proxied Street View URL.
 * The actual API key is added server-side by /api/street-view.
 */
export function streetViewUrl(
  lat: number,
  lng: number,
  options?: { w?: number; h?: number; fov?: number; pitch?: number; heading?: number },
): string {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    w: String(options?.w ?? 800),
    h: String(options?.h ?? 450),
    fov: String(options?.fov ?? 90),
    pitch: String(options?.pitch ?? 0),
  });
  if (options?.heading !== undefined) {
    params.set('heading', String(options.heading));
  }
  return `/api/street-view?${params.toString()}`;
}

/**
 * Builds a Street View metadata check URL.
 */
export function streetViewMetadataUrl(lat: number, lng: number): string {
  return `/api/street-view?lat=${lat}&lng=${lng}&metadata=true`;
}
