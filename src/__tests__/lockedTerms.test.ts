import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
var mockVerifyIdToken = jest.fn();
var mockProjectDocGet = jest.fn();
var mockProjectDocUpdate = jest.fn();
var mockSubDocGet = jest.fn();
var mockSubDocSet = jest.fn();
var mockSubDocUpdate = jest.fn();
var mockSubCollGet = jest.fn();
var mockBatchCommit = jest.fn();
var mockNotificationCreate = jest.fn();
var mockWriteActivityLog = jest.fn();

// Mock activityLog writer
jest.mock('@/lib/firebase/activityLogWriter', () => ({
  writeActivityLog: (...args: any[]) => mockWriteActivityLog(...args)
}));

// Mock Notification Service
jest.mock('@/lib/services/notificationService', () => ({
  NotificationService: {
    createNotification: (...args: any[]) => mockNotificationCreate(...args)
  }
}));

/* ──────────────────────────────────────────────────────────────────────────
   Firebase Admin mock
   ────────────────────────────────────────────────────────────────────────── */
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    batch: () => ({
      commit: () => mockBatchCommit(),
    }),
    collection: (_colName: string) => {
      return {
        doc: (docId?: string) => ({
          get: (...args: any[]) => mockProjectDocGet(...args),
          update: (...args: any[]) => mockProjectDocUpdate(...args),
          collection: (_subCol: string) => ({
            get: (...args: any[]) => mockSubCollGet(...args),
            doc: (subDocId?: string) => ({
              get: (...args: any[]) => mockSubDocGet(...args),
              set: (...args: any[]) => mockSubDocSet(...args),
              update: (...args: any[]) => mockSubDocUpdate(...args),
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
import { POST } from '@/app/api/projects/[id]/loans/lock/route';

describe('Card F3.5 Lock Terms API Tests', () => {
  const PROJECT_ID = 'proj_test_locking';
  const OWNER_UID = 'user_leadInvestor_seed';

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'leadInvestor@apex.com',
      name: 'Marcus Teammate'
    });

    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        propertyName: '789 Elm St',
        financials: {
          purchasePrice: 200000,
          loanAmount: 0
        }
      })
    });
  });

  it('calculates weighted terms and locks active loans into project financials slots', async () => {
    // Mock active loans (SBA 504 multi-loan structure: 50% Bank, 40% CDC)
    const mockLoans = [
      {
        id: 'loan_1st_bank',
        instrument: 'SBA 504',
        amountCents: 10000000, // $100k
        interestRate: 6.0,
        termMonths: 300, // 25 years
        points: 1.0,
        status: 'Clear-To-Close'
      },
      {
        id: 'loan_2nd_cdc',
        instrument: 'SBA 504',
        amountCents: 8000000, // $80k
        interestRate: 4.5,
        termMonths: 240, // 20 years
        points: 1.5,
        status: 'Clear-To-Close'
      }
    ];

    mockSubCollGet.mockResolvedValue({
      docs: mockLoans.map((l) => ({
        id: l.id,
        data: () => l
      }))
    });

    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/lock`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock'
      }
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: PROJECT_ID })
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify correct calculations:
    // Final Amount = 180,000
    // Weighted rate: (6.0 * 100k + 4.5 * 80k) / 180k = (600,000 + 360,000) / 180,000 = 5.3333%
    // Weighted term: (25 * 100k + 20 * 80k) / 180k = (2,500,000 + 1,600,000) / 180,000 = 22.7778 years
    // Weighted points: (1.0 * 100k + 1.5 * 80k) / 180k = (100,000 + 120,000) / 180,000 = 1.2222%
    expect(body.lockedTerms.loanAmount).toBe(180000);
    expect(body.lockedTerms.loanInterestRate).toBe(5.3333);
    expect(body.lockedTerms.loanTermYears).toBe(22.7778);
    expect(body.lockedTerms.loanOriginationPoints).toBe(1.2222);
    expect(body.lockedTerms.annualDebtService).toBeGreaterThan(0);

    // Verify parent project financials update
    expect(mockProjectDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        financials: expect.objectContaining({
          loanAmount: 180000,
          loanInterestRate: 5.3333,
          loanTermYears: 22.7778,
          loanOriginationPoints: 1.2222,
          annualDebtService: body.lockedTerms.annualDebtService
        }),
        termsLocked: true
      })
    );

    // Verify timeline activity log
    expect(mockWriteActivityLog).toHaveBeenCalledWith(
      PROJECT_ID,
      OWNER_UID,
      [{
        fieldPath: 'financials.loanAmount',
        oldValue: 0,
        newValue: 180000
      }],
      'manual'
    );

    // Verify notification was sent
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LOAN_STATUS_UPDATE',
        recipientId: OWNER_UID,
        actor: { uid: OWNER_UID, name: 'Marcus Teammate' },
        objectReference: expect.objectContaining({
          projectId: PROJECT_ID,
          dealAddress: '789 Elm St'
        })
      })
    );
  });

  it('rejects unauthenticated lock requests', async () => {
    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/lock`, {
      method: 'POST'
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: PROJECT_ID })
    });

    expect(res.status).toBe(401);
  });

  it('rejects unauthorized lock requests (non-members)', async () => {
    mockProjectDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: 'other_owner',
        members: { 'someone_else': true }
      })
    });

    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/lock`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock'
      }
    });

    const res = await POST(req, {
      params: Promise.resolve({ id: PROJECT_ID })
    });

    expect(res.status).toBe(403);
  });
});
