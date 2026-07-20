import { checkModalityReconciliation, confirmModalityReconciliation } from '@/actions/modality';
import { adminDb } from '@/lib/firebase/admin';

jest.mock('@/lib/firebase/admin', () => {
  const mockUpdate = jest.fn();
  const mockSet = jest.fn();
  
  const mockProjectDoc = {
    get: jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        id: 'project_test_reconcile',
        fundingPlan: {
          modality: ['conventional_loan', 'syndication_equity'],
        },
        fractionalInvestors: [
          { id: 'inv_1', name: 'LP Investor 1', contributionAmount: 50000, status: 'confirmed' },
        ],
      }),
    }),
    update: mockUpdate,
    collection: jest.fn().mockImplementation((name) => {
      if (name === 'loans') {
        return {
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: 'loan_1',
                data: () => ({
                  instrument: 'Conventional',
                  lenderName: 'Conventional Bank',
                  amountCents: 20000000,
                  status: 'Locked',
                }),
              },
            ],
          }),
          doc: jest.fn().mockReturnValue({
            update: mockUpdate,
          }),
        };
      }
      if (name === 'commitments') {
        return {
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: 'commitment_1',
                data: () => ({
                  partyName: 'LP Investor 1',
                  amountCents: 5000000,
                  status: 'signed',
                }),
              },
            ],
          }),
          doc: jest.fn().mockReturnValue({
            update: mockUpdate,
          }),
        };
      }
      return { get: jest.fn().mockResolvedValue({ docs: [] }) };
    }),
  };

  return {
    adminAuth: {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user_123' }),
    },
    adminDb: {
      collection: jest.fn().mockImplementation((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ uid: 'user_123', organizationId: 'org_123' }),
              }),
            }),
          };
        }
        if (name === 'projects') {
          return {
            doc: jest.fn().mockReturnValue(mockProjectDoc),
          };
        }
        return {};
      }),
    },
  };
});

jest.mock('@/lib/prisma', () => {
  const mockUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const mockUpsert = jest.fn().mockResolvedValue({});
  return {
    prisma: {
      reilLoanRecord: {
        updateMany: mockUpdateMany,
      },
      reilContributionEntry: {
        updateMany: mockUpdateMany,
      },
      reilFundingPlan: {
        upsert: mockUpsert,
      },
    },
  };
});

describe('Modality Reconciliation Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detects orphaned conventional loan and syndication equity elements', async () => {
    // Switch to solo_cash only (removing conventional_loan and syndication_equity)
    const result = await checkModalityReconciliation('token_123', 'project_test_reconcile', ['solo_cash']);

    expect(result.requiresReconciliation).toBe(true);
    expect(result.orphanedLoans).toHaveLength(1);
    expect(result.orphanedLoans[0].lenderName).toBe('Conventional Bank');
    expect(result.orphanedLoans[0].instrument).toBe('Conventional');

    expect(result.orphanedPartners).toHaveLength(1);
    expect(result.orphanedPartners[0].name).toBe('LP Investor 1');

    expect(result.orphanedLedgerEntries).toHaveLength(1);
    expect(result.orphanedLedgerEntries[0].partyName).toBe('LP Investor 1');
  });

  it('passes cleanly with no orphaned elements when changing to conventional mortgage + syndication LP', async () => {
    const result = await checkModalityReconciliation('token_123', 'project_test_reconcile', ['conventional_loan', 'syndication_equity']);
    expect(result.requiresReconciliation).toBe(false);
    expect(result.orphanedLoans).toHaveLength(0);
    expect(result.orphanedPartners).toHaveLength(0);
    expect(result.orphanedLedgerEntries).toHaveLength(0);
  });

  it('archives orphaned elements in Firestore and Postgres when confirmArchive is true', async () => {
    const result = await confirmModalityReconciliation('token_123', 'project_test_reconcile', ['solo_cash'], true);
    
    expect(result.success).toBe(true);

    // Verify Firestore updates
    const mockUpdate = (adminDb.collection('projects').doc('project_test_reconcile') as any).update;
    expect(mockUpdate).toHaveBeenCalled();

    // Verify Prisma updates
    const { prisma } = require('@/lib/prisma');
    expect(prisma.reilLoanRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'project_test_reconcile',
          id: { in: ['loan_1'] },
        },
        data: {
          status: 'Archived',
        },
      })
    );
    expect(prisma.reilContributionEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'project_test_reconcile',
          id: { in: ['commitment_1'] },
        },
        data: {
          status: 'Archived',
        },
      })
    );
  });
});
