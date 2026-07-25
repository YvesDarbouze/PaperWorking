import { Timestamp } from 'firebase/firestore';

/** Firestore collection: `properties` */
export interface Property {
  id: string;                    // Firestore doc ID (auto-generated)
  placeId: string;               // Google place_id — identity anchor (unique)
  canonicalAddress: string;      // Normalized postal address from canonicalizeAddress()
  street: string;
  city: string;
  state: string;                 // 2-letter code
  zip: string;
  unitNumber?: string;
  coordinates: {
    lat: number;
    lng: number;
    cachedAt: number;            // Unix timestamp ms
    expiresAt: number;           // cachedAt + 30 days (2_592_000_000 ms)
  };
  placeIdVerifiedAt: number;     // Unix timestamp ms — for 12-month refresh cycle
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

/** Result of Address Validation / canonicalization */
export interface AddressComponents {
  streetNumber: string;
  route: string;
  unitNumber?: string;
  city: string;
  state: string;               // 2-letter code
  zip: string;
}

/** Result of Property resolution */
export interface PropertyResolutionResult {
  property: Property;
  created: boolean;            // true if new, false if existing matched by placeId
}

/** Result of placeId refresh batch */
export interface PlaceIdRefreshResult {
  processed: number;
  refreshed: number;
  deprecated: number;          // placeId changed by Google
  failed: number;
  errors: Array<{ propertyId: string; error: string }>;
}

export const COORDINATE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const PLACE_ID_REFRESH_INTERVAL_MS = 365 * 24 * 60 * 60 * 1000; // 12 months
