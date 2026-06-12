import { POST, GET } from '@/app/api/account/data/delete/route';
import { NextRequest } from 'next/server';

// Mock variables
var mockVerifyIdToken = jest.fn();
var mockGetUser = jest.fn();
var mockDeleteUser = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn();
var mockUpdate = jest.fn();
var mockDelete = jest.fn();

// Mock Prisma
var mockAppUserUpsert = jest.fn();
var mockAppUserDelete = jest.fn();
var mockAppUserDeleteMany = jest.fn();
var mockStatusEventUpdateMany = jest.fn();
var mockFieldAssignmentUpdateMany = jest.fn();
var mockProjectCollaboratorFindMany = jest.fn();
var mockProjectCollaboratorDeleteMany = jest.fn();
var mockReilProjectDeleteMany = jest.fn();

// Mock Stripe
var mockSubscriptionList = jest.fn();
var mockSubscriptionCancel = jest.fn();

// Mock Storage
var mockGetFiles = jest.fn();
var mockFileDelete = jest.fn();

// Mock Telemetry
var mockCapture = jest.fn();

// Mock CommunicationEngine
var mockSendRawEmail = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    appUser: {
      upsert: (...args: any[]) => mockAppUserUpsert(...args),
      delete: (...args: any[]) => mockAppUserDelete(...args),
      deleteMany: (...args: any[]) => mockAppUserDeleteMany(...args),
    },
    statusEvent: {
      updateMany: (...args: any[]) => mockStatusEventUpdateMany(...args),
    },
    fieldAssignment: {
      updateMany: (...args: any[]) => mockFieldAssignmentUpdateMany(...args),
    },
    projectCollaborator: {
      findMany: (...args: any[]) => mockProjectCollaboratorFindMany(...args),
      deleteMany: (...args: any[]) => mockProjectCollaboratorDeleteMany(...args),
    },
    reilProject: {
      deleteMany: (...args: any[]) => mockReilProjectDeleteMany(...args),
    },
  },
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
    getUser: (...args: any[]) => mockGetUser(...args),
    deleteUser: (...args: any[]) => mockDeleteUser(...args),
    revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
  },
  adminDb: {
    collection: jest.fn().mockImplementation(() => ({
      get: (...args: any[]) => mockGet(...args),
      doc: jest.fn().mockImplementation(() => ({
        get: (...args: any[]) => mockGet(...args),
        set: (...args: any[]) => mockSet(...args),
        update: (...args: any[]) => mockUpdate(...args),
        delete: (...args: any[]) => mockDelete(...args),
        collection: jest.fn().mockImplementation(() => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
      where: jest.fn().mockImplementation(() => ({
        get: (...args: any[]) => mockGet(...args),
        where: jest.fn().mockImplementation(() => ({
          get: (...args: any[]) => mockGet(...args),
        })),
      })),
    })),
    FieldValue: {
      serverTimestamp: () => new Date(),
      delete: () => 'deleted_field_value',
    },
  },
  adminStorage: {
    bucket: jest.fn().mockImplementation(() => ({
      getFiles: (...args: any[]) => mockGetFiles(...args),
    })),
  },
}));

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    subscriptions: {
      list: (...args: any[]) => mockSubscriptionList(...args),
      cancel: (...args: any[]) => mockSubscriptionCancel(...args),
    },
  }));
});

jest.mock('@/lib/telemetry', () => ({
  telemetry: {
    capture: (...args: any[]) => mockCapture(...args),
  },
}));

jest.mock('@/lib/engine/CommunicationEngine', () => ({
  CommunicationEngine: {
    sendRawEmail: (...args: any[]) => mockSendRawEmail(...args),
  },
}));

