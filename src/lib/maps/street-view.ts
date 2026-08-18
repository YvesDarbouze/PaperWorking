/**
 * Server-side Street View image fetching.
 * Uses the Street View Static API to generate property header images.
 */

const STREET_VIEW_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface StreetViewImageResult {
  imageUrl: string | null;
  metadata: {
    lat: number;
    lng: number;
    heading: number;
    pitch: number;
    fov: number;
    date?: string;  // Capture date if available
  } | null;
  available: boolean;
}

/**
 * Fetches Street View metadata to check if imagery exists for a location.
 */
export async function checkStreetViewAvailability(
  lat: number,
  lng: number
): Promise<boolean> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_MAPS_API_KEY not set');
    return false;
  }

  const url = new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return data.status === 'OK';
  } catch {
    return false;
  }
}

/**
 * Generates a Street View Static API image URL.
 * Returns null if Street View is unavailable.
 */
export async function getStreetViewImage(
  lat: number,
  lng: number,
  options: {
    width?: number;
    height?: number;
    fov?: number;
    heading?: number;
    pitch?: number;
  } = {}
): Promise<StreetViewImageResult> {
  const {
    width = 1200,
    height = 400,
    fov = 90,
    heading = 0,
    pitch = 0,
  } = options;

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { imageUrl: null, metadata: null, available: false };
  }

  // First check availability
  const isAvailable = await checkStreetViewAvailability(lat, lng);
  if (!isAvailable) {
    return { imageUrl: null, metadata: null, available: false };
  }

  const url = new URL('https://maps.googleapis.com/maps/api/streetview');
  url.searchParams.set('size', `${width}x${height}`);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('fov', String(fov));
  url.searchParams.set('heading', String(heading));
  url.searchParams.set('pitch', String(pitch));
  url.searchParams.set('source', 'outdoor');  // Better building shots
  url.searchParams.set('key', apiKey);

  return {
    imageUrl: url.toString(),
    metadata: { lat, lng, heading, pitch, fov },
    available: true,
  };
}

/**
 * Geocodes an address string to lat/lng coordinates.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('key', apiKey);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}
