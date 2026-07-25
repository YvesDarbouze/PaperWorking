/** @jest-environment node */
import { executeInboxAction } from '../lib/services/inboxActionExecutor';
import { updateAssignmentStatus } from '../actions/vendorAssignment';
import { POST as respondPost } from '../app/api/invitations/respond/route';
import { NextRequest } from 'next/server';

// Mock variables (must start with mock)
var mockVerifyIdToken = jest.fn((...args: any[]) => Promise.resolve({ uid: 'user-123', email: 'user@example.com' }));
var mockGet = jest.fn();
var mockSet = jest.fn();
var mockUpdate = jest.fn();
var mockAdd = jest.fn();
var mockCommit = jest.fn();
var mockBatchUpdate = jest.fn();
var mockRunTransaction = jest.fn();

var mockQuery: any = {
  doc: jest.fn().mockImplementation(() => mockDoc),
  where: jest.fn().mockImplementation(() => mockQuery),
  limit: jest.fn().mockImplementation(() => mockQuery),
  get: (...args: any[]) => mockGet(...args),
  add: (...args: any[]) => mockAdd(...args),
};

var mockDoc: any = {
  set: (...args: any[]) => mockSet(...args),
  update: (...args: any[]) => mockUpdate(...args),
  get: (...args: any[]) => mockGet(...args),
  collection: jest.fn().mockImplementation(() => mockQuery),
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (idToken: string, checkRevoked?: boolean) => mockVerifyIdToken(idToken, checkRevoked),
  },
  adminDb: {
    collection: (collectionPath: string) => mockQuery,
    collectionGroup: (collectionId: string) => mockQuery,
    batch: jest.fn().mockImplementation(() => ({
      update: (documentRef: any, data: any) => mockBatchUpdate(documentRef, data),
      set: jest.fn(),
      commit: () => mockCommit(),
    })),
    runTransaction: (updateFunction: any) => mockRunTransaction(updateFunction),
  },
}));

// Mock Firebase Auth Guard
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  __esModule: true,
  requireAuth: jest.fn(() => Promise.resolve({ uid: 'user-123', email: 'user@example.com' })),
  isAuthError: jest.fn(() => false),
}));

// Mock Resend Email SDK
jest.mock('resend', () => ({
  __esModule: true,
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(() => Promise.resolve({ success: true })),
    },
  })),
}));

// Mock client-side firestore
var mockClientGetDocs = jest.fn();
var mockClientGetDoc = jest.fn();
var mockClientUpdateDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  __esModule: true,
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: (query: any) => mockClientGetDocs(query),
  doc: jest.fn(),
  updateDoc: (reference: any, data: any) => mockClientUpdateDoc(reference, data),
  getDoc: (reference: any) => mockClientGetDoc(reference),
}));

jest.mock('@/lib/firebase/config', () => ({
  __esModule: true,
  db: {},
}));

// Mock client services
jest.mock('@/lib/firebase/projects', () => ({
  __esModule: true,
  projectsService: {
    updateProject: jest.fn(() => Promise.resolve()),
  },
}));

// Mock team actions
var mockAcceptTeamInvitation = jest.fn();
jest.mock('@/actions/team', () => ({
  __esModule: true,
  acceptTeamInvitation: (token: string) => mockAcceptTeamInvitation(token),
}));

// Mock other actions
var mockApproveLedgerItem = jest.fn();
jest.mock('@/actions/index', () => ({
  __esModule: true,
  approveLedgerItem: (idToken: string, projectId: string, itemId: string) => mockApproveLedgerItem(idToken, projectId, itemId),
}));

