/** @jest-environment node */
import {
  assignVendorToProject,
  getProjectVendorAssignments,
  getVendorInboxRequests,
  updateAssignmentStatus,
} from '../actions/vendorAssignment';
import { isSubscriptionActive } from '@/lib/stripe/subscription';
import { NotificationService } from '@/lib/services/notificationService';

// Mocks
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn();
var mockUpdate = jest.fn();
var mockCommit = jest.fn();
var mockBatchUpdate = jest.fn();
var mockBatchSet = jest.fn();
var mockFieldValueServerTimestamp = jest.fn(() => 'mock-timestamp');

var mockDoc = {
  get: mockGet,
  collection: jest.fn().mockImplementation(() => mockCollection),
  set: mockSet,
  update: mockUpdate,
};

var mockCollection = {
  doc: jest.fn().mockImplementation((id) => {
    return { ...mockDoc, id: id || 'gen-assignment-id' };
  }),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  get: mockGet,
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (name: string) => mockCollection,
    batch: jest.fn().mockImplementation(() => ({
      set: (...args: any[]) => mockBatchSet(...args),
      update: (...args: any[]) => mockBatchUpdate(...args),
      commit: () => mockCommit(),
    })),
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => mockFieldValueServerTimestamp(),
  },
}));

jest.mock('@/lib/stripe/subscription', () => ({
  __esModule: true,
  isSubscriptionActive: jest.fn(() => true),
}));

jest.mock('@/lib/services/notificationService', () => ({
  __esModule: true,
  NotificationService: {
    createNotification: jest.fn(() => Promise.resolve()),
  },
}));

