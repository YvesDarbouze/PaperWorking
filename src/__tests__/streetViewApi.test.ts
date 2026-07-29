import { GET } from '@/app/api/street-view/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue({ uid: 'user_123', email: 'test@example.com' }),
  isAuthError: jest.fn().mockReturnValue(false),
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
});
