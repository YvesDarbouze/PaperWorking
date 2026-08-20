import { describe, expect, it, jest } from '@jest/globals';
import {
  handleSessionDelete,
  handleSessionPost,
} from '../routes/auth/session/handler.js';
import type { HttpRequestLike } from '../http/response.js';

function mockRequest(headers: Record<string, string>): HttpRequestLike {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: {
      get(name: string) {
        return lower[name.toLowerCase()] ?? null;
      },
    },
  };
}

describe('POST /api/auth/session', () => {
  it('rejects cross-site CSRF', async () => {
    const request = mockRequest({ 'sec-fetch-site': 'cross-site' });
    const result = await handleSessionPost(request, { idToken: 'token' });

    expect(result.status).toBe(403);
  });

  it('returns 400 when idToken missing', async () => {
    const request = mockRequest({ origin: 'http://localhost:3000' });
    const result = await handleSessionPost(request, {});

    expect(result.status).toBe(400);
  });

  it('issues dev cookies when credentials unavailable in test env', async () => {
    const request = mockRequest({ origin: 'http://localhost:3000' });
    const result = await handleSessionPost(
      request,
      { idToken: 'dev-token' },
      {
        hasCredentials: () => false,
        env: { nodeEnv: 'test', enableMockAuth: true },
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: 'success', mode: 'dev' });
    expect(result.cookies?.some((c) => c.name === '__session' && c.value === 'dev-token')).toBe(true);
  });

  it('sets production cookies after token verification', async () => {
    const request = mockRequest({
      origin: 'http://localhost:3000',
      'user-agent': 'Mac OS',
    });

    const result = await handleSessionPost(
      request,
      { idToken: 'valid-token' },
      {
        hasCredentials: () => true,
        verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user_abc' }),
        createSessionCookie: jest.fn().mockResolvedValue('session-cookie-value'),
        getUserProfile: jest.fn().mockResolvedValue({
          subscriptionPlan: 'Team',
          subscriptionStatus: 'active',
          accountType: 'investor',
        }),
        trackSession: jest.fn().mockResolvedValue(undefined),
        env: { nodeEnv: 'test' },
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: 'success', uid: 'user_abc' });
    const names = result.cookies?.map((c) => c.name) ?? [];
    expect(names).toEqual(expect.arrayContaining(['__session', '__sub', '__acct', '__session_id']));
  });
});

describe('DELETE /api/auth/session', () => {
  it('clears session cookies on logout', async () => {
    const request = mockRequest({
      origin: 'http://localhost:3000',
      cookie: '__session=abc; __session_id=sid1',
    });

    const result = await handleSessionDelete(request, { env: { nodeEnv: 'test' } });

    expect(result.status).toBe(200);
    expect(result.cookies?.every((c) => c.value === '')).toBe(true);
  });
});