describe('Vendor Assignment Server Actions', () => {
  const idToken = 'user-token';
  const uid = 'investor-uid';
  const orgId = 'org-123';
  const vendorUid = 'vendor-uid';
  const projectId = 'proj-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockReset();
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockFieldValueServerTimestamp.mockClear();
    mockCommit.mockReset();
    mockBatchSet.mockClear();
    mockBatchUpdate.mockClear();
    (isSubscriptionActive as jest.Mock).mockReturnValue(true);

    // Default verifyActionAuth setup
    mockVerifyIdToken.mockResolvedValue({ uid });
    // User profile document lookup in verifyActionAuth
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        uid,
        role: 'Lead Investor',
        organizationId: orgId,
        personalOrganizationId: orgId,
        displayName: 'Investor Name',
        email: 'investor@example.com',
      }),
    });
  });

  describe('assignVendorToProject', () => {
    it('returns error if user subscription is not active', async () => {
      (isSubscriptionActive as jest.Mock).mockReturnValue(false);

      const result = await assignVendorToProject(idToken, projectId, vendorUid, 'Plumbing');
      expect(result).toEqual({
        success: false,
        error: 'An active subscription is required to assign vendors.',
      });
    });

    it('returns error if project does not exist', async () => {
      // projectRef.get() -> exists: false
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await assignVendorToProject(idToken, projectId, vendorUid, 'Plumbing');
      expect(result).toEqual({ success: false, error: 'Project not found.' });
    });

    it('returns error if user has no access to project', async () => {
      // projectRef.get() -> project belongs to another org
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ organizationId: 'other-org' }),
      });

      const result = await assignVendorToProject(idToken, projectId, vendorUid, 'Plumbing');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Access denied');
    });

    it('returns error if vendor user profile does not exist', async () => {
      // 1. projectRef.get() -> exists: true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ organizationId: orgId }),
      });
      // 2. vendorRef.get() -> exists: false
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await assignVendorToProject(idToken, projectId, vendorUid, 'Plumbing');
      expect(result).toEqual({ success: false, error: 'Vendor not found.' });
    });

    it('returns error if there is already an active assignment for vendor, project and service type', async () => {
      // 1. projectRef.get() -> exists: true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ organizationId: orgId }),
      });
      // 2. vendorRef.get() -> exists: true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ displayName: 'Vendor A' }),
      });
      // 3. Duplicate check query -> empty: false (assignment already exists)
      mockGet.mockResolvedValueOnce({
        empty: false,
      });

      const result = await assignVendorToProject(idToken, projectId, vendorUid, 'Plumbing');
      expect(result.success).toBe(false);
      expect(result.error).toContain('An active assignment already exists');
    });

    it('creates assignment docs atomically and sends notification on success', async () => {
      // 1. projectRef.get() -> exists: true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          organizationId: orgId,
          propertyName: 'Oak Street project',
          address: { street: '123 Oak St' },
        }),
      });
      // 2. vendorRef.get() -> exists: true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          displayName: 'Vendor Plumbing Inc',
          vendorProfile: { companyName: 'Plumbing Experts' },
        }),
      });
      // 3. Duplicate check query -> empty: true
      mockGet.mockResolvedValueOnce({
        empty: true,
      });

      mockCommit.mockResolvedValueOnce(undefined);

      const result = await assignVendorToProject(
        idToken,
        projectId,
        vendorUid,
        'Plumbing',
        'Please repair the pipes',
        'rush',
        'Within 5 days'
      );

      expect(result.success).toBe(true);
      expect(result.assignmentId).toBeDefined();

      // batch sets for assignment, vendor inbox, and vendor portal request
      expect(mockBatchSet).toHaveBeenCalledTimes(3);
      expect(mockCommit).toHaveBeenCalledTimes(1);

      // check notification call
      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'VENDOR_LEAD',
          recipientId: vendorUid,
          actor: expect.objectContaining({ uid, name: 'Investor Name' }),
          objectReference: expect.objectContaining({
            projectId,
            task: 'Plumbing Assignment',
            dealAddress: '123 Oak St',
          }),
        })
      );
    });
  });

  describe('getProjectVendorAssignments', () => {
    it('returns list of project assignments on project access validation', async () => {
      // 1. projectRef.get() -> exists: true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ organizationId: orgId }),
      });

      // 2. Assignments query get
      const mockAssignments = [
        {
          id: 'assign-1',
          serviceType: 'Electrician',
          status: 'PENDING',
          createdAt: { toDate: () => new Date() },
        },
      ];
      mockGet.mockResolvedValueOnce({
        docs: mockAssignments.map(a => ({
          id: a.id,
          data: () => a,
        })),
      });

      const result = await getProjectVendorAssignments(idToken, projectId);
      expect(result.success).toBe(true);
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments![0].serviceType).toBe('Electrician');
    });
  });

  describe('getVendorInboxRequests', () => {
    it('returns requests from the user vendorInbox collection', async () => {
      // 1. Inbox query get
      const mockInboxRequests = [
        {
          id: 'assign-100',
          projectName: 'Oak Street',
          serviceType: 'Painting',
          createdAt: { toDate: () => new Date() },
        },
      ];
      mockGet.mockResolvedValueOnce({
        docs: mockInboxRequests.map(r => ({
          id: r.id,
          data: () => r,
        })),
      });

      const result = await getVendorInboxRequests(idToken);
      expect(result.success).toBe(true);
      expect(result.requests).toHaveLength(1);
      expect(result.requests![0].serviceType).toBe('Painting');
    });
  });

  describe('updateAssignmentStatus', () => {
    it('returns error if transition is invalid (e.g. from CANCELLED to ACCEPTED)', async () => {
      // 1. Fetch assignment doc -> status CANCELLED
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          vendorId: vendorUid,
          requestedBy: uid,
          status: 'CANCELLED',
          serviceType: 'Flooring',
        }),
      });

      const result = await updateAssignmentStatus(idToken, projectId, 'assign-1', 'ACCEPTED');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot transition from CANCELLED to ACCEPTED');
    });

    it('successfully transitions PENDING to ACCEPTED and triggers notification', async () => {
      // 1. Fetch assignment doc -> status PENDING
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          vendorId: vendorUid, // caller is not vendor here, wait, caller uid is 'investor-uid'
          requestedBy: uid,    // caller is requesting investor ('investor-uid')
          status: 'PENDING',
          serviceType: 'Roofing',
          vendorCompanyName: 'Top Roofers',
        }),
      });

      // Mock for checking vendorInbox exist check in updateAssignmentStatus
      mockGet.mockResolvedValueOnce({ exists: true }); // inboxRef get
      mockGet.mockResolvedValueOnce({ exists: true }); // requestRef get

      mockCommit.mockResolvedValueOnce(undefined);

      const result = await updateAssignmentStatus(idToken, projectId, 'assign-1', 'ACCEPTED', 4500);

      expect(result.success).toBe(true);
      expect(mockBatchUpdate).toHaveBeenCalledTimes(3); // assignment update, inbox update, and request update
      expect(mockCommit).toHaveBeenCalledTimes(1);

      expect(NotificationService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'VENDOR_BID',
          recipientId: vendorUid, // target of notification
          objectReference: expect.objectContaining({
            projectId,
            task: 'Top Roofers accepted the Roofing assignment',
          }),
        })
      );
    });
  });
});
