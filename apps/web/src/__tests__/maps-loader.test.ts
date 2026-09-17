/**
 * @jest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import {
  getClientMapsApiKey,
  isMapsKeyConfigured,
  loadGoogleMaps,
  isGoogleMapsLoaded,
  resetGoogleMapsLoaderForTesting,
} from '../../lib/maps/loader';

describe('Google Maps Loader Singleton & Graceful Degradation', () => {
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    resetGoogleMapsLoaderForTesting();
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  });

  afterEach(() => {
    resetGoogleMapsLoaderForTesting();
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    }
  });

  it('detects unconfigured API key correctly', () => {
    expect(getClientMapsApiKey()).toBe('');
    expect(isMapsKeyConfigured()).toBe(false);
  });

  it('detects configured API key correctly', () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'AIzaSyTestKey12345';
    expect(getClientMapsApiKey()).toBe('AIzaSyTestKey12345');
    expect(isMapsKeyConfigured()).toBe(true);
  });

  it('returns null and logs single warning when key is missing in browser environment', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // First call
    const result1 = await loadGoogleMaps();
    expect(result1).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured');

    // Second call: does not spam console warnings
    const result2 = await loadGoogleMaps();
    expect(result2).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it('reports isGoogleMapsLoaded accurately', () => {
    expect(isGoogleMapsLoaded()).toBe(false);
  });
});
