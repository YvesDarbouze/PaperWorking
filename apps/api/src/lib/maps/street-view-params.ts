export interface StreetViewQueryInput {
  lat?: unknown;
  lng?: unknown;
  metadata?: unknown;
  fov?: unknown;
  heading?: unknown;
  pitch?: unknown;
  w?: unknown;
  h?: unknown;
}

export interface ParsedStreetViewQuery {
  lat: number;
  lng: number;
  metadataOnly: boolean;
  fov: number;
  heading?: number;
  pitch: number;
  width: number;
  height: number;
}

export function parseStreetViewCoordinates(
  lat: unknown,
  lng: unknown,
): { ok: true; lat: number; lng: number } | { ok: false; error: string } {
  const parsedLat = typeof lat === 'number' ? lat : parseFloat(String(lat ?? ''));
  const parsedLng = typeof lng === 'number' ? lng : parseFloat(String(lng ?? ''));

  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
    return { ok: false, error: 'lat and lng are required numeric parameters' };
  }

  return { ok: true, lat: parsedLat, lng: parsedLng };
}

export function parseStreetViewQuery(input: StreetViewQueryInput): ParsedStreetViewQuery | null {
  const coords = parseStreetViewCoordinates(input.lat, input.lng);
  if (!coords.ok) return null;

  const fov = Math.min(Math.max(parseInt(String(input.fov ?? '90'), 10), 10), 120);
  const headingRaw = input.heading != null ? parseInt(String(input.heading), 10) : undefined;
  const pitch = Math.min(Math.max(parseInt(String(input.pitch ?? '0'), 10), -90), 90);
  const width = Math.min(Math.max(parseInt(String(input.w ?? '600'), 10), 64), 1280);
  const height = Math.min(Math.max(parseInt(String(input.h ?? '400'), 10), 64), 800);

  return {
    lat: coords.lat,
    lng: coords.lng,
    metadataOnly: input.metadata === true || input.metadata === 'true',
    fov,
    heading: headingRaw !== undefined && Number.isFinite(headingRaw) ? headingRaw : undefined,
    pitch,
    width,
    height,
  };
}

export function buildStreetViewStaticUrl(
  apiKey: string,
  query: ParsedStreetViewQuery,
): string {
  const url = new URL('https://maps.googleapis.com/maps/api/streetview');
  url.searchParams.set('size', `${query.width}x${query.height}`);
  url.searchParams.set('location', `${query.lat},${query.lng}`);
  url.searchParams.set('fov', String(query.fov));
  url.searchParams.set('pitch', String(query.pitch));
  if (query.heading !== undefined) {
    url.searchParams.set('heading', String(query.heading));
  }
  url.searchParams.set('return_error_code', 'true');
  url.searchParams.set('key', apiKey);
  return url.toString();
}

export function buildStreetViewMetadataUrl(apiKey: string, lat: number, lng: number): string {
  const url = new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('key', apiKey);
  return url.toString();
}
