import { describe, expect, it } from '@jest/globals';
import { validateCsrf } from '../lib/auth/csrf.js';

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
  it('allows localhost origin in non-production', () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const result = validateCsrf(mockRequest({ origin: 'http://localhost:3000' }));
    process.env.NODE_ENV = prev;
    expect(result.ok).toBe(true);
  });

  it('rejects cross-site requests', () => {
    const result = validateCsrf(
      mockRequest({ 'sec-fetch-site': 'cross-site', origin: 'http://localhost:3000' }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });
});
