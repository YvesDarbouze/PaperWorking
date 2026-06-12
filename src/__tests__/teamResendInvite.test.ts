/** @jest-environment node */
import { resendTeamInvite } from '../actions/team';

var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockUpdate = jest.fn();
var mockAdd = jest.fn();
var mockSet = jest.fn();

var mockDoc = {
  get: mockGet,
  update: mockUpdate,
  set: mockSet,
};

var mockCollection = {
  doc: jest.fn(() => mockDoc),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: mockGet,
  add: mockAdd,
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (token: string) => mockVerifyIdToken(token),
  },
  adminDb: {
    collection: (name: string) => mockCollection,
  },
}));

jest.mock('next/headers', () => ({
  __esModule: true,
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'mock-session' })),
  })),
}));

// Mock NotificationService
var mockCreateNotification = jest.fn();
jest.mock('@/lib/services/notificationService', () => ({
  __esModule: true,
  NotificationService: {
    createNotification: (data: any) => mockCreateNotification(data),
  },
}));

describe('Team Invitation Resending Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockUpdate.mockReset();
    mockAdd.mockReset();
    mockSet.mockReset();
    mockVerifyIdToken.mockReset();
    mockCreateNotification.mockReset();
    mockVerifyIdToken.mockResolvedValue({ uid: 'admin-123' });
  });

  it('successfully resends invitation if outside rate limit window (queued email)', async () => {
    // 1. Caller user profile
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        role: 'Admin',
        organizationId: 'org-123',
        displayName: 'Test Admin',
        email: 'admin@example.com',
      }),
    });

    // 2. Pending invitation (created 5 minutes ago)
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'invite-123',
        ref: {
          update: mockUpdate,
        },
        data: () => ({
          id: 'invite-123',
          email: 'collaborator@example.com',
          role: 'Deal Lead',
          organizationId: 'org-123',
          organizationName: 'Test Org',
          status: 'pending',
          createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
        }),
      }],
    });

    // 3. Invitee user check (empty, not registered yet)
    mockGet.mockResolvedValueOnce({
      empty: true,
    });

    // 4. Queued email addition
    mockAdd.mockResolvedValueOnce({ id: 'queued-123' });

    await resendTeamInvite('collaborator@example.com');

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      lastSentAt: expect.any(Date),
      expiresAt: expect.any(Date),
      day3ReminderSent: false,
      day6ReminderSent: false,
    }));

    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
      recipientEmail: 'collaborator@example.com',
      type: 'TEAM_INVITE',
    }));
  });

  it('enforces 60-second rate limit between resend attempts', async () => {
    // 1. Caller user profile
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        role: 'Admin',
        organizationId: 'org-123',
        displayName: 'Test Admin',
        email: 'admin@example.com',
      }),
    });

    // 2. Pending invitation (created 30 seconds ago)
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'invite-123',
        ref: {
          update: mockUpdate,
        },
        data: () => ({
          id: 'invite-123',
          email: 'collaborator@example.com',
          role: 'Deal Lead',
          organizationId: 'org-123',
          organizationName: 'Test Org',
          status: 'pending',
          createdAt: new Date(Date.now() - 30 * 1000), // 30 seconds ago
        }),
      }],
    });

    await expect(resendTeamInvite('collaborator@example.com')).rejects.toThrow(
      'Please wait at least 60 seconds between resend attempts.'
    );

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('rejects resending by non-admin/non-lead users', async () => {
    // 1. Caller user profile (Deal Lead - lacks permissions)
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        role: 'Deal Lead',
        organizationId: 'org-123',
        displayName: 'Deal Lead User',
        email: 'deallead@example.com',
      }),
    });

    await expect(resendTeamInvite('collaborator@example.com')).rejects.toThrow(
      'Only Lead Investors and Admins may resend team invitations.'
    );
  });
});
