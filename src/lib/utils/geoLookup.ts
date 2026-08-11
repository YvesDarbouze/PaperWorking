/**
 * Utility for resolving geographic coordinates (lat, lng) for cities, zip codes, and addresses.
 * Provides fallback coordinates for common US markets and deterministic coordinate generation.
 */

export interface GeoLocation {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  formattedAddress?: string;
}

// Known coordinates for key real estate submarkets & metropolitan areas
export const KNOWN_CITY_COORDINATES: Record<string, { lat: number; lng: number; city: string; state: string }> = {
  // Major Markets
  "memphis": { lat: 35.1495, lng: -90.0490, city: "Memphis", state: "TN" },
  "chicago": { lat: 41.8781, lng: -87.6298, city: "Chicago", state: "IL" },
  "atlanta": { lat: 33.7490, lng: -84.3880, city: "Atlanta", state: "GA" },
  "indianapolis": { lat: 39.7684, lng: -86.1581, city: "Indianapolis", state: "IN" },
  "dallas": { lat: 32.7767, lng: -96.7970, city: "Dallas", state: "TX" },
  "houston": { lat: 29.7604, lng: -95.3698, city: "Houston", state: "TX" },
  "miami": { lat: 25.7617, lng: -80.1918, city: "Miami", state: "FL" },
  "orlando": { lat: 28.5383, lng: -81.3792, city: "Orlando", state: "FL" },
  "tampa": { lat: 27.9506, lng: -82.4572, city: "Tampa", state: "FL" },
  "new york": { lat: 40.7128, lng: -74.0060, city: "New York", state: "NY" },
  "los angeles": { lat: 34.0522, lng: -118.2437, city: "Los Angeles", state: "CA" },
  "san francisco": { lat: 37.7749, lng: -122.4194, city: "San Francisco", state: "CA" },
  "phoenix": { lat: 33.4484, lng: -112.0740, city: "Phoenix", state: "AZ" },
  "denver": { lat: 39.7392, lng: -104.9903, city: "Denver", state: "CO" },
  "seattle": { lat: 47.6062, lng: -122.3321, city: "Seattle", state: "WA" },
  "nashville": { lat: 36.1627, lng: -86.7816, city: "Nashville", state: "TN" },
  "charlotte": { lat: 35.2271, lng: -80.8431, city: "Charlotte", state: "NC" },
  "raleigh": { lat: 35.7796, lng: -78.6382, city: "Raleigh", state: "NC" },
  "austin": { lat: 30.2672, lng: -97.7431, city: "Austin", state: "TX" },
  "san antonio": { lat: 29.4241, lng: -98.4936, city: "San Antonio", state: "TX" },
  "columbus": { lat: 39.9612, lng: -82.9988, city: "Columbus", state: "OH" },
  "cleveland": { lat: 41.4993, lng: -81.6944, city: "Cleveland", state: "OH" },
  "detroit": { lat: 42.3314, lng: -83.0458, city: "Detroit", state: "MI" },
  "st. louis": { lat: 38.6270, lng: -90.1994, city: "St. Louis", state: "MO" },
  "kansas city": { lat: 39.0997, lng: -94.5786, city: "Kansas City", state: "MO" },
  "las vegas": { lat: 36.1699, lng: -115.1398, city: "Las Vegas", state: "NV" },
  "salt lake city": { lat: 40.7608, lng: -111.8910, city: "Salt Lake City", state: "UT" },
  "birmingham": { lat: 33.5186, lng: -86.8104, city: "Birmingham", state: "AL" },
  "jacksonville": { lat: 30.3322, lng: -81.6557, city: "Jacksonville", state: "FL" },
};

// Known coordinates for sample Zip Codes
export const KNOWN_ZIP_COORDINATES: Record<string, { lat: number; lng: number; city: string; state: string }> = {
  "38103": { lat: 35.1450, lng: -90.0520, city: "Memphis", state: "TN" },
  "38104": { lat: 35.1350, lng: -89.9950, city: "Memphis", state: "TN" },
  "60621": { lat: 41.7770, lng: -87.6430, city: "Chicago", state: "IL" },
  "60601": { lat: 41.8850, lng: -87.6250, city: "Chicago", state: "IL" },
  "30303": { lat: 33.7550, lng: -84.3900, city: "Atlanta", state: "GA" },
  "46204": { lat: 39.7710, lng: -86.1550, city: "Indianapolis", state: "IN" },
  "75201": { lat: 32.7870, lng: -96.7980, city: "Dallas", state: "TX" },
  "90210": { lat: 34.0901, lng: -118.4065, city: "Beverly Hills", state: "CA" },
  "33139": { lat: 25.7781, lng: -80.1313, city: "Miami Beach", state: "FL" },
  "10001": { lat: 40.7501, lng: -73.9996, city: "New York", state: "NY" },
  "37203": { lat: 36.1510, lng: -86.7890, city: "Nashville", state: "TN" },
  "78701": { lat: 30.2710, lng: -97.7420, city: "Austin", state: "TX" },
  "94102": { lat: 37.7790, lng: -122.4200, city: "San Francisco", state: "CA" },
};

/**
 * Deterministically generates latitude and longitude based on a string seed (e.g. project ID or user ID)
 * bounded within the continental US coordinates so newly created items always appear gracefully on maps.
 */
export function getDeterministicCoordinates(seed: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const norm1 = Math.abs(hash % 10000) / 10000;
  const norm2 = Math.abs((hash >> 3) % 10000) / 10000;

  // Latitude range: ~28.0 (Florida) to ~45.0 (Northern US)
  const lat = 28.0 + norm1 * (45.0 - 28.0);
  // Longitude range: ~ -120.0 (West Coast) to ~ -75.0 (East Coast)
  const lng = -120.0 + norm2 * (-75.0 - -120.0);

  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
  };
}

/**
 * Resolves location for address, zip code, or city string.
 */
export function resolveLocation(query: string): GeoLocation | null {
  if (!query || typeof query !== "string") return null;
  const clean = query.trim().toLowerCase();

  // 1. Check direct zip code match
  if (KNOWN_ZIP_COORDINATES[clean]) {
    const loc = KNOWN_ZIP_COORDINATES[clean];
    return { lat: loc.lat, lng: loc.lng, city: loc.city, state: loc.state, formattedAddress: `${loc.city}, ${loc.state} ${clean.toUpperCase()}` };
  }

  // 2. Check city match
  for (const [key, value] of Object.entries(KNOWN_CITY_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return { lat: value.lat, lng: value.lng, city: value.city, state: value.state, formattedAddress: `${value.city}, ${value.state}` };
    }
  }

  // 3. Extract 5-digit zip code pattern from address string
  const zipMatch = clean.match(/\b\d{5}\b/);
  if (zipMatch && KNOWN_ZIP_COORDINATES[zipMatch[0]]) {
    const loc = KNOWN_ZIP_COORDINATES[zipMatch[0]];
    return { lat: loc.lat, lng: loc.lng, city: loc.city, state: loc.state, formattedAddress: query };
  }

  return null;
}
