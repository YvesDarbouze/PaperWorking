import { describe, expect, it, jest, beforeEach, beforeAll } from '@jest/globals';
import { normalizeClientAccountType } from '../auth/account-type.js';

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

function makeFirebaseIdentityDeps(firebaseAuth: {
  hasCredentials: () => boolean;
  verifyIdToken: (token: string) => Promise<{ uid: string; email?: string }>;
}) {
  return {
    firebase: {
      hasCredentials: firebaseAuth.hasCredentials,
      verifyIdToken: (token: string) =>
        firebaseAuth.verifyIdToken(token).then((r) => ({
          uid: r.uid,
          email: r.email,
          provider: 'firebase' as const,
        })),
      verifySessionCookie: jest.fn(),
      createSessionCookie: jest.fn(),
    },
  };
}

describe('AuthService accountType escalation prevention', () => {
  let AuthService: AuthServiceCtor;

  const firebaseVerifier = {
    hasCredentials: jest.fn(() => true),
    verifyIdToken: jest.fn(),
  };

  let auth: InstanceType<AuthServiceCtor>;
  const cookies: Array<{ name: string; value: string }> = [];
  const res = {
    cookie: (name: string, value: string) => {
      cookies.push({ name, value });
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
    auth = new AuthService(makeFirebaseIdentityDeps(firebaseVerifier) as never);
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
    mockAuthProfile.findSubscriptionForUid.mockResolvedValue(null);
  });

  it('does not overwrite accountType for existing user on session sync', async () => {
    firebaseVerifier.verifyIdToken.mockResolvedValue({
      uid: 'user-existing',
      email: 'investor@example.com',
    });
    mockIdentityRepo.findById.mockResolvedValue({
      id: 'user-existing',
      email: 'investor@example.com',
      accountType: 'investor',
    });
    mockSessionStore.findUserByUid.mockResolvedValue({
      id: 'user-existing',
      email: 'investor@example.com',
      accountType: 'investor',
      role: 'investor',
    });

    await auth.createSession(res as never, {
      accessToken: fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' }),
      accountType: 'vendor',
    });

    expect(mockIdentityRepo.updateEmail).toHaveBeenCalledWith(
      'user-existing',
      'investor@example.com',
    );
    expect(mockIdentityRepo.createUser).not.toHaveBeenCalled();
  });

  it('accepts accountType only on first-time user create', async () => {
    firebaseVerifier.verifyIdToken.mockResolvedValue({
      uid: 'user-new',
      email: 'new@example.com',
    });
    mockIdentityRepo.findById.mockResolvedValue(null);
    mockIdentityRepo.findByLegacyUid.mockResolvedValue(null);
    mockIdentityRepo.findByEmail.mockResolvedValue(null);
    mockSessionStore.findUserByUid.mockResolvedValue({
      id: 'user-new',
      email: 'new@example.com',
      accountType: 'vendor',
      role: null,
    });

    await auth.createSession(res as never, {
      accessToken: fakeJwt({ iss: 'https://securetoken.google.com/paperworking-97055' }),
      accountType: 'vendor',
    });

    expect(mockIdentityRepo.createUser).toHaveBeenCalledWith({
      id: 'user-new',
      email: 'new@example.com',
      accountType: 'vendor',
    });
  });

  it('normalizeClientAccountType rejects admin escalation from client', () => {
    expect(normalizeClientAccountType('admin')).toBe('investor');
    expect(normalizeClientAccountType('vendor')).toBe('vendor');
  });
});
