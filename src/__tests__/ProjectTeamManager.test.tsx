/** @jest-environment node */
import { mutateProjectTeam } from '../actions';

const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockUpdate = jest.fn();
const mockSet = jest.fn();
const mockUserDocGet = jest.fn();
const mockUserQueryGet = jest.fn();

const mockTransaction = {
  get: mockGet,
  update: mockUpdate,
  set: mockSet,
};

const mockRunTransaction = jest.fn((fn) => fn(mockTransaction));

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (token: string) => mockVerifyIdToken(token),
  },
  adminDb: {
    collection: jest.fn((name) => {
      if (name === 'users') {
        return {
          doc: jest.fn(() => ({
            get: mockUserDocGet,
          })),
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: mockUserQueryGet,
            })),
          })),
        };
      }
      return {
        doc: jest.fn((id) => ({
          id,
        })),
      };
    }),
    runTransaction: (fn: any) => mockRunTransaction(fn),
  },
}));

describe('Project Team Mutation Action (mutateProjectTeam)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockUpdate.mockReset();
    mockSet.mockReset();
    mockUserDocGet.mockReset();
    mockUserQueryGet.mockReset();
    mockVerifyIdToken.mockReset();
    mockRunTransaction.mockClear();

    // Default auth verification
    mockVerifyIdToken.mockResolvedValue({ uid: 'caller-uid' });
    mockUserDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        role: 'Admin',
        organizationId: 'org-123',
      }),
    });
  });

  it('rejects unauthenticated requests', async () => {
    await expect(
      mutateProjectTeam('', 'project-123', 'add', { email: 'test@example.com', projectRole: 'Real Estate Agent' })
    ).rejects.toThrow('Missing authentication token.');

    mockVerifyIdToken.mockRejectedValue(new Error('Auth failed'));
    await expect(
      mutateProjectTeam('invalid-token', 'project-123', 'add', { email: 'test@example.com', projectRole: 'Real Estate Agent' })
    ).rejects.toThrow('Unauthorized');
  });

  it('rejects cross-tenant organization mismatch', async () => {
    // Project in org-456, but user in org-123
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        organizationId: 'org-456',
        ownerUid: 'some-other-uid',
      }),
    });

    await expect(
      mutateProjectTeam('token', 'project-123', 'add', {
        email: 'test@example.com',
        projectRole: 'Real Estate Agent',
      })
    ).rejects.toThrow('Cross-Tenant Data Security Exception');
  });

  it('rejects modifications by non-admin/non-lead-investor callers', async () => {
    // User is standard member in the project with Guest role
    mockUserDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        role: 'Accountant', // Org-level role not in allowedRoles
        organizationId: 'org-123',
      }),
    });

    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        organizationId: 'org-123',
        ownerUid: 'owner-uid',
        members: {
          'caller-uid': { role: 'Guest' },
        },
      }),
    });

    await expect(
      mutateProjectTeam('token', 'project-123', 'add', {
        email: 'test@example.com',
        projectRole: 'Real Estate Agent',
      })
    ).rejects.toThrow('Only Lead Investors and Admins may manage the deal team.');
  });

  it('allows adding a member, queries user collection to link UID, and updates members map', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        organizationId: 'org-123',
        ownerUid: 'caller-uid',
        members: {
          'caller-uid': { role: 'Lead Investor' },
        },
        projectTeam: [],
      }),
    });

    // Mock query in users collection for 'test@example.com' returning a matched user
    mockUserQueryGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'user-uid-456',
          data: () => ({ email: 'test@example.com' }),
        },
      ],
    });

    const res = await mutateProjectTeam('token', 'project-123', 'add', {
      email: 'test@example.com',
      projectRole: 'Real Estate Agent',
      displayName: 'Test Agent',
      firm: 'Agent Firm',
      phoneNumber: '123-456',
    });

    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        projectTeam: expect.arrayContaining([
          expect.objectContaining({
            email: 'test@example.com',
            displayName: 'Test Agent',
            projectRole: 'Real Estate Agent',
            uid: 'user-uid-456',
          }),
        ]),
        members: expect.objectContaining({
          'user-uid-456': expect.objectContaining({
            uid: 'user-uid-456',
            role: 'Real Estate Agent',
          }),
        }),
      })
    );
  });

  it('allows removing a member and deletes their UID from members map to revoke file access', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        organizationId: 'org-123',
        ownerUid: 'caller-uid',
        members: {
          'caller-uid': { role: 'Lead Investor' },
          'user-uid-456': { role: 'Real Estate Agent', uid: 'user-uid-456' },
        },
        projectTeam: [
          {
            id: 'team-member-1',
            email: 'test@example.com',
            projectRole: 'Real Estate Agent',
            uid: 'user-uid-456',
            status: 'invited',
          },
        ],
      }),
    });

    // Mock query in users collection for 'test@example.com' returning a matched user
    mockUserQueryGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'user-uid-456',
          data: () => ({ email: 'test@example.com' }),
        },
      ],
    });

    const res = await mutateProjectTeam('token', 'project-123', 'remove', {
      email: 'test@example.com',
      memberId: 'team-member-1',
    });

    expect(res.success).toBe(true);
    
    // Check updated members map
    const updateCall = mockUpdate.mock.calls[0][1];
    expect(updateCall.members).not.toHaveProperty('user-uid-456');
    expect(updateCall.projectTeam[0].status).toBe('removed');
  });
});