describe('Resumable GDPR Account Deletion Cascade API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
  });

  it('rejects unauthenticated deletion requests with 401', async () => {
    const request = new NextRequest('http://localhost/api/account/data/delete', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('runs complete deletion cascade sequentially and handles re-entrant resumes', async () => {
    const request = new NextRequest('http://localhost/api/account/data/delete', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token',
      },
    });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_123' });

    // Job not found initially - triggers start creation
    mockGet.mockResolvedValueOnce({ exists: false }); // jobRef.get
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ stripeCustomerId: 'cus_123' }) }); // userDoc.get
    mockGet.mockResolvedValueOnce({ docs: [{ id: 'proj_123' }] }); // projects query
    mockGetUser.mockResolvedValueOnce({ email: 'user@example.com', displayName: 'John Doe' });

    // Job doc created and retrieved
    mockSet.mockResolvedValueOnce(undefined); // jobRef.set
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        userId: 'user_123',
        status: 'in_progress',
        step: 'start',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        ownedProjectIds: ['proj_123'],
        userEmail: 'user@example.com',
        userName: 'John Doe',
      }),
    }); // jobRef.get in resuming block

    // Step 1: Stripe Cancel
    mockSubscriptionList.mockResolvedValueOnce({ data: [{ id: 'sub_123', status: 'active' }] });
    mockSubscriptionCancel.mockResolvedValueOnce({});
    mockUpdate.mockResolvedValueOnce(undefined); // jobRef.update to stripe_cancelled

    // Step 2: Firestore purge
    mockDelete.mockResolvedValueOnce(undefined); // projectRef.delete
    mockGet.mockResolvedValueOnce({ docs: [] }); // propertyMetricSnapshots get
    mockGet.mockResolvedValueOnce({ docs: [] }); // projectFiles get (top-level collection)
    mockGet.mockResolvedValueOnce({ docs: [] }); // projectFolders get (top-level collection)
    mockProjectCollaboratorFindMany.mockResolvedValueOnce([{ projectId: 'proj_shared' }]);
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ actionItems: [] }) }); // pRef.get (shared project)
    mockUpdate.mockResolvedValueOnce(undefined); // pRef.update (shared project members deletion)
    mockGet.mockResolvedValueOnce({ docs: [] }); // organizations get
    mockGet.mockResolvedValueOnce({ docs: [] }); // inboxItems get (recipient)
    mockGet.mockResolvedValueOnce({ docs: [] }); // inboxItems get (sender)
    mockGet.mockResolvedValueOnce({ docs: [] }); // notifications get
    mockGet.mockResolvedValueOnce({ docs: [] }); // teamInvitations sent (chained where)
    mockDelete.mockResolvedValueOnce(undefined); // usersRef.delete
    mockUpdate.mockResolvedValueOnce(undefined); // jobRef.update to firestore_deleted

    // Step 3: Prisma purge
    mockAppUserUpsert.mockResolvedValueOnce({});
    mockStatusEventUpdateMany.mockResolvedValueOnce({ count: 1 });
    mockFieldAssignmentUpdateMany.mockResolvedValueOnce({ count: 1 });
    mockFieldAssignmentUpdateMany.mockResolvedValueOnce({ count: 1 });
    mockProjectCollaboratorDeleteMany.mockResolvedValueOnce({ count: 1 });
    mockReilProjectDeleteMany.mockResolvedValueOnce({ count: 1 });
    mockAppUserDeleteMany.mockResolvedValueOnce({});
    mockUpdate.mockResolvedValueOnce(undefined); // jobRef.update to prisma_deleted

    // Step 4: Storage purge
    mockGetFiles.mockResolvedValueOnce([[{ delete: mockFileDelete }]]); // project files list
    mockGetFiles.mockResolvedValueOnce([[{ delete: mockFileDelete }]]); // user files list
    mockFileDelete.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValueOnce(undefined); // jobRef.update to storage_deleted

    // Step 5: Auth purge & email complete
    mockDeleteUser.mockResolvedValueOnce(undefined);
    mockUpdate.mockResolvedValueOnce(undefined); // jobRef.update to completed

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.step).toBe('completed');

    expect(mockSubscriptionCancel).toHaveBeenCalledWith('sub_123');
    expect(mockAppUserDeleteMany).toHaveBeenCalledWith({ where: { id: 'user_123' } });
    expect(mockDeleteUser).toHaveBeenCalledWith('user_123');
    expect(mockSendRawEmail).toHaveBeenCalled();
  });

  it('resumes from correct step after mid-cascade failure (stripe_cancelled → prisma step skipped)', async () => {
    // Simulate a job that previously failed after Stripe but before Firestore step
    const request = new NextRequest('http://localhost/api/account/data/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_456' });

    // Job already exists in state 'stripe_cancelled' (Stripe step already done)
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        userId: 'user_456',
        status: 'failed',
        step: 'stripe_cancelled',
        stripeCustomerId: 'cus_456',
        ownedProjectIds: [],
        userEmail: 'user2@example.com',
        userName: 'Jane Doe',
        error: 'Firestore write timed out',
      }),
    }); // jobRef.get — returns existing failed job

    // Resume: status reset to in_progress
    mockUpdate.mockResolvedValueOnce(undefined);

    // Step 2: Firestore (stripe was already done — NOT called again)
    mockProjectCollaboratorFindMany.mockResolvedValueOnce([]);
    mockGet.mockResolvedValueOnce({ docs: [] }); // orgs
    mockGet.mockResolvedValueOnce({ docs: [] }); // inboxItems recipient
    mockGet.mockResolvedValueOnce({ docs: [] }); // inboxItems sender
    mockGet.mockResolvedValueOnce({ docs: [] }); // notifications
    mockGet.mockResolvedValueOnce({ docs: [] }); // teamInvitations sent (chained where)
    mockDelete.mockResolvedValueOnce(undefined); // users doc
    mockUpdate.mockResolvedValueOnce(undefined); // jobRef → firestore_deleted

    // Step 3: Prisma
    mockAppUserUpsert.mockResolvedValueOnce({});
    mockStatusEventUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockFieldAssignmentUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockFieldAssignmentUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockProjectCollaboratorDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockReilProjectDeleteMany.mockResolvedValueOnce({ count: 0 });
    mockAppUserDeleteMany.mockResolvedValueOnce({});
    mockUpdate.mockResolvedValueOnce(undefined); // jobRef → prisma_deleted

    // Step 4: Storage
    mockGetFiles.mockResolvedValueOnce([[]]); // user files (no project files — ownedProjectIds is empty)
    mockUpdate.mockResolvedValueOnce(undefined); // jobRef → storage_deleted

    // Step 5: Auth
    mockDeleteUser.mockResolvedValueOnce(undefined);
    mockUpdate.mockResolvedValueOnce(undefined); // jobRef → completed

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.step).toBe('completed');

    // Stripe cancel must NOT have been called (step was already past stripe_cancelled)
    expect(mockSubscriptionCancel).not.toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith('user_456');
  });

  it('does not delete a shared project owned by another user', async () => {
    // A user is a collaborator on proj_shared (owned by other_user, not user_789).
    // Their account deletion must remove their membership but must NOT delete the project.
    const request = new NextRequest('http://localhost/api/account/data/delete', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    });
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user_789' });

    // New job (no existing deletionJob)
    mockGet.mockResolvedValueOnce({ exists: false }); // jobRef.get
    mockGet.mockResolvedValueOnce({ exists: true, data: () => ({}) }); // userDoc
    // ownerUid query returns NO projects (user_789 owns nothing)
    mockGet.mockResolvedValueOnce({ docs: [] }); // projects where ownerUid == user_789
    mockGetUser.mockResolvedValueOnce({ email: 'user3@example.com', displayName: 'Shared Member' });

    mockSet.mockResolvedValueOnce(undefined);
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        userId: 'user_789',
        status: 'in_progress',
        step: 'start',
        stripeCustomerId: null,
        ownedProjectIds: [], // user owns NO projects
        userEmail: 'user3@example.com',
        userName: 'Shared Member',
      }),
    });

    // Step 1: Stripe (no customerId)
    mockUpdate.mockResolvedValueOnce(undefined); // → stripe_cancelled

    // Step 2: Firestore — user is a collaborator on proj_shared owned by other_user
    // ProjectCollaborator lookup finds proj_shared
    mockProjectCollaboratorFindMany.mockResolvedValueOnce([{ projectId: 'proj_shared' }]);
    // The shared project doc IS returned (exists: true) — membership should be removed
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: 'other_user', // NOT user_789
        members: { user_789: { role: 'viewer' } },
        actionItems: [],
      }),
    });
    mockUpdate.mockResolvedValueOnce(undefined); // membership removal update on proj_shared
    mockGet.mockResolvedValueOnce({ docs: [] }); // orgs
    mockGet.mockResolvedValueOnce({ docs: [] }); // inboxItems recipient
    mockGet.mockResolvedValueOnce({ docs: [] }); // inboxItems sender
    mockGet.mockResolvedValueOnce({ docs: [] }); // notifications
    mockGet.mockResolvedValueOnce({ docs: [] }); // teamInvitations sent (chained where)
    mockDelete.mockResolvedValueOnce(undefined); // users/{user_789} doc
    mockUpdate.mockResolvedValueOnce(undefined); // → firestore_deleted

    // Step 3: Prisma
    mockAppUserUpsert.mockResolvedValueOnce({});
    mockStatusEventUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockFieldAssignmentUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockFieldAssignmentUpdateMany.mockResolvedValueOnce({ count: 0 });
    mockProjectCollaboratorDeleteMany.mockResolvedValueOnce({ count: 1 });
    mockReilProjectDeleteMany.mockResolvedValueOnce({ count: 0 }); // no solely-owned Prisma projects
    mockAppUserDeleteMany.mockResolvedValueOnce({});
    mockUpdate.mockResolvedValueOnce(undefined); // → prisma_deleted

    // Step 4: Storage (no project folders to delete)
    mockGetFiles.mockResolvedValueOnce([[]]); // users/user_789/ (empty)
    mockUpdate.mockResolvedValueOnce(undefined); // → storage_deleted

    // Step 5: Auth
    mockDeleteUser.mockResolvedValueOnce(undefined);
    mockUpdate.mockResolvedValueOnce(undefined); // → completed

    const response = await POST(request);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.step).toBe('completed');

    // Verify: proj_shared's doc was updated (membership removed) but NEVER deleted
    // mockDelete was called exactly once — for the users/{uid} document
    const deleteCalls = (mockDelete as jest.Mock).mock.calls;
    // None of the delete calls should reference 'proj_shared' (membership update, not delete)
    expect(deleteCalls.every((call: any[]) => !JSON.stringify(call).includes('proj_shared'))).toBe(true);
    // Prisma reilProject.deleteMany was called with user_789 — but that user has no owned projects
    expect(mockReilProjectDeleteMany).toHaveBeenCalledWith({ where: { createdById: 'user_789' } });
  });
});
