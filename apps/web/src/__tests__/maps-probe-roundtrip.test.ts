import { jest } from '@jest/globals';
import { executeMapsProbe, classifyGoogleError } from '../../lib/maps/probe';

describe('Maps Probe Diagnostic Engine', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('correctly classifies error codes into taxonomy categories', () => {
    expect(classifyGoogleError('REQUEST_DENIED', 'The provided API key is invalid.')).toBe('REQUEST_DENIED');
    expect(classifyGoogleError(403, 'Your site URL to be authorized: http://localhost:3000')).toBe('RefererNotAllowedMapError');
    expect(classifyGoogleError('OVER_QUERY_LIMIT', 'You have exceeded your daily request quota for this API.')).toBe('OVER_QUERY_LIMIT');
    expect(classifyGoogleError(404, 'Not found')).toBe('STATIC_MAP_404');
    expect(classifyGoogleError(403, 'Static map forbidden')).toBe('STATIC_MAP_403');
    expect(classifyGoogleError('INVALID_REQUEST', 'MissingKeyMapError')).toBe('MissingKeyMapError');
  });

  it('safely handles missing API keys without throwing', async () => {
    const result = await executeMapsProbe();

    expect(result.success).toBe(false);
    expect(result.keyConfigured).toBe(false);
    expect(result.maskedKey).toBeNull();
    expect(result.errorClassification).toBe('MissingKeyMapError');
    expect(result.steps.scriptLoad.status).toBe('failed');
    expect(result.steps.placesAutocomplete.status).toBe('skipped');
    expect(result.steps.geocoding.status).toBe('skipped');
    expect(result.steps.streetViewAndStaticMaps.status).toBe('skipped');
  });

  it('masks sensitive API keys in the diagnostic result', async () => {
    // Intercept global fetch
    const mockFetch = jest.fn<any>().mockImplementation((url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('place/autocomplete')) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'OK', predictions: [{ description: '1247 Elm St, Austin TX', place_id: 'pl_123' }] }),
        });
      }
      if (urlStr.includes('geocode')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            status: 'OK',
            results: [{ formatted_address: '1247 Elm St, Austin, TX 78702, USA', geometry: { location: { lat: 30.278, lng: -97.718 } } }],
          }),
        });
      }
      if (urlStr.includes('streetview/metadata')) {
        return Promise.resolve({
          json: () => Promise.resolve({ status: 'OK', pano_id: 'pano_456' }),
        });
      }
      if (urlStr.includes('staticmap')) {
        return Promise.resolve({ status: 200 });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const originalFetch = global.fetch;
    global.fetch = mockFetch as any;

    try {
      const result = await executeMapsProbe('AIzaSyDUMMYKEY1234567890ABCDEF');

      expect(result.keyConfigured).toBe(true);
      expect(result.maskedKey).toBe('AIzaSy…CDEF');
      expect(result.maskedKey).not.toContain('DUMMYKEY');
      expect(result.success).toBe(true);
      expect(result.steps.scriptLoad.status).toBe('passed');
      expect(result.steps.placesAutocomplete.status).toBe('passed');
      expect(result.steps.geocoding.status).toBe('passed');
      expect(result.steps.streetViewAndStaticMaps.status).toBe('passed');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('captures upstream REQUEST_DENIED and classifies appropriately', async () => {
    const mockFetch = jest.fn<any>().mockResolvedValue({
      json: () => Promise.resolve({
        status: 'REQUEST_DENIED',
        error_message: 'This API project is not authorized to use this API.',
      }),
    });

    const originalFetch = global.fetch;
    global.fetch = mockFetch as any;

    try {
      const result = await executeMapsProbe('AIzaSyInvalidKeyTest12345');

      expect(result.success).toBe(false);
      expect(result.steps.placesAutocomplete.status).toBe('failed');
      expect(result.steps.placesAutocomplete.errorType).toBe('REQUEST_DENIED');
      expect(result.errorClassification).toBe('REQUEST_DENIED');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
