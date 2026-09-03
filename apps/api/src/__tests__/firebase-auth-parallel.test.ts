import { describe, expect, it, jest, beforeEach, beforeAll } from '@jest/globals';
import { AuthorizationService, type AuthzStore } from '@paperworking/authz';
import { validateCsrf } from '@paperworking/authz';

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

const FIREBASE_TOKEN = fakeJwt({
  iss: 'https://securetoken.google.com/paperworking-97055',
  sub: 'firebase-user-1',
});
const SUPABASE_TOKEN = fakeJwt({
  iss: 'https://abc.supabase.co/auth/v1',
  sub: 'supabase-user-1',
});

function makeFirebaseIdentityDeps() {
  const firebase = {
    hasCredentials: jest.fn(() => true),
    verifyIdToken: jest.fn(async () => ({
      uid: 'firebase-user-1',
      email: 'firebase@example.com',
      provider: 'firebase' as const,
    })),
    verifySessionCookie: jest.fn(),
    createSessionCookie: jest.fn(),
  };
  return { firebase };
}

describe('Firebase Auth parallel (AuthService)', () => {
  let AuthService: AuthServiceCtor;

  beforeAll(async () => {
    await jest.unstable_mockModule('@paperworking/database', () => ({
      createSessionUserStore: () => mockSessionStore,
      createIdentityUserRepository: () => mockIdentityRepo,
      createAuthProfileAccess: () => mockAuthProfile,
    }));
    ({ AuthService } = await import('../auth/auth.service.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.USE_FIREBASE_AUTH;
    delete process.env.NEXT_PUBLIC_USE_FIREBASE_AUTH;
    process.env.DATABASE_READ_MODE = 'firestore';
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_MOCK_AUTH = 'false';
    mockAuthProfile.findSubscriptionForUid.mockResolvedValue(null);
  });

  it('rejects Supabase tokens when Firebase mode is on', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const deps = makeFirebaseIdentityDeps();
    const auth = new AuthService(deps as never);
    const res = { cookie: jest.fn() };

    const result = await auth.createSession(res as never, {
      accessToken: SUPABASE_TOKEN,
      accountType: 'investor',
    });

    expect(result).toMatchObject({ status: 401 });
    expect(deps.firebase.verifyIdToken).not.toHaveBeenCalled();
  });

  it('uses Firebase verifier when flag is on and token is Firebase-issued', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const deps = makeFirebaseIdentityDeps();
    const auth = new AuthService(deps as never);
    const res = { cookie: jest.fn() };

    mockIdentityRepo.findById.mockResolvedValue(null);
    mockIdentityRepo.findByLegacyUid.mockResolvedValue(null);
    mockIdentityRepo.findByEmail.mockResolvedValue(null);
    mockSessionStore.findUserByUid.mockResolvedValue({
      id: 'firebase-user-1',
      email: 'firebase@example.com',
      accountType: 'investor',
      role: 'investor',
    });

    const result = await auth.createSession(res as never, {
      accessToken: FIREBASE_TOKEN,
      accountType: 'admin',
    });

    expect(result).toEqual({ ok: true, uid: 'firebase-user-1' });
    expect(deps.firebase.verifyIdToken).toHaveBeenCalledWith(FIREBASE_TOKEN);
    expect(mockIdentityRepo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        accountType: 'investor',
      }),
    );
  });

  it('returns 401 for invalid Firebase token when flag is on', async () => {
    process.env.USE_FIREBASE_AUTH = 'true';
    const deps = makeFirebaseIdentityDeps();
    deps.firebase.verifyIdToken.mockRejectedValue(new Error('Firebase ID token has expired'));
    const auth = new AuthService(deps as never);
    const res = { cookie: jest.fn() };

    const result = await auth.createSession(res as never, {
      accessToken: FIREBASE_TOKEN,
    });

    expect(result).toMatchObject({ status: 401 });
  });

  it('resolveUserFromRequest returns null for missing session', async () => {
    const deps = makeFirebaseIdentityDeps();
    const auth = new AuthService(deps as never);
    const user = await auth.resolveUserFromRequest({ headers: {}, cookies: {} } as never);
    expect(user).toBeNull();
  });

  it('CSRF rejects cross-site session mutation', () => {
    const request = new Request('https://paperworking.co/api/auth/session', {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site' },
    });
    const csrf = validateCsrf(request);
    expect(csrf.ok).toBe(false);
  });
});

describe('Firebase identity + AuthorizationService RBAC', () => {
  function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
    return {
      findOrganizationsOwnedBy: async () => [],
      findActiveOrgMemberships: async () => [],
      findProjectById: async () => null,
      findActiveProjectMember: async () => null,
      findDealById: async () => null,
      findActiveProjectMemberByUserId: async () => null,
      findActiveOrgMember: async () => null,
      findOrganizationOwnedBy: async () => null,
      findActiveOrgMemberInOrgs: async () => null,
      findOrganizationOwnedByUserInOrgs: async () => null,
      findMessageInThreadForUser: async () => null,
      findAnyMessageInThread: async () => null,
      ...overrides,
    };
  }

  it('denies org access for unauthorized Firebase-provisioned user', async () => {
    const authz = new AuthorizationService(makeStore());
    const user = {
      uid: 'firebase-user-1',
      email: 'firebase@example.com',
      accountType: 'investor',
      isAdmin: false,
    };
    await expect(authz.assertOrgAccess(user, 'org-other')).rejects.toMatchObject({
      name: 'AuthzForbiddenError',
    });
  });

  it('allows project owner access regardless of IdP', async () => {
    const authz = new AuthorizationService(
      makeStore({
        findProjectById: async () => ({
          id: 'p1',
          userId: 'firebase-user-1',
          investorId: null,
          organizationId: null,
        }),
      }),
    );
    const user = {
      uid: 'firebase-user-1',
      email: 'firebase@example.com',
      accountType: 'investor',
      isAdmin: false,
    };
    const project = await authz.assertProjectAccess(user, 'p1');
    expect(project.id).toBe('p1');
  });
});
