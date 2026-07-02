/** @jest-environment node */
import {
  approveLedgerItem,
  createNewDeal,
  closeProjectAndArchiveServerAction,
  mutateProjectTeam,
} from '../actions/index';
import { isSubscriptionActive } from '@/lib/stripe/subscription';

// Mocks
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn();
var mockUpdate = jest.fn();
var mockFieldValueServerTimestamp = jest.fn(() => 'mock-timestamp');

// Transaction mock
var mockTransaction = {
  get: mockGet,
  update: mockUpdate,
  set: mockSet,
};
var mockRunTransaction = jest.fn((fn) => fn(mockTransaction));

// Mock Firestore references
var mockDocRef = {
  id: 'mock-doc-id',
  collection: jest.fn().mockImplementation(() => mockCollectionRef),
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
};

var mockCollectionRef = {
  doc: jest.fn().mockImplementation((id) => {
    return { ...mockDocRef, id: id || 'generated-id-123' };
  }),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: mockGet,
};

jest.mock('@/lib/firebase/admin', () => ({
  __esModule: true,
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (name: string) => mockCollectionRef,
    runTransaction: (fn: any) => mockRunTransaction(fn),
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

describe('Index Server Actions (Core deal and financial actions)', () => {
  const idToken = 'token-123';
  const orgId = 'org-123';
  const uid = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockReset();
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockFieldValueServerTimestamp.mockClear();
    mockRunTransaction.mockClear();
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
        subscriptionPlan: 'Individual',
      }),
    });
  });

  describe('approveLedgerItem', () => {
    it('throws error if user role does not have privileges', async () => {
      // Override role in first mock get (for verifyActionAuth)
      mockGet.mockReset();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          uid,
          role: 'Vendor',
          organizationId: orgId,
        }),
      });

      await expect(approveLedgerItem(idToken, 'p1', 'item1')).rejects.toThrow(
        'Insufficient privileges'
      );
    });

    it('returns already approved message idempotently if item status is Approved', async () => {
      // 1. Transaction get (Project doc)
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ organizationId: orgId }),
      });
      // 2. Transaction get (Ledger item doc)
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: 'Approved' }),
      });

      const result = await approveLedgerItem(idToken, 'p1', 'item1');
      expect(result).toEqual({ success: true, message: 'Already approved.' });
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('successfully approves ledger item, recalculating and mutating deal ROI', async () => {
      // 1. Transaction get (Project doc)
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          organizationId: orgId,
          financials: {
            purchasePrice: 100000,
            estimatedARV: 150000,
          },
        }),
      });
      // 2. Transaction get (Ledger item doc)
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'Pending',
          amount: 5000,
        }),
      });
      // 3. Transaction get (all Approved ledger items query get)
      mockGet.mockResolvedValueOnce({
        forEach: (cb: any) => {
          cb({ data: () => ({ amount: 15000 }) }); // existing approved items
        },
      });

      const result = await approveLedgerItem(idToken, 'p1', 'item1');

      expect(result.success).toBe(true);
      // Total approved costs = 15000 (existing) + 5000 (current) = 20000
      // Total investment = 100000 + 20000 = 120000
      // Target profit = 150000 - 120000 = 30000
      // ROI = 30000 / 120000 * 100 = 25%
      expect(result.projectedROI).toBe(25);

      expect(mockUpdate).toHaveBeenCalledTimes(2); // 1 for ledger status, 1 for parent deal ROI
    });
  });

  describe('createNewDeal', () => {
    it('throws error if subscription plan is not eligible or active', async () => {
      mockGet.mockReset();
      // Mock profile with ineligible plan
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          uid,
          role: 'Lead Investor',
          organizationId: orgId,
          subscriptionPlan: 'Vendor Network', // not Individual or Team
        }),
      });

      await expect(createNewDeal(idToken, { propertyName: '123 Main' })).rejects.toThrow(
        'Upgrade required'
      );
    });

    it('creates new deal document in Firestore with structured default schemas', async () => {
      mockSet.mockResolvedValueOnce(undefined);

      const dealData = {
        propertyName: 'Dream House',
        address: '789 Oak Ave',
        purchasePrice: 250000,
        estimatedARV: 350000,
      };

      const result = await createNewDeal(idToken, dealData);
      expect(result.success).toBe(true);
      expect(result.projectId).toBeDefined();

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          propertyName: 'Dream House',
          address: '789 Oak Ave',
          status: 'Lead',
          activePhase: 1,
          ownerUid: uid,
          organizationId: orgId,
          financials: expect.objectContaining({
            purchasePrice: 250000,
            estimatedARV: 350000,
          }),
        })
      );
    });
  });

  describe('closeProjectAndArchiveServerAction', () => {
    it('throws error if cross-tenant security check fails', async () => {
      await expect(
        closeProjectAndArchiveServerAction(idToken, 'proj-1', 'other-org-id', 'Sell')
      ).rejects.toThrow('Cross-Tenant Data Security Exception');
    });

    it('correctly aggregates outcomes and updates organization metadata on archive', async () => {
      // 1. Transaction get (Project doc)
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          organizationId: orgId,
          status: 'active',
          financials: {
            netRealizedProfit: 20000, // positive profit -> closed_won
            totalAllInCost: 80000,
          },
        }),
      });

      // 2. Transaction get (closed projects query get)
      mockGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'other-proj',
            data: () => ({
              financials: {
                netRealizedProfit: 10000,
                totalAllInCost: 60000,
              },
            }),
          },
        ],
      });

      const result = await closeProjectAndArchiveServerAction(idToken, 'proj-1', orgId, 'Sell');
      expect(result.success).toBe(true);

      // Mutates Project status
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'closed_won',
          'financials.closedOutcome': 'won',
          locked: true,
        })
      );

      // Mutates Organization aggregates
      // closedCount = 1 (other) + 1 (current) = 2
      // totalProfit = 10000 + 20000 = 30000
      // totalCost = 60000 + 80000 = 140000
      // avgROI = 30000 / 140000 * 100 = 21.428...
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          totalProjectsClosed: 2,
          totalNetRealizedProfit: 30000,
          averagePortfolioROI: expect.closeTo(21.43, 1),
        })
      );
    });
  });

  describe('mutateProjectTeam', () => {
    it('mutates deal team member assignments through transactional gates', async () => {
      // 1. Transaction get (Project doc)
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          organizationId: orgId,
          ownerUid: uid,
          projectTeam: [],
          members: {},
        }),
      });

      // 2. Query for user email (exists check)
      mockGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'invited-user-id',
            data: () => ({ email: 'newmember@example.com' }),
          },
        ],
      });

      const result = await mutateProjectTeam(idToken, 'proj-1', 'add', {
        email: 'newmember@example.com',
        projectRole: 'Real Estate Agent',
      });

      expect(result.success).toBe(true);
      expect(result.projectTeam).toHaveLength(1);
      expect(result.projectTeam[0].uid).toBe('invited-user-id');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          projectTeam: expect.any(Array),
          members: expect.any(Object),
        })
      );
    });
  });
});
