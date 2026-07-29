/** @jest-environment node */
/**
 * Public Autocomplete API Route tests
 *
 * Verifies public, unauthenticated predictive autocomplete:
 * - Rate limiting (IP-based, 20/min)
 * - Returns stripped predictions (placeId + description only)
 * - Restrictive CORS headers (Access-Control-Allow-Origin: *)
 */

import { POST, OPTIONS } from '../app/api/places/autocomplete-public/route';
import { NextRequest } from 'next/server';

// ── Mock rate limiter ───────────────────────────────────
const mockCheckPublicRateLimit = jest.fn();
jest.mock('@/lib/places/publicRateLimit', () => ({
  __esModule: true,
  checkPublicRateLimit: (...args: any[]) => mockCheckPublicRateLimit(...args),
  rateLimitResponse: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }),
}));

// ── Mock Places Gateway ─────────────────────────────────
const mockAutocomplete = jest.fn();
jest.mock('@/lib/places/placesGateway', () => ({
  __esModule: true,
  autocomplete: (...args: any[]) => mockAutocomplete(...args),
}));

describe('Public Autocomplete API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckPublicRateLimit.mockResolvedValue({ allowed: true, remaining: 20, limit: 20 });
  });

  it('allows options preflight request with correct headers', async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
  });

  it('returns empty predictions for short input', async () => {
    const req = new NextRequest('http://localhost/api/places/autocomplete-public', {
      method: 'POST',
      body: JSON.stringify({ input: 'a' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.predictions).toEqual([]);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('calls PlacesGateway.autocomplete with "public" and returns stripped predictions', async () => {
    const mockGooglePredictions = [
      {
        placeId: 'place_1',
        description: '123 Main St, Austin, TX, USA',
        mainText: '123 Main St',
        secondaryText: 'Austin, TX, USA',
      },
    ];
    mockAutocomplete.mockResolvedValue(mockGooglePredictions);

    const req = new NextRequest('http://localhost/api/places/autocomplete-public', {
      method: 'POST',
      body: JSON.stringify({ input: '123 Main' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    // Verify it called autocomplete gateway correctly
    expect(mockAutocomplete).toHaveBeenCalledWith('123 Main', expect.any(String), 'public');

    // Verify mainText and secondaryText are stripped (ToS privacy constraint)
    expect(data.predictions).toEqual([
      {
        placeId: 'place_1',
        description: '123 Main St, Austin, TX, USA',
      },
    ]);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('returns 429 when public rate limit is exceeded', async () => {
    mockCheckPublicRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      limit: 20,
      retryAfterSeconds: 45,
    });

    const req = new NextRequest('http://localhost/api/places/autocomplete-public', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '203.0.113.195',
      },
      body: JSON.stringify({ input: '123 Main' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    const data = await res.json();
    expect(data.error).toBe('Rate limit exceeded');
    expect(mockCheckPublicRateLimit).toHaveBeenCalledWith('203.0.113.195');
  });
});
