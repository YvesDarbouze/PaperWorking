import { NextRequest } from 'next/server';
import { GET } from '@/app/api/invitations/[token]/route';
import { POST } from '@/app/api/invitations/[token]/subscription/route';
import { syncFractionalInvestorFromCommitment, removeFractionalInvestorForCommitment } from '@/lib/firebase/syncFractionalInvestors';

const mockVerifyIdToken = jest.fn();
const mockProjectDocGet = jest.fn();
const mockProjectDocUpdate = jest.fn();
const mockUserDocGet = jest.fn();
const mockInvitationDocGet = jest.fn();
const mockInvitationDocUpdate = jest.fn();
const mockInvitationQueryGet = jest.fn();
const mockCommitmentQueryGet = jest.fn();
const mockCommitmentDocGet = jest.fn();
const mockCommitmentDocUpdate = jest.fn();

jest.mock('@/lib/reporting/propertyMetricHistory', () => ({
  fetchPropertyMetricHistory: jest.fn().mockResolvedValue({
    noiHistory: [],
    capRateHistory: [],
    cashFlowHistory: [],
    burnRateHistory: [],
  }),
  computeRaiseProgress: jest.fn().mockResolvedValue({
    raiseRaised: 250000,
    raisePercentage: 25,
  }),
  computeRaiseCountdown: jest.fn().mockReturnValue({
    daysLeft: 10,
    hoursLeft: 12,
  }),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (colName: string) => {
      if (colName === 'invitations') {
        return {
          where: () => ({
            limit: () => ({
              get: (...args: any[]) => mockInvitationQueryGet(...args),
            }),
          }),
        };
      }
      if (colName === 'projects') {
        return {
          doc: (pId: string) => ({
            get: (...args: any[]) => mockProjectDocGet(...args),
            update: (...args: any[]) => mockProjectDocUpdate(...args),
            collection: (subCol: string) => {
              if (subCol === 'commitments') {
                return {
                  where: () => ({
                    limit: () => ({
                      get: (...args: any[]) => mockCommitmentQueryGet(...args),
                    }),
                  }),
                };
              }
              return {};
            },
          }),
        };
      }
      return {};
    },
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date('2026-01-01T00:00:00.000Z'),
    arrayUnion: (item: any) => item,
  },
}));

describe('Subscriptions & Capital Raise Pipeline API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/invitations/[token]', () => {
    it('returns invitation details with commitmentStatus and template', async () => {
      mockInvitationQueryGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              projectId: 'proj_123',
              email: 'test@example.com',
              name: 'John Doe',
              proposedAmount: 50000,
              proposedEquityPercent: 5,
              expiresAt: new Date(Date.now() + 86400000),
              status: 'accepted',
            }),
          },
        ],
      });

      mockProjectDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'proj_123',
          propertyName: 'Oakwood Apartments',
          financials: {
            capitalRaiseTarget: 1000000,
            subscriptionAgreementTemplate: {
              name: 'Sub_Agreement_v1.pdf',
              url: 'https://example.com/sub.pdf',
              uploadedAt: '2026-01-19T00:00:00Z',
            },
          },
          createdAt: new Date(),
        }),
      });

      mockCommitmentQueryGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'commit_999',
            data: () => ({
              status: 'docs-out',
            }),
          },
        ],
      });

      const response = await GET(
        new NextRequest('https://example.com/api/invitations/token_abc_123456789'),
        { params: Promise.resolve({ token: 'token_abc_123456789' }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.commitmentStatus).toBe('docs-out');
      expect(data.commitmentId).toBe('commit_999');
      expect(data.subscriptionAgreementTemplate.name).toBe('Sub_Agreement_v1.pdf');
    });
  });

  describe('POST /api/invitations/[token]/subscription', () => {
    it('updates commitment status to signed, records log, and returns success', async () => {
      mockInvitationQueryGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            ref: {
              update: jest.fn().mockResolvedValue({}),
            },
            data: () => ({
              projectId: 'proj_123',
              email: 'test@example.com',
              expiresAt: new Date(Date.now() + 86400000),
            }),
          },
        ],
      });

      const mockUpdate = jest.fn().mockResolvedValue({});
      mockCommitmentQueryGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'commit_999',
            ref: {
              update: mockUpdate,
            },
            data: () => ({
              name: 'John Doe',
              email: 'test@example.com',
              amountCents: 5000000,
              status: 'docs-out',
              transitions: [],
            }),
          },
        ],
      });

      mockProjectDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'proj_123',
          fractionalInvestors: [],
          contributions: [],
        }),
      });

      const request = new NextRequest('https://example.com/api/invitations/token_abc_123456789/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'esign' }),
      });

      const response = await POST(request, { params: Promise.resolve({ token: 'token_abc_123456789' }) });
      expect(response.status).toBe(200);
      const resData = await response.json();
      expect(resData.success).toBe(true);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'signed',
        })
      );
      expect(mockProjectDocUpdate).toHaveBeenCalled();
    });
  });

  describe('syncFractionalInvestors contributions list sync', () => {
    it('syncFractionalInvestorFromCommitment synchronizes both fractionalInvestors and contributions arrays', async () => {
      const mockUpdateProj = jest.fn().mockResolvedValue({});
      mockProjectDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          id: 'proj_123',
          fractionalInvestors: [],
          contributions: [],
        }),
      });
      mockProjectDocGet.mockImplementation(() => ({
        exists: true,
        data: () => ({
          id: 'proj_123',
        }),
      }));

      const mockDoc = {
        update: mockUpdateProj,
        get: mockProjectDocGet,
      };
      
      const adminDbMock = require('@/lib/firebase/admin').adminDb;
      jest.spyOn(adminDbMock, 'collection').mockReturnValue({
        doc: () => mockDoc,
      });

      await syncFractionalInvestorFromCommitment('proj_123', {
        id: 'commit_999',
        name: 'John Doe',
        email: 'test@example.com',
        amountCents: 5000000,
        status: 'signed',
        partyType: 'Investor',
      });

      expect(mockUpdateProj).toHaveBeenCalledWith(
        expect.objectContaining({
          fractionalInvestors: expect.arrayContaining([
            expect.objectContaining({
              id: 'commit_999',
              name: 'John Doe',
              status: 'pending_subscription',
            }),
          ]),
          contributions: expect.arrayContaining([
            expect.objectContaining({
              id: 'commit_999',
              partyName: 'John Doe',
              status: 'signed',
            }),
          ]),
        })
      );
    });
  });
});
