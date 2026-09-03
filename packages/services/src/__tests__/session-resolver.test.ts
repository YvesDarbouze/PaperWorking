import { describe, expect, it } from '@jest/globals';
import {
  buildAuthUserFromPostgresUser,
  normalizeClientAccountType,
  resolveAuthUserFromAccessToken,
  type PostgresUserProfile,
  type SessionResolverDeps,
  type SessionUserStore,
} from '../session/index.js';

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

function makeStore(profile: PostgresUserProfile | null): SessionUserStore {
  return {
    findUserByUid: async () => profile,
  };
}

function makeDeps(store: SessionUserStore, identity: SessionResolverDeps['identity']): SessionResolverDeps {
  return { store, identity };
}

describe('shared session resolver', () => {
  it('returns null for missing token', async () => {
    const deps = makeDeps(makeStore(null), {
      firebase: {
        hasCredentials: () => true,
        verifyIdToken: async () => ({ uid: 'u1', provider: 'firebase' }),
        verifySessionCookie: async () => ({ uid: 'u1', provider: 'firebase' }),
        createSessionCookie: async () => 'cookie',
      },
    });
    await expect(resolveAuthUserFromAccessToken(undefined, deps)).resolves.toBeNull();
  });

  it('returns null for invalid token', async () => {
    const deps = makeDeps(makeStore(null), {
      firebase: {
        hasCredentials: () => true,
        verifyIdToken: async () => {
          throw new Error('bad token');
        },
        verifySessionCookie: async () => {
          throw new Error('bad token');
        },
        createSessionCookie: async () => 'cookie',
      },
    });
    await expect(resolveAuthUserFromAccessToken('bad', deps)).resolves.toBeNull();
  });

  it('builds AuthUser from Postgres accountType and isAdmin', () => {
    const user = buildAuthUserFromPostgresUser(
      {
        id: 'uid-1',
        email: 'investor@example.com',
        accountType: 'vendor',
        role: 'Vendor',
      },
      'uid-1',
    );
    expect(user.accountType).toBe('vendor');
    expect(user.isAdmin).toBe(false);
  });

  it('derives isAdmin from Postgres only', () => {
    const user = buildAuthUserFromPostgresUser(
      {
        id: 'uid-admin',
        email: 'admin@example.com',
        accountType: 'admin',
        role: 'Platform Admin',
      },
      'uid-admin',
    );
    expect(user.isAdmin).toBe(true);
    expect(user.accountType).toBe('admin');
  });

  it('does not use display cookie values — Postgres row is authoritative', () => {
    const user = buildAuthUserFromPostgresUser(
      {
        id: 'uid-1',
        email: 'a@example.com',
        accountType: 'investor',
        role: 'investor',
      },
      'uid-1',
    );
    expect(user.accountType).toBe('investor');
    expect(user.isAdmin).toBe(false);
  });

  it('rejects client admin on first provisioning normalization', () => {
    expect(normalizeClientAccountType('admin')).toBe('investor');
    expect(normalizeClientAccountType('ADMIN')).toBe('investor');
  });

  it('resolves AuthUser after Firebase token verification', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const deps = makeDeps(
      makeStore({
        id: '11111111-1111-4111-8111-111111111111',
        email: 'investor@example.com',
        accountType: 'investor',
        role: 'investor',
      }),
      {
        firebase: {
          hasCredentials: () => true,
          verifyIdToken: async () => ({
            uid: '11111111-1111-4111-8111-111111111111',
            email: 'investor@example.com',
            provider: 'firebase',
          }),
          verifySessionCookie: async () => ({
            uid: '11111111-1111-4111-8111-111111111111',
            provider: 'firebase',
          }),
          createSessionCookie: async () => 'cookie',
        },
      },
    );

    const user = await resolveAuthUserFromAccessToken(
      fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' }),
      deps,
    );
    delete process.env.USE_FIREBASE_AUTH;
    expect(user?.uid).toBe('11111111-1111-4111-8111-111111111111');
    expect(user?.accountType).toBe('investor');
  });

  it('resolves AuthUser after Firebase session cookie', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const deps = makeDeps(
      makeStore({
        id: 'firebase-uid-1',
        email: 'fb@example.com',
        accountType: 'investor',
        role: 'Lead Investor',
      }),
      {
        firebase: {
          hasCredentials: () => true,
          verifyIdToken: async () => ({
            uid: 'firebase-uid-1',
            email: 'fb@example.com',
            provider: 'firebase',
          }),
          verifySessionCookie: async () => ({
            uid: 'firebase-uid-1',
            provider: 'firebase',
          }),
          createSessionCookie: async () => 'cookie',
        },
      },
    );

    const user = await resolveAuthUserFromAccessToken(
      fakeJwt({ iss: 'https://session.firebase.google.com/paperworking-97055' }),
      deps,
    );
    delete process.env.USE_FIREBASE_AUTH;
    expect(user?.uid).toBe('firebase-uid-1');
  });
});

describe('parity: same identity + same Postgres row => same AuthUser', () => {
  it('matches direct buildAuthUserFromPostgresUser semantics', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const row = {
      id: 'uid-parity',
      email: 'parity@example.com',
      accountType: 'investment_team',
      role: 'Admin',
    };
    const direct = buildAuthUserFromPostgresUser(row, 'uid-parity');

    const deps = makeDeps(makeStore(row), {
      firebase: {
        hasCredentials: () => true,
        verifyIdToken: async () => ({
          uid: 'uid-parity',
          email: 'parity@example.com',
          provider: 'firebase',
        }),
        verifySessionCookie: async () => ({
          uid: 'uid-parity',
          provider: 'firebase',
        }),
        createSessionCookie: async () => 'cookie',
      },
    });

    const resolved = await resolveAuthUserFromAccessToken(
      fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' }),
      deps,
    );
    delete process.env.USE_FIREBASE_AUTH;
    expect(resolved).toEqual(direct);
  });
});
