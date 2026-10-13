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
    const snapPromise = docRef.get();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore geocode read timeout')), 1500)
    );
    const snap = (await Promise.race([snapPromise, timeoutPromise])) as any;
    if (snap?.exists) {
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
    const setPromise = docRef.set(data, { merge: true });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore geocode write timeout')), 1500)
    );
    await Promise.race([setPromise, timeoutPromise]);
  } catch (error) {
    // Graceful degradation if Firestore is unreachable
  }
}
