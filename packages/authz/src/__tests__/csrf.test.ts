import { afterEach, describe, expect, it } from '@jest/globals';
import { validateCsrf } from '../csrf.js';

function mockRequest(headers: Record<string, string>): Request {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: {
      get(name: string) {
        return lower[name.toLowerCase()] ?? null;
      },
    },
  } as Request;
}

describe('validateCsrf', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it('allows Firebase App Hosting origin in production', () => {
    process.env.NODE_ENV = 'production';
    const result = validateCsrf(
      mockRequest({
        origin: 'https://paperworker--paperworking-97055.us-east4.hosted.app',
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('allows any https *.hosted.app origin (App Hosting preview URLs)', () => {
    process.env.NODE_ENV = 'production';
    const result = validateCsrf(
      mockRequest({
        origin: 'https://other-backend--paperworking-97055.us-west1.hosted.app',
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('allows CORS_ORIGINS env extras in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGINS = 'https://staging.example.com';
    const result = validateCsrf(mockRequest({ origin: 'https://staging.example.com' }));
    expect(result.ok).toBe(true);
  });

  it('rejects unknown production origin', () => {
    process.env.NODE_ENV = 'production';
    const result = validateCsrf(mockRequest({ origin: 'https://evil.example.com' }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.reason).toBe('Origin not allowed');
    }
  });

  it('rejects cross-site requests', () => {
    const result = validateCsrf(
      mockRequest({ 'sec-fetch-site': 'cross-site', origin: 'https://paperworking.co' }),
    );
    expect(result.ok).toBe(false);
  });
});
