import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { SessionCommandService } from '../auth/session-command.service.js';
import type { IdentityProvisioningService } from '../auth/types.js';

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

describe('SessionCommandService', () => {
  const identityProvisioning: IdentityProvisioningService = {
    provisionFromVerifiedIdentity: jest.fn(async () => ({
      uid: 'user-1',
      email: 'user@example.com',
      accountType: 'investor',
      isAdmin: false,
    })),
  };

  const subscriptionLookup = {
    findForUserId: jest.fn(async () => ({ plan: 'Team', status: 'active' })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.USE_FIREBASE_AUTH;
    delete process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH;
  });

  it('returns 400 when access token missing', async () => {
    const service = new SessionCommandService();
    const result = await service.establishSession({
      identity: {},
      identityProvisioning,
      subscriptionLookup,
      policy: 'nest',
    });
    expect(result).toEqual({ ok: false, status: 400, body: { error: 'accessToken required' } });
  });

  it('returns 503 when identity credentials unavailable', async () => {
    const service = new SessionCommandService();
    const result = await service.establishSession({
      accessToken: 'token',
      identity: { firebase: { hasCredentials: () => false } },
      identityProvisioning,
      subscriptionLookup,
      policy: 'nest',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it('establishes nest session cookies from authoritative AuthUser', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const accessToken = fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' });
    const service = new SessionCommandService();
    const result = await service.establishSession({
      accessToken,
      accountType: 'admin',
      identity: {
        firebase: {
          hasCredentials: () => true,
          verifyIdToken: jest.fn(async () => ({
            uid: 'user-1',
            email: 'user@example.com',
            provider: 'firebase' as const,
          })),
          verifySessionCookie: jest.fn(async () => ({
            uid: 'user-1',
            provider: 'firebase' as const,
          })),
          createSessionCookie: jest.fn(async () => 'session-cookie'),
        },
      },
      identityProvisioning,
      subscriptionLookup,
      policy: 'nest',
    });
    delete process.env.USE_FIREBASE_AUTH;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.uid).toBe('user-1');
      const names = result.cookies.map((c) => c.name);
      expect(names).toEqual(expect.arrayContaining(['__session', '__acct', '__sub']));
      expect(result.cookies.find((c) => c.name === '__session')?.value).toBe(accessToken);
      expect(identityProvisioning.provisionFromVerifiedIdentity).toHaveBeenCalled();
    }
  });

  it('builds next clear-session cookies including __session_id', () => {
    const service = new SessionCommandService();
    const cookies = service.buildClearSessionCookies({ policy: 'next', nodeEnv: 'test' });
    expect(cookies.map((c) => c.name)).toEqual(
      expect.arrayContaining(['__session', '__acct', '__sub', '__session_id']),
    );
  });
});
