import { GET, POST } from '@/app/api/street-view/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue({ uid: 'user_123', email: 'test@example.com' }),
  isAuthError: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/maps/street-view', () => ({
  getStreetViewImage: jest.fn().mockResolvedValue({
    imageUrl: 'https://maps.googleapis.com/maps/api/streetview?location=37.422,-122.084',
    metadata: { lat: 37.422, lng: -122.084, heading: 0, pitch: 10, fov: 90 },
    available: true,
  }),
}));

describe('Street View API Proxy Endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, GOOGLE_PLACES_API_KEY: 'test_api_key' };
    (global as any).fetch = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 400 when lat or lng query parameters are missing or invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/street-view?lat=abc&lng=123');
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('lat and lng are required numeric parameters');
  });

  it('returns 503 when GOOGLE_PLACES_API_KEY is not configured', async () => {
    delete process.env.GOOGLE_PLACES_API_KEY;
    const req = new NextRequest('http://localhost:3000/api/street-view?lat=37.422&lng=-122.084');
    const res = await GET(req);

    expect(res.status).toBe(503);
    const body = await res.text();
    expect(body).toContain('Street View service not configured');
  });

  it('proxies metadata request when metadata=true', async () => {
    const mockMetadata = { status: 'OK', date: '2023-01', location: { lat: 37.422, lng: -122.084 } };
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockMetadata),
    });

    const req = new NextRequest('http://localhost:3000/api/street-view?lat=37.422&lng=-122.084&metadata=true');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockMetadata);
  });

  it('successfully proxies street view image request on success', async () => {
    const mockBuffer = new ArrayBuffer(8);
    (global as any).fetch.mockResolvedValueOnce({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValueOnce(mockBuffer),
      headers: new Headers({ 'content-type': 'image/jpeg' }),
    });

    const req = new NextRequest('http://localhost:3000/api/street-view?lat=37.422&lng=-122.084');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('X-StreetView-Source')).toBe('google-street-view-static');
  });

  it('handles POST requests with valid coordinates', async () => {
    const req = new NextRequest('http://localhost:3000/api/street-view', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.422, lng: -122.084 }),
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.available).toBe(true);
  });

  it('returns 400 on POST with invalid coordinates', async () => {
    const req = new NextRequest('http://localhost:3000/api/street-view', {
      method: 'POST',
      body: JSON.stringify({ lat: 'invalid' }),
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid coordinates');
  });
});
