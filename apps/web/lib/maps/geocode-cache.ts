export interface CachedGeocode {
  lat: number;
  lng: number;
  placeId?: string;
  formattedAddress?: string;
  streetViewAvailable?: boolean;
  resolvedAt: string;
}

const memoryGeocodeCache = new Map<string, CachedGeocode>();

/**
 * Normalizes an address into a safe, deterministic Firestore document ID.
 */
export function normalizeAddressKey(address: string): string {
  return address
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 500); // Guard Firestore 1500-byte doc ID limit
}

/**
 * Fetches cached geocode data for an address.
 * Checks memory cache first, then Firestore. Never throws.
 */
export async function getCachedGeocode(address: string): Promise<CachedGeocode | null> {
  if (!address || !address.trim()) return null;
  const key = normalizeAddressKey(address);

  if (memoryGeocodeCache.has(key)) {
    return memoryGeocodeCache.get(key) || null;
  }

  try {
    const { getFirestoreDb } = await import('../firebase/client');
    const db = getFirestoreDb();
    if (!db) return null;

    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'geocodeCache', key);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as CachedGeocode;
      memoryGeocodeCache.set(key, data);
      return data;
    }
  } catch {
    // Graceful degradation on Firestore read errors (e.g., offline or unauthenticated)
  }

  return null;
}

/**
 * Caches geocode data in memory.
 */
export function setMemoryCachedGeocode(address: string, data: CachedGeocode): void {
  if (!address || !address.trim()) return;
  const key = normalizeAddressKey(address);
  memoryGeocodeCache.set(key, data);
}

/**
 * Clears in-memory geocode cache (useful for tests).
 */
export function clearGeocodeMemoryCache(): void {
  memoryGeocodeCache.clear();
}
