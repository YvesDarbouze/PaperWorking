/** @jest-environment node */
/**
 * Map Tile API Proxy tests
 *
 * The route requires Firebase auth (requireAuth) BEFORE checking for the API key.
 * These tests mock the auth guard so they focus purely on the tile-proxy logic,
 * which is the right testing boundary: auth correctness is covered in authenticationGates.
 */

// ── Mock auth guard so tests control auth state independently ────────────────
jest.mock('../lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue({ uid: 'test-user-uid', email: 'test@test.com' }),
  isAuthError: jest.fn().mockReturnValue(false),
}));

import { GET } from '../app/api/map-tile/route';
import { NextRequest } from 'next/server';

// Setup global fetch mock
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn();
});
afterAll(() => {
  global.fetch = originalFetch;
});

describe('Map Tile API Proxy Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when lat or lng query parameters are missing or invalid', async () => {
    const request = new NextRequest('http://localhost/api/map-tile?zoom=15');
    const response = await GET(request);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe('lat and lng are required numeric parameters');
  });

  it('returns 503 when GOOGLE_PLACES_API_KEY is not configured', async () => {
    const originalKey = process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;

    // Reset module cache to trigger PLACES_API_KEY evaluation on require
    jest.resetModules();
    // Re-mock auth in the fresh module scope
    jest.mock('../lib/firebase-admin/auth-guard', () => ({
      requireAuth: jest.fn().mockResolvedValue({ uid: 'test-user-uid' }),
      isAuthError: jest.fn().mockReturnValue(false),
    }));
    const { GET: freshGET } = require('../app/api/map-tile/route');

    const request = new NextRequest('http://localhost/api/map-tile?lat=40.7128&lng=-74.0060');
    const response = await freshGET(request);

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Map service not configured');

    process.env.GOOGLE_PLACES_API_KEY = originalKey;
  });

  it('successfully proxies static map request to Google Maps and returns binary image on success', async () => {
    const originalKey = process.env.GOOGLE_PLACES_API_KEY;
    process.env.GOOGLE_PLACES_API_KEY = 'mock-google-key';

    // Mock successful upstream maps fetch
    const mockBuffer = new ArrayBuffer(8);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => (name === 'content-type' ? 'image/png' : null),
      },
      arrayBuffer: () => Promise.resolve(mockBuffer),
    });

    jest.resetModules();
    jest.mock('../lib/firebase-admin/auth-guard', () => ({
      requireAuth: jest.fn().mockResolvedValue({ uid: 'test-user-uid' }),
      isAuthError: jest.fn().mockReturnValue(false),
    }));
    const { GET: freshGET } = require('../app/api/map-tile/route');

    const request = new NextRequest('http://localhost/api/map-tile?lat=40.7128&lng=-74.0060&zoom=15&w=640&h=256');
    const response = await freshGET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toContain('public, max-age=86400');
    expect(response.headers.get('X-Map-Source')).toBe('google-static-maps');

    // Verify correct Google static maps parameters construction
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchUrlStr = (global.fetch as jest.Mock).mock.calls[0][0];
    const fetchUrl = new URL(fetchUrlStr);
    expect(fetchUrl.origin).toBe('https://maps.googleapis.com');
    expect(fetchUrl.pathname).toBe('/maps/api/staticmap');
    expect(fetchUrl.searchParams.get('center')).toBe('40.7128,-74.006');
    expect(fetchUrl.searchParams.get('zoom')).toBe('15');
    expect(fetchUrl.searchParams.get('size')).toBe('640x256');
    expect(fetchUrl.searchParams.get('key')).toBe('mock-google-key');

    process.env.GOOGLE_PLACES_API_KEY = originalKey;
  });

  it('returns 401 when no Firebase ID token is provided', async () => {
    // Reset modules and re-apply auth guard to simulate unauthenticated
    jest.resetModules();
    const { NextResponse: NR } = require('next/server');
    jest.mock('../lib/firebase-admin/auth-guard', () => ({
      requireAuth: jest.fn().mockResolvedValue(NR.json({ error: 'Unauthorized' }, { status: 401 })),
      isAuthError: jest.fn().mockReturnValue(true),
    }));
    const { GET: freshGET } = require('../app/api/map-tile/route');
    const request = new NextRequest('http://localhost/api/map-tile?lat=40.7128&lng=-74.0060');
    const response = await freshGET(request);
    expect(response.status).toBe(401);
  });
});
