import { describe, expect, it, afterEach } from '@jest/globals';
import { handleAuthMeGet } from '../../../api/src/routes/auth/me/handler.js';
import {
  buildAuthUserFromPostgresUser,
  resolveAuthUserFromCredentials,
  type SessionResolverDeps,
  type SessionUserStore,
} from '@paperworking/services';
import { buildAuthMeDeps, resetHandlerDepsForTests } from '../../lib/api/handler-deps.js';
import {
  resolveAuthUserFromRequest,
  sessionCredentialsFromRequest,
} from '../../lib/api/server-session.js';

function makeStore(profile: Parameters<typeof buildAuthUserFromPostgresUser>[0] | null): SessionUserStore {
  return {
    findUserByUid: async () => profile,
  };
}

function makeResolverDeps(
  store: SessionUserStore,
  identity: SessionResolverDeps['identity'],
): SessionResolverDeps {
  return { store, identity };
}

describe('phase 9b — GET /api/auth/me authentication', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
    delete process.env.USE_FIREBASE_AUTH;
  });

  it('accepts Authorization Bearer token', async () => {
    const request = new Request('http://localhost/api/auth/me', {
      headers: { Authorization: 'Bearer supabase-jwt' },
    });
    expect(sessionCredentialsFromRequest(request).bearerToken).toBe('supabase-jwt');

    const deps = makeResolverDeps(
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
    );

    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      deps,
    );
    expect(user?.uid).toBe('uid-1');
  });

  it('accepts __session cookie', async () => {
    const request = new Request('http://localhost/api/auth/me', {
      headers: { cookie: '__session=session-token' },
    });

    const deps = makeResolverDeps(
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
    );

    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      deps,
    );
    expect(user?.uid).toBe('uid-2');
  });

  it('returns null for missing credentials', async () => {
    const request = new Request('http://localhost/api/auth/me');
    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      makeResolverDeps(makeStore(null), {
        supabase: { hasCredentials: () => true, verifyAccessToken: async () => ({ uid: 'x', provider: 'supabase' }) },
      }),
    );
    expect(user).toBeNull();
  });

  it('returns null for invalid token', async () => {
    const request = new Request('http://localhost/api/auth/me', {
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

  it('resolves Firebase token when Firebase flag is enabled', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const request = new Request('http://localhost/api/auth/me', {
      headers: { Authorization: 'Bearer firebase-jwt' },
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

  it('returns 401 for unauthenticated handleAuthMeGet', async () => {
    const result = await handleAuthMeGet(null, buildAuthMeDeps());
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: 'Unauthorized' });
  });
});

describe('phase 9b — DB-authoritative identity', () => {
  it('does not elevate privileges via __acct display cookie', async () => {
    const request = new Request('http://localhost/api/auth/me', {
      headers: {
        cookie: '__session=valid-token; __acct=admin',
        Authorization: 'Bearer valid-token',
      },
    });

    const postgresProfile = {
      id: 'uid-investor',
      email: 'user@example.com',
      accountType: 'investor',
      role: 'investor',
    };

    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      makeResolverDeps(makeStore(postgresProfile), {
        supabase: {
          hasCredentials: () => true,
          verifyAccessToken: async () => ({
            uid: 'uid-investor',
            email: 'user@example.com',
            provider: 'supabase',
          }),
        },
      }),
    );

    expect(user?.isAdmin).toBe(false);
    expect(user?.accountType).toBe('investor');

    const result = await handleAuthMeGet(user, {
      findUser: async () => postgresProfile,
      findSubscription: async () => ({ plan: 'Individual', status: 'active' }),
      hasActiveEntitlement: () => true,
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      isAdmin: false,
      accountType: 'investor',
    });
  });

  it('uses Postgres role via AuthUser for privileged fields', () => {
    const user = buildAuthUserFromPostgresUser(
      {
        id: 'uid-admin',
        email: 'admin@example.com',
        accountType: 'admin',
        role: 'Platform Admin',
      },
      'uid-admin',
    );

    expect(user.role).toBe('Platform Admin');
    expect(user.isAdmin).toBe(true);
  });
});

describe('phase 9b — resolveAuthUserFromRequest wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('extracts bearer credentials from Request without __acct', async () => {
    const request = new Request('http://localhost/api/auth/me', {
      headers: { Authorization: 'Bearer token-1' },
    });

    const credentials = sessionCredentialsFromRequest(request);
    expect(credentials.bearerToken).toBe('token-1');
    expect(credentials.sessionCookie).toBeUndefined();

    // Wiring exists; full DB resolution is covered by handler-deps + services tests.
    expect(typeof resolveAuthUserFromRequest).toBe('function');
  });
});
