import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
const mockVerifyIdToken = jest.fn();
const mockProjectDocGet = jest.fn();
const mockProjectDocUpdate = jest.fn();
const mockUserDocGet = jest.fn();
const mockSubDocGet = jest.fn();
const mockSubDocSet = jest.fn();
const mockSubDocUpdate = jest.fn();
const mockSubDocDelete = jest.fn();
const mockSubCollGet = jest.fn();
const mockCollectionGroupGet = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatchDelete = jest.fn();

// Mock Firestore batch
const mockBatch = jest.fn(() => ({
  delete: (...args: any[]) => mockBatchDelete(...args),
  commit: (...args: any[]) => mockBatchCommit(...args),
}));

// Mock Firestore FieldValue
const mockDelete = jest.fn(() => 'FIELD_DELETE');

/* ──────────────────────────────────────────────────────────────────────────
   Firebase Admin mock
   ────────────────────────────────────────────────────────────────────────── */
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    batch: () => mockBatch(),
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
            get: (...args: any[]) => mockSubCollGet(...args),
            orderBy: () => ({
              get: (...args: any[]) => mockSubCollGet(...args),
            }),
            doc: (subDocId?: string) => ({
              get: (...args: any[]) => mockSubDocGet(...args),
              set: (...args: any[]) => mockSubDocSet(...args),
              update: (...args: any[]) => mockSubDocUpdate(...args),
              delete: (...args: any[]) => mockSubDocDelete(...args),
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
    delete: () => mockDelete(),
  },
}));

/* ──────────────────────────────────────────────────────────────────────────
   Lazy-import routes AFTER mocks are configured
   ────────────────────────────────────────────────────────────────────────── */
import { GET, POST } from '@/app/api/projects/[id]/loans/route';

describe('Card F3.1 Financing Route API Tests', () => {
  const PROJECT_ID = 'proj_test_123';
  const OWNER_UID = 'user_lead_investor_seed';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock project membership verification
    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        organizationId: 'org_test_777',
        financials: {
          financingType: 'All Cash'
        }
      }),
    });

    // Mock authenticated user
    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'owner@paperworking.co',
      name: 'Owner User',
    });

    // Default existing subcollection returns empty array
    mockSubCollGet.mockResolvedValue({
      docs: []
    });

    mockBatchCommit.mockResolvedValue(undefined);
  });

  describe('GET /api/projects/[id]/loans', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/loans`,
        { method: 'GET' }
      );

      const res = await GET(req, {
        params: Promise.resolve({ id: PROJECT_ID })
      });

      expect(res.status).toBe(401);
    });

    it('returns loans subcollection contents for member', async () => {
      mockSubCollGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'loan_xyz',
            data: () => ({
              instrument: 'Conventional',
              lenderName: 'Chase Commercial',
              amountCents: 50000000
            })
          }
        ]
      });

      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/loans`,
        {
          method: 'GET',
          headers: { 'Authorization': 'Bearer mock_token' }
        }
      );

      const res = await GET(req, {
        params: Promise.resolve({ id: PROJECT_ID })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.loans).toHaveLength(1);
      expect(body.loans[0].instrument).toBe('Conventional');
    });
  });

  describe('POST /api/projects/[id]/loans (Route Selection)', () => {
    it('rejects invalid instruments with 422', async () => {
      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/loans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token'
          },
          body: JSON.stringify({ instrument: 'Shark Loan' })
        }
      );

      const res = await POST(req, {
        params: Promise.resolve({ id: PROJECT_ID })
      });

      expect(res.status).toBe(422);
    });

    it('creates single loan for Conventional and updates project modality', async () => {
      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/loans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token'
          },
          body: JSON.stringify({ instrument: 'Conventional' })
        }
      );

      const res = await POST(req, {
        params: Promise.resolve({ id: PROJECT_ID })
      });

      expect(res.status).toBe(201);
      
      // Verify sub-document creation
      expect(mockSubDocSet).toHaveBeenCalledTimes(1);
      expect(mockSubDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          instrument: 'Conventional',
          status: 'Application-Submitted',
          termMonths: 360
        })
      );

      // Verify project document is updated to Financed
      expect(mockProjectDocUpdate).toHaveBeenCalledWith({
        'financials.financingType': 'Financed',
        loanStatus: 'Application-Submitted',
      });
    });

    it('creates multiple loans (Bank 1st and CDC 2nd) for SBA 504 route selection', async () => {
      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/loans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token'
          },
          body: JSON.stringify({ instrument: 'SBA 504' })
        }
      );

      const res = await POST(req, {
        params: Promise.resolve({ id: PROJECT_ID })
      });

      expect(res.status).toBe(201);

      // Verify two loan subdocuments were created
      expect(mockSubDocSet).toHaveBeenCalledTimes(2);
      expect(mockSubDocSet).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          instrument: 'SBA 504',
          lenderName: 'SBA 504 First Lien Bank',
          termMonths: 120
        })
      );
      expect(mockSubDocSet).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          instrument: 'SBA 504',
          lenderName: 'CDC Debenture Second Lien',
          termMonths: 240
        })
      );

      // Verify project document is updated to Financed
      expect(mockProjectDocUpdate).toHaveBeenCalledWith({
        'financials.financingType': 'Financed',
        loanStatus: 'Application-Submitted',
      });
    });

    it('creates multiple loans for hybrid stack and updates project modality', async () => {
      // Mock project doc with fundingPlan modality present so it updates correctly
      mockProjectDocGet.mockResolvedValue({
        exists: true,
        data: () => ({
          ownerUid: OWNER_UID,
          members: { [OWNER_UID]: true },
          fundingPlan: {
            modality: ['co_buyer_equity']
          },
          financials: {
            financingType: 'All Cash'
          }
        }),
      });

      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/loans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token'
          },
          body: JSON.stringify({ instruments: ['Conventional', 'Bridge'] })
        }
      );

      const res = await POST(req, {
        params: Promise.resolve({ id: PROJECT_ID })
      });

      expect(res.status).toBe(201);
      
      // Verify sub-document creation for each instrument (Conventional + Bridge)
      expect(mockSubDocSet).toHaveBeenCalledTimes(2);
      expect(mockSubDocSet).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ instrument: 'Conventional' })
      );
      expect(mockSubDocSet).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ instrument: 'Bridge' })
      );

      // Verify project document is updated to include conventional_loan and bridge
      expect(mockProjectDocUpdate).toHaveBeenCalledWith({
        'financials.financingType': 'Financed',
        'fundingPlan.modality': ['co_buyer_equity', 'conventional_loan', 'bridge'],
        loanStatus: 'Application-Submitted',
      });
    });

    it('resets financing route to All Cash and clears subcollection when reset requested', async () => {
      // Mock existing loan records present
      mockSubCollGet.mockResolvedValueOnce({
        docs: [
          { ref: 'mock_ref_1' },
          { ref: 'mock_ref_2' }
        ]
      });

      const req = new NextRequest(
        `http://localhost/api/projects/${PROJECT_ID}/loans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock_token'
          },
          body: JSON.stringify({ reset: true })
        }
      );

      const res = await POST(req, {
        params: Promise.resolve({ id: PROJECT_ID })
      });

      expect(res.status).toBe(200);

      // Verify batch delete was triggered for existing records
      expect(mockBatchDelete).toHaveBeenCalledTimes(2);
      expect(mockBatchCommit).toHaveBeenCalled();

      // Verify project updates to All Cash and removes loanStatus
      expect(mockProjectDocUpdate).toHaveBeenCalledWith({
        'financials.financingType': 'All Cash',
        loanStatus: 'FIELD_DELETE',
      });
    });
  });
});