describe('Inbox Action Execution Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockAdd.mockReset();
    mockCommit.mockReset();
    mockBatchUpdate.mockReset();
    mockRunTransaction.mockReset();
    mockClientGetDocs.mockReset();
    mockClientGetDoc.mockReset();
    mockClientUpdateDoc.mockReset();
    mockAcceptTeamInvitation.mockReset();
    mockApproveLedgerItem.mockReset();

    // Default verify token mock
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123', email: 'user@example.com' });

    // Set a default mock resolver that works for both doc and collection queries
    mockGet.mockResolvedValue({
      exists: true,
      empty: false,
      docs: [],
      data: () => ({
        role: 'Lead Investor',
        organizationId: 'org-123',
        personalOrganizationId: 'org-123',
        displayName: 'Investor User',
        email: 'user@example.com',
        status: 'PENDING',
        vendorId: 'vendor-123',
        requestedBy: 'user-123',
        vendorCompanyName: 'ABC Inspections',
        serviceType: 'Inspector',
        propertyName: 'Mock Property',
        invitedByUid: 'user-123',
        proposedAmount: 5000,
        expiresAt: { toDate: () => new Date(Date.now() + 100000) },
      }),
    });
  });

  describe('1. VENDOR_BID action', () => {
    it('correctly transitions vendor bid to ACCEPTED when executed', async () => {
      // Mock commit for the batch update
      mockCommit.mockResolvedValueOnce(undefined);

      const notificationItem = {
        type: 'VENDOR_BID',
        objectReference: {
          projectId: 'project-123',
          assignmentId: 'assign-456',
          amount: '$500',
        },
        actor: { name: 'ABC Inspections' },
        deepLinkUrl: '/dashboard/projects/project-123/vendors',
      };

      const result = await executeInboxAction(notificationItem, 'mock-token', 'user@example.com');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Vendor assignment approved successfully.');

      // Check that it updated the status in assignment and request
      expect(mockBatchUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ status: 'ACCEPTED' })
      );
    });

    it('is idempotent and allows ACCEPTED to transition to ACCEPTED', async () => {
      // Override assignment fetch mock to return status ACCEPTED
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          role: 'Lead Investor',
          organizationId: 'org-123',
          personalOrganizationId: 'org-123',
          displayName: 'Investor User',
          email: 'user@example.com',
        }),
      });

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'ACCEPTED',
          vendorId: 'vendor-123',
          requestedBy: 'user-123',
          vendorCompanyName: 'ABC Inspections',
          serviceType: 'Inspector',
        }),
      });

      const res = await updateAssignmentStatus('mock-token', 'project-123', 'assign-456', 'ACCEPTED');
      expect(res.success).toBe(true);
    });
  });

  describe('2. RECEIPT_APPROVAL action', () => {
    it('approves ledger item sub-collection if ledgerItemId is present', async () => {
      mockApproveLedgerItem.mockResolvedValueOnce({ success: true });

      const notificationItem = {
        type: 'RECEIPT_APPROVAL',
        objectReference: {
          projectId: 'project-123',
          ledgerItemId: 'item-789',
        },
      };

      const result = await executeInboxAction(notificationItem, 'mock-token', 'user@example.com');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Ledger item approved successfully.');
      expect(mockApproveLedgerItem).toHaveBeenCalledWith('mock-token', 'project-123', 'item-789');
    });

    it('falls back to legacy costs array and is idempotent if already approved', async () => {
      // Mock getDocs query to return empty ledger items
      mockClientGetDocs.mockResolvedValueOnce({ docs: [] });

      // Mock getDoc for fallback cost query
      mockClientGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          financials: {
            costs: [
              { amount: 120, approved: true, status: 'Approved' }
            ]
          }
        }),
      });

      const notificationItem = {
        type: 'RECEIPT_APPROVAL',
        objectReference: {
          projectId: 'project-123',
          amount: '$120.00',
        },
      };

      const result = await executeInboxAction(notificationItem, 'mock-token', 'user@example.com');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Receipt cost entry already approved.');
    });
  });

  describe('3. INVEST_INVITE action', () => {
    it('accepts crowdfunding invitation and creates the commitment in firestore', async () => {
      // Mock invitations collection query
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            ref: { update: mockUpdate },
            id: 'invite-abc',
            data: () => ({
              status: 'pending',
              projectId: 'project-123',
              name: 'John Doe',
              email: 'john@example.com',
              proposedAmount: 5000,
              proposedEquityPercent: 10,
              expiresAt: { toDate: () => new Date(Date.now() + 100000) },
              invitedByUid: 'user-123',
            }),
          },
        ],
      });

      // Mock commitments subcollection query (empty commitments, not locked)
      mockGet.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      // Mock project owner query and Resend send email
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ propertyName: 'Mock Property' }),
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ email: 'owner@example.com' }),
      });

      const request = new NextRequest('http://localhost/api/invitations/respond', {
        method: 'POST',
        body: JSON.stringify({
          token: 'mock-invitation-token-123',
          action: 'accept',
          signatureDataUrl: 'mock-signature',
        }),
      });

      const response = await respondPost(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.success).toBe(true);

      // Verify that the invitation was updated to accepted
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'accepted' }));

      // Verify that the commitment doc was set
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        projectId: 'project-123',
        name: 'John Doe',
        amountCents: 500000,
        status: 'pledged',
      }));
    });
  });

  describe('4. TEAM_INVITE action', () => {
    it('accepts team invitation inline by calling acceptTeamInvitation', async () => {
      const notificationItem = {
        type: 'TEAM_INVITE',
        deepLinkUrl: '/invite/team?token=team-token-abc',
        objectReference: {
          projectId: 'project-123',
        },
      };

      const result = await executeInboxAction(notificationItem, 'mock-token', 'user@example.com');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Team invitation accepted successfully.');
      expect(mockAcceptTeamInvitation).toHaveBeenCalledWith('team-token-abc');
    });
  });
});
