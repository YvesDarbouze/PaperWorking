/** @jest-environment jsdom */
import { loadGoogleMapsApi, isGoogleMapsLoaded } from '@/lib/maps/google-maps-loader';

describe('Google Maps API Loader', () => {
  const originalEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalEnv;
    delete (window as any).google;
    const script = document.querySelector('script[src*="maps.googleapis.com"]');
    if (script) script.remove();
  });

  test('isGoogleMapsLoaded returns false when window.google is undefined', () => {
    expect(isGoogleMapsLoaded()).toBe(false);
  });

  test('isGoogleMapsLoaded returns true when window.google.maps is present', () => {
    (window as any).google = { maps: {} };
    expect(isGoogleMapsLoaded()).toBe(true);
  });

  test('loadGoogleMapsApi rejects if API key is not configured', async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    await expect(loadGoogleMapsApi()).rejects.toThrow('Google Maps API key not configured');
  });
});
