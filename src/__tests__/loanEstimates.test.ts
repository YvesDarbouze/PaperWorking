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
const mockBatchCommit = jest.fn();
const mockBatchUpdate = jest.fn();

// Mock Firestore batch
const mockBatch = jest.fn(() => ({
  update: (...args: any[]) => mockBatchUpdate(...args),
  commit: (...args: any[]) => mockBatchCommit(...args),
}));

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
      return {
        doc: (docId?: string) => ({
          get: (...args: any[]) => mockProjectDocGet(...args),
          update: (...args: any[]) => mockProjectDocUpdate(...args),
          collection: (_subCol: string) => ({
            orderBy: () => ({
              limit: () => ({
                get: (...args: any[]) => mockSubCollGet(...args),
              }),
              get: (...args: any[]) => mockSubCollGet(...args),
            }),
            get: (...args: any[]) => mockSubCollGet(...args),
            doc: (subDocId?: string) => ({
              ref: `mock_ref_${subDocId}`,
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

/* ──────────────────────────────────────────────────────────────────────────
   Lazy-import routes
   ────────────────────────────────────────────────────────────────────────── */
import { GET as getEstimates, POST as saveEstimate } from '@/app/api/projects/[id]/loan-estimates/route';
import { POST as chooseEstimate } from '@/app/api/projects/[id]/loan-estimates/[estimateId]/choose/route';
import { DELETE as deleteEstimate } from '@/app/api/projects/[id]/loan-estimates/[estimateId]/route';

describe('Card F3.3 Loan Estimates Workflow API Tests', () => {
  const PROJECT_ID = 'proj_test_999';
  const OWNER_UID = 'user_leadInvestor_seed';

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'leadInvestor@apex.com',
    });

    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        financials: { financingType: 'Financed' }
      })
    });

    mockBatchCommit.mockResolvedValue(undefined);
  });

  describe('GET & POST /api/projects/[id]/loan-estimates', () => {
    it('returns estimate candidates list', async () => {
      mockSubCollGet.mockResolvedValueOnce({
        docs: [
          {
            id: 'est_1',
            data: () => ({
              lenderName: 'Apex Capital',
              amountCents: 30000000,
              interestRate: 6.25,
            })
          }
        ]
      });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loan-estimates`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer mock' }
      });

      const res = await getEstimates(req, { params: Promise.resolve({ id: PROJECT_ID }) });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.estimates).toHaveLength(1);
      expect(body.estimates[0].lenderName).toBe('Apex Capital');
    });

    it('saves a new estimate candidate with source-tagged file meta', async () => {
      const payload = {
        lenderName: 'NEO Bank',
        amountCents: 45000000,
        interestRate: 6.5,
        termMonths: 360,
        points: 1.0,
        estimatedCostsCents: 500000,
        fileId: 'file_le_doc',
        fileName: 'NEO_estimate.pdf',
        fileUrl: 'https://storage/NEO_estimate.pdf'
      };

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loan-estimates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock'
        },
        body: JSON.stringify(payload)
      });

      const res = await saveEstimate(req, { params: Promise.resolve({ id: PROJECT_ID }) });

      expect(res.status).toBe(201);
      expect(mockSubDocSet).toHaveBeenCalledWith(
        expect.objectContaining({
          lenderName: 'NEO Bank',
          amountCents: 45000000,
          interestRate: 6.5,
          termMonths: 360,
          fileId: 'file_le_doc',
          isChosen: false,
          sourceTags: expect.objectContaining({
            lenderName: 'document',
            amountCents: 'document',
            interestRate: 'document',
            termMonths: 'document',
            points: 'document',
            estimatedCostsCents: 'document',
          })
        })
      );
    });
  });

  describe('POST /api/projects/[id]/loan-estimates/[estimateId]/choose', () => {
    it('commits choice, marks candidate isChosen: true, and syncs values to active loan', async () => {
      // Mock estimate details
      mockSubDocGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          lenderName: 'NEO Bank',
          amountCents: 45000000,
          interestRate: 6.5,
          termMonths: 360,
          points: 1.0,
          estimatedCostsCents: 500000,
          fileId: 'file_le_doc',
          fileName: 'NEO_estimate.pdf',
          fileUrl: 'https://storage/NEO_estimate.pdf'
        })
      });

      // Mock list estimates return candidates
      mockSubCollGet.mockResolvedValueOnce({
        docs: [
          { id: 'est_1', ref: 'ref_est_1' },
          { id: 'est_2', ref: 'ref_est_2' }
        ]
      });

      // Mock active loans subcollection return first active loan
      mockSubCollGet.mockResolvedValueOnce({
        empty: false,
        docs: [
          { ref: 'ref_loan_123' }
        ]
      });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loan-estimates/est_1/choose`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer mock' }
      });

      const res = await chooseEstimate(req, {
        params: Promise.resolve({ id: PROJECT_ID, estimateId: 'est_1' })
      });

      expect(res.status).toBe(200);

      // Verify candidates state updates
      expect(mockBatchUpdate).toHaveBeenCalledTimes(3); // 2 updates for estimates list isChosen, 1 update for active loan record
      expect(mockBatchCommit).toHaveBeenCalled();

      // Verify active loan record received estimate values
      expect(mockBatchUpdate).toHaveBeenLastCalledWith(
        'ref_loan_123',
        expect.objectContaining({
          lenderName: 'NEO Bank',
          amountCents: 45000000,
          interestRate: 6.5,
          termMonths: 360,
          fileId: 'file_le_doc'
        })
      );
    });
  });

  describe('DELETE /api/projects/[id]/loan-estimates/[estimateId]', () => {
    it('deletes candidate from subcollection', async () => {
      mockSubDocGet.mockResolvedValueOnce({ exists: true });

      const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loan-estimates/est_1`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer mock' }
      });

      const res = await deleteEstimate(req, {
        params: Promise.resolve({ id: PROJECT_ID, estimateId: 'est_1' })
      });

      expect(res.status).toBe(200);
      expect(mockSubDocDelete).toHaveBeenCalled();
    });
  });
});
