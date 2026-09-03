import { describe, expect, it, afterEach, beforeEach } from '@jest/globals';
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

function firebaseIdentity(overrides?: Partial<SessionResolverDeps['identity']['firebase']>) {
  return {
    firebase: {
      hasCredentials: () => true,
      verifyIdToken: async () => ({
        uid: 'uid-1',
        email: 'a@example.com',
        provider: 'firebase' as const,
      }),
      verifySessionCookie: async () => ({
        uid: 'uid-1',
        provider: 'firebase' as const,
      }),
      createSessionCookie: async () => 'cookie',
      ...overrides,
    },
  };
}

function makeResolverDeps(
  store: SessionUserStore,
  identity: SessionResolverDeps['identity'],
): SessionResolverDeps {
  return { store, identity };
}

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

describe('phase 9b — GET /api/auth/me authentication', () => {
  beforeEach(() => {
    process.env.USE_FIREBASE_AUTH = 'true';
  });

  afterEach(() => {
    resetHandlerDepsForTests();
    delete process.env.USE_FIREBASE_AUTH;
  });

  it('accepts Authorization Bearer token', async () => {
    const token = fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' });
    const request = new Request('http://localhost/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(sessionCredentialsFromRequest(request).bearerToken).toBe(token);

    const deps = makeResolverDeps(
      makeStore({
        id: 'uid-1',
        email: 'a@example.com',
        accountType: 'investor',
        role: 'investor',
      }),
      firebaseIdentity({
        verifyIdToken: async () => ({
          uid: 'uid-1',
          email: 'a@example.com',
          provider: 'firebase',
        }),
      }),
    );

    const user = await resolveAuthUserFromCredentials(
      sessionCredentialsFromRequest(request),
      deps,
    );
    expect(user?.uid).toBe('uid-1');
  });

  it('accepts __session cookie', async () => {
    const sessionCookie = fakeJwt({ iss: 'https://session.firebase.google.com/paperworking-97055' });
    const request = new Request('http://localhost/api/auth/me', {
      headers: { cookie: `__session=${sessionCookie}` },
    });

    const deps = makeResolverDeps(
      makeStore({
        id: 'uid-2',
        email: 'b@example.com',
        accountType: 'investor',
        role: 'investor',
      }),
      firebaseIdentity({
        verifySessionCookie: async () => ({
          uid: 'uid-2',
          provider: 'firebase',
        }),
        verifyIdToken: async () => ({
          uid: 'uid-2',
          email: 'b@example.com',
          provider: 'firebase',
        }),
      }),
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
      makeResolverDeps(makeStore(null), firebaseIdentity()),
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
        firebase: {
          hasCredentials: () => true,
          verifyIdToken: async () => {
            throw new Error('invalid token');
          },
          verifySessionCookie: async () => {
            throw new Error('invalid token');
          },
          createSessionCookie: async () => 'cookie',
        },
      }),
    );
    expect(user).toBeNull();
  });

  it('resolves Firebase token when Firebase flag is enabled', async () => {
    const firebaseToken = fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' });
    const request = new Request('http://localhost/api/auth/me', {
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
        firebaseIdentity({
          verifyIdToken: async () => ({
            uid: 'firebase-uid',
            email: 'fb@example.com',
            provider: 'firebase',
          }),
        }),
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
  beforeEach(() => {
    process.env.USE_FIREBASE_AUTH = 'true';
  });

  afterEach(() => {
    delete process.env.USE_FIREBASE_AUTH;
  });

  it('does not elevate privileges via __acct display cookie', async () => {
    const token = fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' });
    const request = new Request('http://localhost/api/auth/me', {
      headers: {
        cookie: '__session=valid-token; __acct=admin',
        Authorization: `Bearer ${token}`,
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
        firebase: {
          hasCredentials: () => true,
          verifyIdToken: async () => ({
            uid: 'uid-investor',
            email: 'user@example.com',
            provider: 'firebase',
          }),
          verifySessionCookie: async () => ({
            uid: 'uid-investor',
            provider: 'firebase',
          }),
          createSessionCookie: async () => 'cookie',
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

    expect(typeof resolveAuthUserFromRequest).toBe('function');
  });
});
