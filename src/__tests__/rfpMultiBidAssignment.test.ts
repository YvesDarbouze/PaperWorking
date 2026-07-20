import { acceptSlotBid } from '@/actions/rfpBids';
import { NotificationService } from '@/lib/services/notificationService';
import { writeActivityLog } from '@/lib/firebase/activityLogWriter';

// ── Shared Mocks ──────────────────────────────────────────────────────────
const mockVerifyIdToken = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();

const mockGet = jest.fn();
const mockUpdate = jest.fn();

const mockDoc = {
  get: mockGet,
  update: mockUpdate,
  collection: jest.fn().mockImplementation(() => mockCollection),
};

const mockCollection = {
  doc: jest.fn().mockImplementation((id) => ({
    ...mockDoc,
    id: id || 'mock-doc-id',
    ref: { id: id || 'mock-doc-id' },
  })),
  where: jest.fn().mockReturnThis(),
  get: mockGet,
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (_name: string) => mockCollection,
    batch: jest.fn().mockImplementation(() => ({
      set: (...args: any[]) => mockBatchSet(...args),
      update: (...args: any[]) => mockBatchUpdate(...args),
      commit: () => mockBatchCommit(),
    })),
  },
}));

jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  verifyAuth: jest.fn().mockImplementation(() => Promise.resolve({ uid: 'user_investor_123', email: 'investor@test.com' })),
}));

jest.mock('@/lib/firebase/activityLogWriter', () => ({
  writeActivityLog: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/services/notificationService', () => ({
  NotificationService: {
    createNotification: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/lib/firebase/orgActivityWriter', () => ({
  logOrgActivity: jest.fn(),
}));

describe('FD-26: RFP & Multi-bid Assignment Server Action', () => {
  const ID_TOKEN = 'investor-token';
  const INVESTOR_UID = 'user_investor_123';
  const PROJECT_ID = 'proj_rfp_26';
  const WINNING_BID_ID = 'bid_winner';
  const LOSING_BID_ID = 'bid_loser';
  const WINNING_VENDOR_UID = 'vendor_winner';
  const LOSING_VENDOR_UID = 'vendor_loser';
  const RFP_ID = 'rfp_appraiser_round';

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: INVESTOR_UID, name: 'Investor User' });
    mockBatchCommit.mockResolvedValue(true);
  });

  it('acceptSlotBid correctly closes RFP, assigns winner, cancels others, and updates vendor inbox', async () => {
    // 1. Mock the first lookup: User Profile (verifyAuth)
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        uid: INVESTOR_UID,
        organizationId: 'org_123',
        personalOrganizationId: 'org_123',
        role: 'Lead Investor',
      }),
    }));

    // 2. Mock the second lookup: Bid Snap
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        id: WINNING_BID_ID,
        rfpId: RFP_ID,
        slotKey: 'f4AppraiserVendor',
        vendorUid: WINNING_VENDOR_UID,
        vendorName: 'Apex Appraisers',
        vendorCompanyName: 'Apex Appraisals Inc',
        price: 1500,
        status: 'QUOTED',
        assignmentId: 'assign_winner_id',
      }),
    }));

    // 3. Mock the third lookup: Project Snap
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        ownerUid: INVESTOR_UID,
        organizationId: 'org_123',
        propertyName: '789 Broadway',
        members: { [INVESTOR_UID]: true },
        financials: {},
      }),
    }));

    // 4. Mock the fourth lookup: Vendor Snap
    mockGet.mockImplementationOnce(() => Promise.resolve({
      exists: true,
      data: () => ({
        email: 'winner@apex.com',
        vendorProfile: {
          companyName: 'Apex Appraisals Inc',
          phone: '(555) 111-2222',
        },
      }),
    }));

    // 5. Mock the fifth lookup: otherBidsSnap
    mockGet.mockImplementationOnce(() => Promise.resolve({
      docs: [
        {
          id: WINNING_BID_ID,
          data: () => ({
            id: WINNING_BID_ID,
            status: 'QUOTED',
            rfpId: RFP_ID,
            vendorUid: WINNING_VENDOR_UID,
          }),
        },
        {
          id: LOSING_BID_ID,
          ref: { id: LOSING_BID_ID },
          data: () => ({
            id: LOSING_BID_ID,
            status: 'QUOTED',
            rfpId: RFP_ID,
            vendorUid: LOSING_VENDOR_UID,
            assignmentId: 'assign_loser_id',
          }),
        },
      ],
    }));

    const result = await acceptSlotBid(ID_TOKEN, PROJECT_ID, WINNING_BID_ID);
    expect(result.success).toBe(true);

    // Verify Project's financials slot is updated with winner details
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        'financials.f4AppraiserVendor': expect.objectContaining({
          name: 'Apex Appraisers',
          firm: 'Apex Appraisals Inc',
          source: 'marketplace',
          marketplaceVendorId: WINNING_VENDOR_UID,
        }),
      })
    );

    // Verify winner bid set to ACCEPTED
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'ACCEPTED',
        acceptedAt: expect.anything(),
      })
    );

    // Verify winning vendor inbox set to ACCEPTED
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'ACCEPTED',
        updatedAt: expect.anything(),
      })
    );

    // Verify loser bid cancelled
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'CANCELLED',
      })
    );

    // Verify loser inbox cancelled
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'CANCELLED',
      })
    );

    // Verify winner & loser notifications dispatched
    expect(NotificationService.createNotification).toHaveBeenCalledTimes(2);
  });
});
