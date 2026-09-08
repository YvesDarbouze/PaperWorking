import { getAdminFirestore } from '@/lib/firebase/admin';
import { normalizeAddressKey, type CachedGeocode } from './geocode-cache';

export interface GeocodeAdminDeps {
  getFirestore?: () => any;
}

/**
 * Server-only helper: Reads cached geocode from Firestore using Admin SDK.
 */
export async function getAdminCachedGeocode(
  address: string,
  deps: GeocodeAdminDeps = {},
): Promise<CachedGeocode | null> {
  if (!address || !address.trim()) return null;
  const key = normalizeAddressKey(address);
  try {
    const db = deps.getFirestore ? deps.getFirestore() : getAdminFirestore();
    const docRef = db.collection('geocodeCache').doc(key);
    const snap = await docRef.get();
    if (snap.exists) {
      return snap.data() as CachedGeocode;
    }
  } catch {
    // Graceful degradation if Firestore is unavailable
  }
  return null;
}

/**
 * Server-only helper: Persists geocode result to Firestore using Admin SDK.
 */
export async function setAdminCachedGeocode(
  address: string,
  data: CachedGeocode,
  deps: GeocodeAdminDeps = {},
): Promise<void> {
  if (!address || !address.trim()) return;
  const key = normalizeAddressKey(address);
  try {
    const db = deps.getFirestore ? deps.getFirestore() : getAdminFirestore();
    const docRef = db.collection('geocodeCache').doc(key);
    await docRef.set(data, { merge: true });
  } catch (error) {
    console.error('[geocodeCache] Admin SDK persist error:', error);
  }
}
