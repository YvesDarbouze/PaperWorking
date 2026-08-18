import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
const mockVerifyIdToken = jest.fn();
const mockProjectDocGet = jest.fn();
const mockProjectDocUpdate = jest.fn();
const mockSubDocGet = jest.fn();
const mockSubDocSet = jest.fn();
const mockSubDocUpdate = jest.fn();
const mockSubDocDelete = jest.fn();
const mockSubCollGet = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatchUpdate = jest.fn();

const mockBatchSet = jest.fn();
// Mock Firestore batch
const mockBatch = jest.fn(() => ({
  set: (...args: any[]) => mockBatchSet(...args),
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
   Lazy-import routes & metrics
   ────────────────────────────────────────────────────────────────────────── */
import { POST as chooseEstimate } from '@/app/api/projects/[id]/loan-estimates/[estimateId]/choose/route';
import { POST as lockTerms } from '@/app/api/projects/[id]/loans/lock/route';
import { deriveAllProjectMetrics } from '@/lib/metrics/reiMetrics';
import { FX_1_PROJECT } from '@/lib/metrics/fixtures';

describe('FD-21: Locked Terms & Live Metrics Calculations', () => {
  const PROJECT_ID = 'proj_test_locked';
  const OWNER_UID = 'user_leadInvestor_seed';
  const ESTIMATE_ID = 'est_cand_123';

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

  it('choose estimate API copies sourceTags to active LoanRecord', async () => {
    mockSubDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: ESTIMATE_ID,
        lenderName: 'Sovereign Bank',
        amountCents: 22320000,
        interestRate: 6.5,
        termMonths: 360,
        points: 0.5,
        sourceTags: {
          amountCents: 'document',
          interestRate: 'manual',
          termMonths: 'document',
          points: 'manual',
        }
      })
    });

    mockSubCollGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'loan_rec_123',
          ref: 'mock_ref_loan_rec_123',
          data: () => ({ id: 'loan_rec_123' })
        }
      ]
    });

    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loan-estimates/${ESTIMATE_ID}/choose`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock'
      }
    });

    const res = await chooseEstimate(req, {
      params: Promise.resolve({ id: PROJECT_ID, estimateId: ESTIMATE_ID })
    });

    expect(res.status).toBe(200);
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      'mock_ref_loan_rec_123',
      expect.objectContaining({
        lenderName: 'Sovereign Bank',
        amountCents: 22320000,
        sourceTags: expect.objectContaining({
          amountCents: 'document',
          interestRate: 'manual'
        })
      })
    );
  });

  it('lock terms API copies sourceTags to financials.sourceTags in project document', async () => {
    mockSubCollGet.mockResolvedValue({
      docs: [
        {
          id: 'loan_rec_123',
          data: () => ({
            id: 'loan_rec_123',
            amountCents: 22320000,
            interestRate: 6.5,
            termMonths: 360,
            points: 0.5,
            sourceTags: {
              amountCents: 'document',
              interestRate: 'manual',
              termMonths: 'document',
              points: 'manual'
            }
          })
        }
      ]
    });

    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/lock`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock'
      }
    });

    const res = await lockTerms(req, {
      params: Promise.resolve({ id: PROJECT_ID })
    });

    expect(res.status).toBe(200);
    expect(mockProjectDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        financials: expect.objectContaining({
          loanAmount: 223200,
          loanInterestRate: 6.5,
          loanTermYears: 30,
          loanOriginationPoints: 0.5,
          sourceTags: expect.objectContaining({
            loan_amount: 'document',
            loan_interest_rate: 'manual',
            loan_term: 'document',
            loanOriginationPoints: 'manual'
          })
        })
      })
    );
  });

  it('deriveAllProjectMetrics computes five goldens correctly from FX_1_PROJECT', () => {
    const metrics = deriveAllProjectMetrics(FX_1_PROJECT);
    expect(metrics.noi).toBe(12486);
    expect(metrics.annualCashFlow).toBeCloseTo(-4444, 1);
    expect(metrics.dscr).toBeCloseTo(0.74, 2);
    expect(metrics.cashOnCashReturn).toBeCloseTo(-7.41, 1);
    expect(metrics.grossRentMultiplier).toBeCloseTo(11.92, 2);
  });
});
