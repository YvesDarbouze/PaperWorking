import { adminDb } from '@/lib/firebase/admin';

export interface GeocodeCache {
  address: string;
  lat: number;
  lng: number;
  fetchedAt: number;
}

/**
 * Resolves a text address to its lat/lng coordinates.
 * Looks up the address in a Firestore geocode cache first.
 * If not cached, it geocodes via the Google Geocoding API and caches the result.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || !address.trim()) return null;
  const normalizedAddress = address.trim().toLowerCase();
  
  // Use base64url of normalized address to avoid firestore document key invalid characters
  const docId = Buffer.from(normalizedAddress).toString('base64url');
  
  try {
    // 1. Check cache first
    const cacheRef = adminDb.collection('geocodedAddresses').doc(docId);
    const cacheSnap = await cacheRef.get();
    
    if (cacheSnap.exists) {
      const cached = cacheSnap.data() as GeocodeCache;
      console.log(`[Geocode Cache] Hit for address: "${address}" -> ${cached.lat}, ${cached.lng}`);
      return { lat: cached.lat, lng: cached.lng };
    }
    
    // 2. Cache miss: Call Google Geocoding API
    const PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!PLACES_API_KEY) {
      console.warn('[Geocode Provider] GOOGLE_PLACES_API_KEY is not defined in environment!');
      return null;
    }
    
    console.log(`[Geocode Provider] Cache miss. Calling Google Geocoding API for: "${address}"`);
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address.trim());
    url.searchParams.set('key', PLACES_API_KEY);
    
    const res = await fetch(url.toString());
    if (!res.ok) {
      console.error(`[Geocode Provider] Google Geocoding API returned HTTP status ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    if (data.status !== 'OK' || !data.results || !data.results.length) {
      console.warn(`[Geocode Provider] Google Geocoding API returned status ${data.status} for address: "${address}"`);
      return null;
    }
    
    const location = data.results[0].geometry.location;
    const result = { lat: location.lat, lng: location.lng };
    
    // 3. Cache the resolved result
    await cacheRef.set({
      address: address.trim(),
      lat: result.lat,
      lng: result.lng,
      fetchedAt: Date.now(),
    });
    
    console.log(`[Geocode Provider] Successfully cached coordinate result for: "${address}"`);
    return result;
  } catch (error) {
    console.error(`[Geocode Provider] Error resolving address: "${address}":`, error);
    return null;
  }
}
