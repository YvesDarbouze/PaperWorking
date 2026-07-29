import { adminDb } from '@/lib/firebase/admin';
import * as PlacesGateway from '@/lib/places/placesGateway';

export interface GeocodeCache {
  placeId: string | null;
  lat: number;
  lng: number;
  fetchedAt: number;
}

/**
 * Resolves a text address to its lat/lng coordinates.
 * Looks up the address in a Firestore geocode cache first.
 * If not cached, it geocodes via the Google Geocoding API and caches the result.
 */
export async function geocodeAddress(address: string, uid: string = 'system'): Promise<{ lat: number; lng: number } | null> {
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
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // Section A.3: 30-day max TTL on coordinates
      if (cached.fetchedAt && Date.now() - cached.fetchedAt < THIRTY_DAYS_MS) {
        console.log(`[Geocode Cache] Hit for address: "${address}" -> ${cached.lat}, ${cached.lng}`);
        return { lat: cached.lat, lng: cached.lng };
      }
      console.log(`[Geocode Cache] Expired (>30 days). Purging cached coordinates for: "${address}"`);
      await cacheRef.delete().catch(() => {});
    }
    
    // 2. Cache miss: Call PlacesGateway API
    console.log(`[Geocode Provider] Cache miss. Calling PlacesGateway for: "${address}"`);
    
    const gatewayResult = await PlacesGateway.geocode(address.trim(), uid);
    if (!gatewayResult) {
      console.warn(`[Geocode Provider] PlacesGateway returned no result for address: "${address}"`);
      return null;
    }
    
    const result = { lat: gatewayResult.lat, lng: gatewayResult.lng };
    
    // 3. Cache the resolved result
    await cacheRef.set({
      placeId: gatewayResult.placeId,
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
