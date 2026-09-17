import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import {
  calculateHaversineDistance,
  buildStreetViewUrl,
  buildMapTileUrl,
  checkStreetViewAvailable,
  resolvePropertyImage,
  clearPropertyImageCache,
} from '../../lib/maps/property-image';

describe('4-Tier Property Imagery Fallback Chain', () => {
  beforeEach(() => {
    clearPropertyImageCache();
    jest.restoreAllMocks();
  });

  describe('1. Haversine Distance Calculation', () => {
    it('returns 0 for identical points', () => {
      const dist = calculateHaversineDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(dist).toBe(0);
    });

    it('calculates short distance accurately (e.g. 20-30 meters apart)', () => {
      // Small latitude shift ~ 0.0002 deg is approx 22 meters
      const dist = calculateHaversineDistance(40.7128, -74.006, 40.713, -74.006);
      expect(dist).toBeGreaterThan(15);
      expect(dist).toBeLessThan(30);
    });

    it('calculates long distance accurately (e.g. ~1000m)', () => {
      // 0.01 deg lat is approx 1110 meters
      const dist = calculateHaversineDistance(40.7128, -74.006, 40.7228, -74.006);
      expect(dist).toBeGreaterThan(1000);
      expect(dist).toBeLessThan(1200);
    });
  });

  describe('2. URL Builder Functions', () => {
    it('builds street view static URL correctly', () => {
      const url = buildStreetViewUrl(37.7749, -122.4194, 800, 450);
      expect(url).toBe('/api/street-view?lat=37.7749&lng=-122.4194&w=800&h=450');
    });

    it('builds map tile static URL correctly', () => {
      const url = buildMapTileUrl(37.7749, -122.4194, 17, 800, 450);
      expect(url).toBe('/api/map-tile?lat=37.7749&lng=-122.4194&zoom=17&w=800&h=450');
    });
  });

  describe('3. Tier 1: Curated Listing Photo', () => {
    it('returns curated photo synchronously without fetching street view or map tile', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      const result = await resolvePropertyImage({
        id: 'deal-1',
        imageUrl: 'https://images.unsplash.com/photo-12345',
        lat: 40.7128,
        lng: -74.006,
      });

      expect(result.tier).toBe('curated');
      expect(result.url).toBe('https://images.unsplash.com/photo-12345');
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('4. Tier 2: Street View with Metadata Pre-check', () => {
    it('selects Street View when metadata returns OK and distance <= 50m', async () => {
      // Mock metadata response located 15m away
      const mockMeta = {
        status: 'OK',
        location: { lat: 40.7129, lng: -74.006 },
      };
      jest.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => mockMeta,
        } as unknown as Response;
      });

      const result = await resolvePropertyImage({
        id: 'deal-2',
        imageUrl: '',
        lat: 40.7128,
        lng: -74.006,
      });

      expect(result.tier).toBe('street-view');
      expect(result.url).toContain('/api/street-view?lat=40.7128&lng=-74.006');
    });

    it('rejects Street View and steps down to Tier 3 when panorama distance > 50m', async () => {
      // Mock metadata response located 200m away
      const mockMeta = {
        status: 'OK',
        location: { lat: 40.7148, lng: -74.006 }, // ~222 meters away
      };
      jest.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => mockMeta,
        } as unknown as Response;
      });

      const result = await resolvePropertyImage({
        id: 'deal-3',
        imageUrl: '',
        lat: 40.7128,
        lng: -74.006,
      });

      expect(result.tier).toBe('map-tile');
      expect(result.url).toContain('/api/map-tile?lat=40.7128&lng=-74.006');
    });

    it('rejects Street View and steps down to Tier 3 when status is ZERO_RESULTS', async () => {
      const mockMeta = { status: 'ZERO_RESULTS' };
      jest.spyOn(global, 'fetch').mockImplementation(async () => {
        return {
          ok: true,
          json: async () => mockMeta,
        } as unknown as Response;
      });

      const result = await resolvePropertyImage({
        id: 'deal-4',
        lat: 34.0522,
        lng: -118.2437,
      });

      expect(result.tier).toBe('map-tile');
      expect(result.url).toContain('/api/map-tile?lat=34.0522&lng=-118.2437');
    });
  });

  describe('5. Tier 4: Placeholder Fallback', () => {
    it('returns placeholder (null) when coordinates and curated image are missing', async () => {
      const result = await resolvePropertyImage({
        id: 'deal-5',
        imageUrl: undefined,
        address: '',
        lat: null,
        lng: null,
      });

      expect(result.tier).toBe('placeholder');
      expect(result.url).toBeNull();
    });
  });
});
