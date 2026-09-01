import { describe, expect, it, afterEach } from '@jest/globals';
import {
  buildAuthSessionsResponse,
  handleAuthSessionsGet,
} from '../../../api/src/routes/auth/sessions/handler.js';
import {
  resolveAuthUserFromCredentials,
  type SessionResolverDeps,
  type SessionUserStore,
} from '@paperworking/services';
import { resetHandlerDepsForTests } from '../../lib/api/handler-deps.js';
import {
  resolveAuthUserFromRequest,
  sessionCredentialsFromRequest,
} from '../../lib/api/server-session.js';

function makeStore(
  profile: {
    id: string;
    email?: string;
    accountType?: string;
    role?: string;
  } | null,
): SessionUserStore {
  return { findUserByUid: async () => profile };
}

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

function makeResolverDeps(
  store: SessionUserStore,
  identity: SessionResolverDeps['identity'],
): SessionResolverDeps {
  return { store, identity };
}

describe('phase 9c — GET /api/auth/sessions authentication', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
    delete process.env.USE_FIREBASE_AUTH;
  });

  it('accepts Authorization Bearer token', async () => {
    const request = new Request('http://localhost/api/auth/sessions', {
      headers: { Authorization: 'Bearer supabase-jwt' },
    });

    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      makeResolverDeps(
        makeStore({
          id: 'uid-1',
          email: 'a@example.com',
          accountType: 'investor',
          role: 'investor',
        }),
        {
          supabase: {
            hasCredentials: () => true,
            verifyAccessToken: async () => ({
              uid: 'uid-1',
              email: 'a@example.com',
              provider: 'supabase',
            }),
          },
        },
      ),
    );

    expect(user?.uid).toBe('uid-1');
  });

  it('accepts __session cookie', async () => {
    const request = new Request('http://localhost/api/auth/sessions', {
      headers: { cookie: '__session=session-token' },
    });

    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      makeResolverDeps(
        makeStore({
          id: 'uid-2',
          email: 'b@example.com',
          accountType: 'investor',
          role: 'investor',
        }),
        {
          supabase: {
            hasCredentials: () => true,
            verifyAccessToken: async () => ({
              uid: 'uid-2',
              email: 'b@example.com',
              provider: 'supabase',
            }),
          },
        },
      ),
    );

    expect(user?.uid).toBe('uid-2');
  });

  it('returns null for missing credentials', async () => {
    const request = new Request('http://localhost/api/auth/sessions');
    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      makeResolverDeps(makeStore(null), {
        supabase: {
          hasCredentials: () => true,
          verifyAccessToken: async () => ({ uid: 'x', provider: 'supabase' }),
        },
      }),
    );
    expect(user).toBeNull();
  });

  it('returns null for invalid token', async () => {
    const request = new Request('http://localhost/api/auth/sessions', {
      headers: { Authorization: 'Bearer bad-token' },
    });

    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      makeResolverDeps(makeStore(null), {
        supabase: {
          hasCredentials: () => true,
          verifyAccessToken: async () => {
            throw new Error('invalid token');
          },
        },
      }),
    );
    expect(user).toBeNull();
  });

  it('returns 401 for unauthenticated handleAuthSessionsGet', async () => {
    const result = await handleAuthSessionsGet(null);
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'Unauthorized' });
  });

  it('resolves Firebase token when Firebase flag is enabled', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const firebaseToken = fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' });
    const request = new Request('http://localhost/api/auth/sessions', {
      headers: { Authorization: `Bearer ${firebaseToken}` },
    });

    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      makeResolverDeps(
        makeStore({
          id: 'firebase-uid',
          email: 'fb@example.com',
          accountType: 'investor',
          role: 'Lead Investor',
        }),
        {
          supabase: {
            hasCredentials: () => false,
            verifyAccessToken: async () => {
              throw new Error('supabase disabled');
            },
          },
          firebase: {
            hasCredentials: () => true,
            verifyIdToken: async () => ({
              uid: 'firebase-uid',
              email: 'fb@example.com',
              provider: 'firebase',
            }),
            verifySessionCookie: async () => ({ uid: 'firebase-uid', provider: 'firebase' }),
            createSessionCookie: async () => 'cookie',
          },
        },
      ),
    );

    expect(user?.uid).toBe('firebase-uid');
  });
});

describe('phase 9c — DB-authoritative identity', () => {
  it('does not elevate or change uid via __acct display cookie', async () => {
    const request = new Request('http://localhost/api/auth/sessions', {
      headers: {
        cookie: '__session=valid-token; __acct=admin',
        Authorization: 'Bearer valid-token',
      },
    });

    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      makeResolverDeps(
        makeStore({
          id: 'uid-investor',
          email: 'user@example.com',
          accountType: 'investor',
          role: 'investor',
        }),
        {
          supabase: {
            hasCredentials: () => true,
            verifyAccessToken: async () => ({
              uid: 'uid-investor',
              email: 'user@example.com',
              provider: 'supabase',
            }),
          },
        },
      ),
    );

    expect(user?.isAdmin).toBe(false);
    expect(user?.uid).toBe('uid-investor');

    const result = await handleAuthSessionsGet(user, 'TestBrowser/1.0', {
      now: () => new Date('2026-03-15T12:00:00.000Z'),
    });

    expect(result.status).toBe(200);
    const body = result.body as { sessions: Array<{ uid: string }> };
    expect(body.sessions[0]?.uid).toBe('uid-investor');
  });
});

describe('phase 9c — user-agent forwarding', () => {
  it('passes user-agent into session record', async () => {
    const fixedNow = new Date('2026-03-15T12:00:00.000Z');
    const body = buildAuthSessionsResponse(
      { uid: 'uid-1', accountType: 'investor', isAdmin: false },
      'CustomAgent/2.0',
      { now: () => fixedNow },
    );

    expect(body.sessions[0]?.userAgent).toBe('CustomAgent/2.0');
  });

  it('resolveAuthUserFromRequest is wired for Next adapter', () => {
    expect(typeof resolveAuthUserFromRequest).toBe('function');
  });
});
