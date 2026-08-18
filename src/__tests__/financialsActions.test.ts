/** @jest-environment node */
import { saveFinancials, loadFinancials, FinancialsPayload } from '../actions/financials';

// Mocks
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockFieldValueServerTimestamp = jest.fn(() => 'mock-timestamp');

const mockDoc = {
  get: mockGet,
  set: mockSet,
  collection: jest.fn().mockImplementation(() => mockCollection),
};

var mockCollection = {
  doc: jest.fn().mockImplementation(() => mockDoc),
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

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => mockFieldValueServerTimestamp(),
  },
}));

describe('Financials Server Actions', () => {
  const projectId = 'proj-999';
  const idToken = 'valid-token-xyz';
  const uid = 'user-owner-123';
  const organizationId = 'org-456';

  const samplePayload: FinancialsPayload = {
    income: {
      grossRent: 2500,
      otherIncome: 100,
      vacancyRate: 5,
    },
    expenses: {
      opex: 1200,
    },
    financing: {
      loanAmount: 180000,
      interestRate: 6.5,
      loanTermYears: 30,
      otherMonthlyDebt: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockReset();
    mockGet.mockReset();
    mockSet.mockReset();
    mockFieldValueServerTimestamp.mockClear();

    // Default verifyAuth mock setup
    mockVerifyIdToken.mockResolvedValue({ uid });
    // Default user document in users collection
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({ organizationId }),
    });
  });

  describe('Authentication and authorization gates', () => {
    it('throws Unauthorized if idToken verification fails', async () => {
      mockVerifyIdToken.mockReset();
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
      
      // We must reset the mockGet so it doesn't return user data since verifyIdToken will fail
      mockGet.mockReset();

      await expect(saveFinancials('', projectId, samplePayload)).rejects.toThrow('Unauthorized');
    });

    it('throws error if user profile document does not exist', async () => {
      mockVerifyIdToken.mockResolvedValue({ uid });
      mockGet.mockReset();
      // userSnap.exists = false
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      await expect(saveFinancials(idToken, projectId, samplePayload)).rejects.toThrow('Unauthorized');
    });

    it('throws error if project does not exist', async () => {
      // 1. user profile get (already resolved in beforeEach)
      // 2. projectRef.get() -> exists: false
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      await expect(saveFinancials(idToken, projectId, samplePayload)).rejects.toThrow('Project not found.');
    });

    it('throws access error if user is not project owner, org member, or team member', async () => {
      // 1. user profile get (already resolved in beforeEach)
      // 2. projectRef.get() -> unauthorized project data
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ownerUid: 'some-other-owner',
          organizationId: 'some-other-org',
          members: {},
          assignedUsers: [],
        }),
      });

      await expect(saveFinancials(idToken, projectId, samplePayload)).rejects.toThrow('You do not have access to this project.');
    });

    it('allows access if user is the owner', async () => {
      // 2. projectRef.get() -> owner match
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ownerUid: uid,
        }),
      });
      mockSet.mockResolvedValueOnce(undefined);

      const result = await saveFinancials(idToken, projectId, samplePayload);
      expect(result.success).toBe(true);
    });

    it('allows access if user organization matches', async () => {
      // 2. projectRef.get() -> org match
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ownerUid: 'other-owner',
          organizationId,
        }),
      });
      mockSet.mockResolvedValueOnce(undefined);

      const result = await saveFinancials(idToken, projectId, samplePayload);
      expect(result.success).toBe(true);
    });

    it('allows access if user is in members list', async () => {
      // 2. projectRef.get() -> members list match
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          ownerUid: 'other-owner',
          organizationId: 'other-org',
          members: {
            [uid]: { role: 'Deal Lead' },
          },
        }),
      });
      mockSet.mockResolvedValueOnce(undefined);

      const result = await saveFinancials(idToken, projectId, samplePayload);
      expect(result.success).toBe(true);
    });
  });

  describe('saveFinancials functionality', () => {
    it('throws error if payload shape is invalid', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerUid: uid }),
      });

      const invalidPayload = {} as any;
      await expect(saveFinancials(idToken, projectId, invalidPayload)).rejects.toThrow('Invalid financials payload');
    });

    it('sanitizes inputs and writes correct data to Firestore', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerUid: uid }),
      });

      const messyPayload = {
        income: { grossRent: '2500.50', otherIncome: null, vacancyRate: undefined },
        expenses: { opex: 'abc' },
        financing: { loanAmount: 100000, interestRate: '5.5%', loanTermYears: '', otherMonthlyDebt: 100 },
      } as any;

      mockSet.mockResolvedValueOnce(undefined);

      await saveFinancials(idToken, projectId, messyPayload);

      expect(mockSet).toHaveBeenCalledWith({
        income: {
          grossRent: 2500.50,
          otherIncome: 0,
          vacancyRate: 0,
        },
        expenses: {
          opex: 0,
        },
        financing: {
          loanAmount: 100000,
          interestRate: 0, // NaN falls back to 0
          loanTermYears: 0,
          otherMonthlyDebt: 100,
        },
        updatedAt: 'mock-timestamp',
        updatedBy: uid,
      }, { merge: true });
    });
  });

  describe('loadFinancials functionality', () => {
    it('returns null if the financials document does not exist', async () => {
      // 1. Project access check
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerUid: uid }),
      });

      // 2. financials/current get() -> exists: false
      mockGet.mockResolvedValueOnce({
        exists: false,
      });

      const result = await loadFinancials(idToken, projectId);
      expect(result).toBeNull();
    });

    it('returns parsed financials data when document exists', async () => {
      // 1. Project access check
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({ ownerUid: uid }),
      });

      // 2. financials/current get() -> exists: true
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          income: { grossRent: 2000, otherIncome: 50, vacancyRate: 3 },
          expenses: { opex: 800 },
          financing: { loanAmount: 150000, interestRate: 6.0, loanTermYears: 30, otherMonthlyDebt: 50 },
        }),
      });

      const result = await loadFinancials(idToken, projectId);
      expect(result).toEqual({
        income: { grossRent: 2000, otherIncome: 50, vacancyRate: 3 },
        expenses: { opex: 800 },
        financing: { loanAmount: 150000, interestRate: 6.0, loanTermYears: 30, otherMonthlyDebt: 50 },
      });
    });
  });
});
