import { describe, expect, it, jest, beforeEach, beforeAll } from '@jest/globals';

type AuthServiceCtor = typeof import('../auth/auth.service.js').AuthService;

const mockIdentityRepo = {
  findById: jest.fn<() => Promise<unknown>>(),
  findByFirebaseUid: jest.fn<() => Promise<unknown>>(),
  findByLegacyUid: jest.fn<() => Promise<unknown>>(),
  findByEmail: jest.fn<() => Promise<unknown>>(),
  updateEmail: jest.fn<() => Promise<void>>(),
  updateAfterEmailRemap: jest.fn<() => Promise<void>>(),
  createUser: jest.fn<() => Promise<void>>(),
  remapPrimaryKey: jest.fn<() => Promise<void>>(),
};

const mockSessionStore = {
  findUserByUid: jest.fn<() => Promise<unknown>>(),
};

const mockAuthProfile = {
  findUser: jest.fn<() => Promise<unknown>>(),
  findSubscription: jest.fn<() => Promise<unknown>>(),
  findSubscriptionForUid: jest.fn<() => Promise<unknown>>(),
};

function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

function makeFirebaseIdentityDeps(overrides: {
  verifyIdToken?: jest.Mock;
} = {}) {
  return {
    firebase: {
      hasCredentials: () => true,
      verifyIdToken:
        overrides.verifyIdToken ??
        jest.fn(async () => ({
          uid: '11111111-1111-4111-8111-111111111111',
          email: 'investor@example.com',
          provider: 'firebase' as const,
        })),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    },
  };
}

describe('AuthService Firebase session', () => {
  let AuthService: AuthServiceCtor;

  let auth: InstanceType<AuthServiceCtor>;
  const cookies: Array<{ name: string; value: string; httpOnly?: boolean }> = [];
  const res = {
    cookie: (name: string, value: string, opts: { httpOnly?: boolean }) => {
      cookies.push({ name, value, httpOnly: opts.httpOnly });
    },
  };

  beforeAll(async () => {
    await jest.unstable_mockModule('@paperworking/database', () => ({
      createSessionUserStore: () => mockSessionStore,
      createIdentityUserRepository: () => mockIdentityRepo,
      createAuthProfileAccess: () => mockAuthProfile,
    }));
    ({ AuthService } = await import('../auth/auth.service.js'));
  });

  beforeEach(() => {
    cookies.length = 0;
    jest.clearAllMocks();
    process.env.USE_FIREBASE_AUTH = 'true';
    process.env.DATABASE_READ_MODE = 'firestore';
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
    auth = new AuthService(makeFirebaseIdentityDeps() as never);
  });

  it('rejects missing accessToken', async () => {
    const result = await auth.createSession(res as never, {});
    expect(result).toMatchObject({ status: 400 });
  });

  it('sets httpOnly __session cookie after Firebase verify', async () => {
    mockIdentityRepo.findById.mockResolvedValue(null);
    mockIdentityRepo.findByLegacyUid.mockResolvedValue(null);
    mockIdentityRepo.findByEmail.mockResolvedValue(null);
    mockAuthProfile.findSubscriptionForUid.mockResolvedValue({
      plan: 'Individual',
      status: 'active',
    });
    mockSessionStore.findUserByUid.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      email: 'investor@example.com',
      accountType: 'investor',
      role: 'investor',
    });

    const accessToken = fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' });
    const result = await auth.createSession(res as never, {
      accessToken,
      accountType: 'investor',
    });

    expect(result).toEqual({ ok: true, uid: '11111111-1111-4111-8111-111111111111' });
    const session = cookies.find((c) => c.name === '__session');
    expect(session?.value).toBe(accessToken);
    expect(session?.httpOnly).toBe(true);
  });

  it('returns 401 for invalid Firebase token', async () => {
    auth = new AuthService(
      makeFirebaseIdentityDeps({
        verifyIdToken: jest.fn(async () => {
          throw new Error('bad token');
        }),
      }) as never,
    );
    const result = await auth.createSession(res as never, {
      accessToken: fakeJwt({ iss: 'https://securetoken.google.com/x' }),
    });
    expect(result).toMatchObject({ status: 401 });
  });
});
