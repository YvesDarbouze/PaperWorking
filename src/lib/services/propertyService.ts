import { adminDb } from '@/lib/firebase/admin';
import type { Property, PropertyResolutionResult, AddressComponents } from '@/types/propertyTypes';
import { COORDINATE_TTL_MS } from '@/types/propertyTypes';
import { canonicalizeAddress } from '@/lib/identity/propertyIdentity';

const PROPERTIES_COLLECTION = 'properties';

/**
 * Resolves or creates a Property record for a given placeId.
 * If a Property with this placeId already exists → returns it (updates coordinates if stale).
 * If not → creates new Property with canonical address and coordinates.
 * 
 * This is the SOLE path for Property creation. No other code may write to the properties collection.
 */
export async function resolveOrCreateProperty(params: {
  placeId: string;
  addressComponents: AddressComponents;
  coordinates: { lat: number; lng: number };
}): Promise<PropertyResolutionResult> {
  const snapshot = await adminDb
    .collection(PROPERTIES_COLLECTION)
    .where('placeId', '==', params.placeId)
    .limit(1)
    .get();

  const now = Date.now();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const existing = doc.data() as Property;
    let needsUpdate = false;
    const updateData: Partial<Property> = {};

    if (!existing.coordinates || existing.coordinates.expiresAt < now) {
      updateData.coordinates = {
        lat: params.coordinates.lat,
        lng: params.coordinates.lng,
        cachedAt: now,
        expiresAt: now + COORDINATE_TTL_MS,
      };
      needsUpdate = true;
    }

    if (needsUpdate) {
      updateData.updatedAt = new Date();
      await doc.ref.update(updateData);
      Object.assign(existing, updateData);
    }

    return { property: existing, created: false };
  }

  const newDocRef = adminDb.collection(PROPERTIES_COLLECTION).doc();
  
  const newProperty: Property = {
    id: newDocRef.id,
    placeId: params.placeId,
    canonicalAddress: canonicalizeAddress(params.addressComponents),
    street: `${params.addressComponents.streetNumber} ${params.addressComponents.route}`.trim(),
    city: params.addressComponents.city,
    state: params.addressComponents.state,
    zip: params.addressComponents.zip,
    unitNumber: params.addressComponents.unitNumber,
    coordinates: {
      lat: params.coordinates.lat,
      lng: params.coordinates.lng,
      cachedAt: now,
      expiresAt: now + COORDINATE_TTL_MS,
    },
    placeIdVerifiedAt: now,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await newDocRef.set(newProperty);

  return { property: newProperty, created: true };
}
