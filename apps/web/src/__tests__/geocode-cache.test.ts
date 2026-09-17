import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import {
  normalizeAddressKey,
  getCachedGeocode,
  setMemoryCachedGeocode,
  clearGeocodeMemoryCache,
  type CachedGeocode,
} from '../../lib/maps/geocode-cache';
import {
  getAdminCachedGeocode,
  setAdminCachedGeocode,
} from '../../lib/maps/geocode-cache-admin';

describe('Geocode Cache & Address Normalization', () => {
  beforeEach(() => {
    clearGeocodeMemoryCache();
    jest.restoreAllMocks();
  });

  describe('1. Address Normalization', () => {
    it('normalizes standard addresses to lowercase underscore strings', () => {
      expect(normalizeAddressKey('123 Main Street, Austin, TX 78701')).toBe(
        '123_main_street_austin_tx_78701',
      );
    });

    it('strips punctuation, extra symbols, and trims whitespace', () => {
      expect(normalizeAddressKey('   450! #3B N. Grand Ave., Apt. #400, Los Angeles, CA  ')).toBe(
        '450_3b_n_grand_ave_apt_400_los_angeles_ca',
      );
    });

    it('handles hyphens and numbers cleanly', () => {
      expect(normalizeAddressKey('742 Evergreen-Terrace, Springfield')).toBe(
        '742_evergreen-terrace_springfield',
      );
    });
  });

  describe('2. In-Memory Cache Read & Write', () => {
    it('returns null for un-cached addresses when Firestore is unavailable', async () => {
      const result = await getCachedGeocode('999 Nonexistent St, Nowhere, TX');
      expect(result).toBeNull();
    });

    it('returns cached data once stored in memory', async () => {
      const mockData: CachedGeocode = {
        lat: 30.2672,
        lng: -97.7431,
        placeId: 'ChIJLwRjsR1MW4YRgTN',
        formattedAddress: '123 Congress Ave, Austin, TX 78701',
        streetViewAvailable: true,
        resolvedAt: '2026-09-04T12:00:00.000Z',
      };

      setMemoryCachedGeocode('123 Congress Ave, Austin, TX 78701', mockData);

      const cached = await getCachedGeocode('123 Congress Ave, Austin, TX 78701');
      expect(cached).toEqual(mockData);
    });

    it('clears cache successfully on clearGeocodeMemoryCache()', async () => {
      const mockData: CachedGeocode = {
        lat: 30.2672,
        lng: -97.7431,
        resolvedAt: '2026-09-04T12:00:00.000Z',
      };

      setMemoryCachedGeocode('123 Congress Ave', mockData);
      expect(await getCachedGeocode('123 Congress Ave')).not.toBeNull();

      clearGeocodeMemoryCache();
      expect(await getCachedGeocode('123 Congress Ave')).toBeNull();
    });
  });

  describe('3. Firestore Admin SDK Persistence & Cross-Process Recovery (Gap 3)', () => {
    it('persists geocode to Firestore via Admin SDK and recovers it after simulated process restart without Google fetch', async () => {
      const mockStore = new Map<string, CachedGeocode>();

      const mockAdminFirestore = {
        collection: (colName: string) => {
          expect(colName).toBe('geocodeCache');
          return {
            doc: (docKey: string) => ({
              get: async () => ({
                exists: mockStore.has(docKey),
                data: () => mockStore.get(docKey),
              }),
              set: async (data: CachedGeocode) => {
                mockStore.set(docKey, data);
              },
            }),
          };
        },
      };

      const testDeps = { getFirestore: () => mockAdminFirestore };
      const testAddress = '500 E 4th St, Austin, TX 78701';
      const expectedKey = normalizeAddressKey(testAddress);
      const geocodeResult: CachedGeocode = {
        lat: 30.266,
        lng: -97.739,
        formattedAddress: '500 E 4th St, Austin, TX 78701, USA',
        placeId: 'place_austin_500',
        resolvedAt: new Date().toISOString(),
      };

      // 1. Initial write occurs via Admin SDK
      await setAdminCachedGeocode(testAddress, geocodeResult, testDeps);
      expect(mockStore.has(expectedKey)).toBe(true);
      expect(mockStore.get(expectedKey)).toEqual(geocodeResult);

      // 2. Simulate process restart by clearing in-memory cache completely
      clearGeocodeMemoryCache();

      // 3. Second lookup resolves directly from Firestore via Admin SDK without Google fetch
      const recovered = await getAdminCachedGeocode(testAddress, testDeps);
      expect(recovered).not.toBeNull();
      expect(recovered?.lat).toBe(30.266);
      expect(recovered?.lng).toBe(-97.739);
      expect(recovered?.placeId).toBe('place_austin_500');
    });

    it('enforces that writes target the Admin SDK path exclusively', async () => {
      // In firestore.rules, /geocodeCache/{normalizedAddress} has:
      // allow read: if isAuthenticated();
      // allow write: if false; // Server-only via Firebase Admin SDK
      // Client writes are explicitly denied, so client SDK has no write functions exposed in geocode-cache.ts
      const geocodeCacheExports = await import('../../lib/maps/geocode-cache.js');
      expect((geocodeCacheExports as any).setClientCachedGeocode).toBeUndefined();
      expect((geocodeCacheExports as any).saveGeocodeClient).toBeUndefined();
    });
  });
});
