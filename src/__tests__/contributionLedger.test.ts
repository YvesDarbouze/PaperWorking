import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
var mockVerifyIdToken = jest.fn();
var mockProjectDocGet = jest.fn();
var mockProjectDocUpdate = jest.fn();
var mockUserDocGet = jest.fn();
var mockSubDocGet = jest.fn();
var mockSubDocSet = jest.fn();
var mockSubDocUpdate = jest.fn();
var mockSubDocDelete = jest.fn();
var mockSubCollGet = jest.fn();
var mockCollectionGroupGet = jest.fn();

// Mock Firestore ArrayUnion
var mockArrayUnion = jest.fn((...args) => args);

/* ──────────────────────────────────────────────────────────────────────────
   Firebase Admin mock
   ────────────────────────────────────────────────────────────────────────── */
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collectionGroup: (_colName: string) => ({
      where: () => ({
        limit: () => ({
          get: (...args: any[]) => mockCollectionGroupGet(...args),
        }),
      }),
    }),
    collection: (_colName: string) => {
      if (_colName === 'users') {
        return {
          doc: () => ({
            get: (...args: any[]) => mockUserDocGet(...args),
          }),
        };
      }
      // projects or other collections
      return {
        doc: (docId?: string) => ({
          get: (...args: any[]) => mockProjectDocGet(...args),
          update: (...args: any[]) => mockProjectDocUpdate(...args),
          collection: (_subCol: string) => ({
            doc: (subDocId?: string) => ({
              get: (...args: any[]) => mockSubDocGet(...args),
              set: (...args: any[]) => mockSubDocSet(...args),
              update: (...args: any[]) => mockSubDocUpdate(...args),
              delete: (...args: any[]) => mockSubDocDelete(...args),
            }),
            orderBy: () => ({
              get: (...args: any[]) => mockSubCollGet(...args),
            }),
          }),
        }),
      };
    },
  },
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: () => new Date('2026-07-19T00:00:00.000Z'),
    arrayUnion: (...args: any[]) => mockArrayUnion(...args),
  },
}));

/* ──────────────────────────────────────────────────────────────────────────
   Lazy-import routes AFTER mocks are configured
   ────────────────────────────────────────────────────────────────────────── */
import { POST } from '@/app/api/projects/[id]/commitments/route';
import { PATCH } from '@/app/api/projects/[id]/commitments/[cId]/route';
import { GET as exportGET } from '@/app/api/projects/[id]/capital-stack/export/route';

describe('Card F2.6 Contribution Ledger API & Export Tests', () => {
  const PROJECT_ID = 'proj_test_123';
  const OWNER_UID = 'user_lead_investor_seed';
  const COMMIT_ID = 'commit_xyz_789';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock project membership verification
    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        organizationId: 'org_test_777',
        fractionalInvestors: [],
        address: '123 Test St',
        financials: {
          capitalRaiseTarget: 100000,
          capitalStack: [
            { id: 'loan_1', amount: 70000, interestRate: 6.5, category: 'Conventional Financing', lenderName: 'Chase' }
          ]
        }
      }),
    });

    // Mock authenticated user
    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'owner@paperworking.co',
      name: 'Owner User',
    });
  });

  describe('POST /api/projects/[id]/commitments (With partyType)', () => {
    it('creates a contribution record with valid partyType and syncs it to the project cap table', async () => {
      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/commitments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token',
          },
          body: JSON.stringify({
            name: 'Apex Sponsor Equity',
            email: 'sponsor@apexcapital.io',
            amountCents: 3000000, // $30,000
            partyType: 'Sponsor',
            status: 'pledged'
          }),
        }
      );

      const res = await POST(req, {
        params: Promise.resolve({ id: PROJECT_ID }),
      });

      expect(res.status).toBe(201);
      
      // Verify syncFractionalInvestorFromCommitment was called (which updates the project cap table)
      expect(mockProjectDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          fractionalInvestors: expect.arrayContaining([
            expect.objectContaining({
              name: 'Apex Sponsor Equity',
              partyType: 'Sponsor',
              contributionAmount: 30000
            })
          ])
        })
      );
    });

    it('returns 422 error for invalid partyType values', async () => {
      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/commitments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token',
          },
          body: JSON.stringify({
            name: 'Apex Sponsor Equity',
            amountCents: 3000000,
            partyType: 'InvalidRole'
          }),
        }
      );

      const res = await POST(req, {
        params: Promise.resolve({ id: PROJECT_ID }),
      });

      expect(res.status).toBe(422);
    });
  });

  describe('PATCH /api/projects/[id]/commitments/[cId] (With partyType)', () => {
    it('updates partyType successfully and triggers project cap table sync', async () => {
      mockSubDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          status: 'pledged',
          name: 'Apex Sponsor Equity',
          email: 'sponsor@apexcapital.io',
          amountCents: 3000000,
          partyType: 'Sponsor'
        }),
      });

      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/commitments/${COMMIT_ID}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token',
          },
          body: JSON.stringify({
            partyType: 'Co-GP'
          }),
        }
      );

      const res = await PATCH(req, {
        params: Promise.resolve({ id: PROJECT_ID, cId: COMMIT_ID }),
      });

      expect(res.status).toBe(200);

      // Verify the sub-document was updated with the new partyType
      expect(mockSubDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          partyType: 'Co-GP'
        })
      );

      // Verify fractionalInvestors cap table is synced with new partyType
      expect(mockProjectDocUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          fractionalInvestors: expect.arrayContaining([
            expect.objectContaining({
              name: 'Apex Sponsor Equity',
              partyType: 'Co-GP'
            })
          ])
        })
      );
    });
  });

  describe('GET /api/projects/[id]/capital-stack/export', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/capital-stack/export`,
        {
          method: 'GET'
        }
      );

      const res = await exportGET(req, {
        params: Promise.resolve({ id: PROJECT_ID })
      });

      expect(res.status).toBe(401);
    });

    it('exports capital stack statement PDF successfully for verified project member', async () => {
      // Mock subcollection query for commitments
      mockSubCollGet.mockResolvedValueOnce({
        docs: [
          {
            id: COMMIT_ID,
            data: () => ({
              name: 'Apex Sponsor Equity',
              amountCents: 3000000,
              status: 'funds-confirmed',
              partyType: 'Sponsor',
              createdAt: { toDate: () => new Date() }
            })
          }
        ]
      });

      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/capital-stack/export`,
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer mock_token'
          }
        }
      );

      const res = await exportGET(req, {
        params: Promise.resolve({ id: PROJECT_ID })
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('capital-stack-statement-');
    });
  });
});
