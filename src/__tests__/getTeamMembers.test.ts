/** @jest-environment node */
import { getTeamMembers } from '../actions/getTeamMembers';

// Mocks
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockWhere = jest.fn().mockReturnThis();
var mockLimit = jest.fn().mockReturnThis();
var mockOrderBy = jest.fn().mockReturnThis();

// Mock Firestore document and collections
var mockDoc = {
  get: mockGet,
  collection: jest.fn().mockImplementation(() => mockSubCollection),
};

var mockSubCollection = {
  orderBy: mockOrderBy,
  limit: mockLimit,
  get: mockGet,
};

var mockCollection = {
  doc: jest.fn().mockImplementation(() => mockDoc),
  where: mockWhere,
  get: mockGet,
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (name: string) => mockCollection,
  },
}));

var mockCookieGet = jest.fn();
jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn(() => ({
    get: mockCookieGet,
  })),
}));

describe('getTeamMembers Server Action', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockVerifyIdToken.mockReset();
    mockCookieGet.mockReset();
    mockWhere.mockClear();
    mockOrderBy.mockClear();
    mockLimit.mockClear();

    process.env = {
      ...originalEnv,
      FIREBASE_PROJECT_ID: 'mock-proj',
      FIREBASE_CLIENT_EMAIL: 'mock-email@example.com',
      FIREBASE_PRIVATE_KEY: 'mock-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns empty result if credentials are not in env', async () => {
    delete process.env.FIREBASE_PROJECT_ID;
    const result = await getTeamMembers();
    expect(result.members).toHaveLength(0);
    expect(mockCookieGet).not.toHaveBeenCalled();
  });

  it('returns empty result if __session cookie is missing', async () => {
    mockCookieGet.mockReturnValue(undefined);
    const result = await getTeamMembers();
    expect(result.members).toHaveLength(0);
  });

  it('returns empty result if token verification fails', async () => {
    mockCookieGet.mockReturnValue({ value: 'invalid-session' });
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
    const result = await getTeamMembers();
    expect(result.members).toHaveLength(0);
  });

  it('returns empty result if organizationId is missing or org_placeholder', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ organizationId: 'org_placeholder' }),
    });

    const result = await getTeamMembers();
    expect(result.members).toHaveLength(0);
  });

  it('correctly fetches and maps organization team members with lastSeenAt', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });

    // 1. Caller user doc get
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ organizationId: 'org-123' }),
    });

    // 2. Org metadata doc get
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        name: 'Alpha Investments',
        accountTier: 'Team',
      }),
    });

    const now = new Date();
    const mockUsers = [
      {
        id: 'u1',
        uid: 'u1',
        email: 'u1@example.com',
        displayName: 'User One',
        role: 'Admin',
        internalRole: 'Deal Lead',
        status: 'active',
        assignedProjectIds: ['p1'],
        createdAt: { toDate: () => now },
      },
      {
        id: 'u2',
        uid: 'u2',
        email: 'u2@example.com',
        displayName: 'User Two',
        role: 'Vendor',
        internalRole: 'Contractor',
        status: 'invited',
        assignedProjectIds: [],
        createdAt: { toDate: () => now },
        invitedAt: { toDate: () => now },
      },
    ];

    // 3. Organization users query get
    mockGet.mockResolvedValueOnce({
      docs: mockUsers.map(u => ({
        id: u.id,
        data: () => u,
      })),
    });

    // 4. fetchLastSeenAt for user 1 (returns a session timestamp)
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{
        data: () => ({
          lastSeenAt: { toDate: () => now },
        }),
      }],
    });

    // 5. fetchLastSeenAt for user 2 (returns empty session)
    mockGet.mockResolvedValueOnce({
      empty: true,
      docs: [],
    });

    const result = await getTeamMembers();

    expect(mockWhere).toHaveBeenCalledWith('organizationId', '==', 'org-123');
    expect(result.orgName).toBe('Alpha Investments');
    expect(result.accountTier).toBe('Team');
    expect(result.maxSeats).toBe(10);
    expect(result.seatCount).toBe(2); // active or invited members
    expect(result.members).toHaveLength(2);

    expect(result.members[0]).toEqual(expect.objectContaining({
      uid: 'u1',
      displayName: 'User One',
      lastSeenAt: now.toISOString(),
    }));

    expect(result.members[1]).toEqual(expect.objectContaining({
      uid: 'u2',
      displayName: 'User Two',
      lastSeenAt: null,
    }));
  });

  it('defaults to Individual tier and maxSeats=1 if tier is not set and active count is 1', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });

    // 1. Caller user doc get
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ organizationId: 'org-123' }),
    });

    // 2. Org metadata doc get (missing details)
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({}),
    });

    // 3. Organization users query (only 1 user)
    mockGet.mockResolvedValueOnce({
      docs: [{
        id: 'user-123',
        data: () => ({ uid: 'user-123', status: 'active' }),
      }],
    });

    // 4. Session get
    mockGet.mockResolvedValueOnce({
      empty: true,
    });

    const result = await getTeamMembers();
    expect(result.accountTier).toBe('Individual');
    expect(result.maxSeats).toBe(1);
  });

  it('returns empty result if an error is thrown', async () => {
    mockCookieGet.mockReturnValue({ value: 'valid-session' });
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
    mockGet.mockRejectedValue(new Error('DB failure'));

    const result = await getTeamMembers();
    expect(result.members).toHaveLength(0);
  });
});
