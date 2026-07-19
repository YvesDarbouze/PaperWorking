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
var mockBatchCommit = jest.fn();
var mockBatchSet = jest.fn();
var mockNotificationCreate = jest.fn();

// Mock activityLog writer
var mockWriteActivityLog = jest.fn();
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
import { PATCH } from '@/app/api/projects/[id]/loans/[loanId]/route';

describe('Card F3.4 Loan Underwriting Milestones API Tests', () => {
  const PROJECT_ID = 'proj_test_milestones';
  const LOAN_ID = 'loan_first_lien';
  const OWNER_UID = 'user_sponsor_seed';

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'sponsor@apex.com',
      name: 'Marcus Teammate'
    });

    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        propertyName: '456 Oak Ave',
        financials: { financingType: 'Financed' }
      })
    });

    mockSubDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: LOAN_ID,
        instrument: 'Conventional',
        amountCents: 20000000, // $200k loan
        status: 'Application-Submitted'
      })
    });
  });

  it('updates loan status, writes activityLog, updates project status, and dispatches notification', async () => {
    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/${LOAN_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock'
      },
      body: JSON.stringify({ status: 'Processing' })
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: PROJECT_ID, loanId: LOAN_ID })
    });

    expect(res.status).toBe(200);

    // Verify sub-document status update
    expect(mockSubDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'Processing' })
    );

    // Verify timeline activity log was written
    expect(mockWriteActivityLog).toHaveBeenCalledWith(
      PROJECT_ID,
      OWNER_UID,
      [{
        fieldPath: `loans.${LOAN_ID}.status`,
        oldValue: 'Application-Submitted',
        newValue: 'Processing'
      }],
      'manual'
    );

    // Verify parent project status was synchronized
    expect(mockProjectDocUpdate).toHaveBeenCalledWith({
      loanStatus: 'Processing'
    });

    // Verify system notification was fired to owner
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LOAN_STATUS_UPDATE',
        recipientId: OWNER_UID,
        actor: { uid: OWNER_UID, name: 'Marcus Teammate' },
        objectReference: expect.objectContaining({
          projectId: PROJECT_ID,
          dealAddress: '456 Oak Ave'
        })
      })
    );
  });

  it('automatically calculates and stores LTV ratio on Appraisal-Received status transition', async () => {
    const appraisalPayload = {
      status: 'Appraisal-Received',
      appraisedValueCents: 25000000, // $250k appraised value
      appraisalFileId: 'doc_appr_111',
      appraisalFileName: 'appraisal_report.pdf',
      appraisalFileUrl: 'https://storage/appraisal_report.pdf'
    };

    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/${LOAN_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock'
      },
      body: JSON.stringify(appraisalPayload)
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: PROJECT_ID, loanId: LOAN_ID })
    });

    expect(res.status).toBe(200);

    // Verify status, appraisal metadata, and calculated LTV (200k loan / 250k appraised = 80.00% LTV)
    expect(mockSubDocUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'Appraisal-Received',
        appraisedValueCents: 25000000,
        appraisalFileId: 'doc_appr_111',
        appraisalFileName: 'appraisal_report.pdf',
        appraisalFileUrl: 'https://storage/appraisal_report.pdf',
        ltvPercent: 80.00
      })
    );
  });

  it('rejects unauthenticated requests (missing token)', async () => {
    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/${LOAN_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'Processing' })
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: PROJECT_ID, loanId: LOAN_ID })
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('rejects forged requests or unauthenticated tokens (invalid token)', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Firebase ID token expired or invalid'));

    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/${LOAN_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_forged_token'
      },
      body: JSON.stringify({ status: 'Processing' })
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: PROJECT_ID, loanId: LOAN_ID })
    });

    expect(res.status).toBe(401);
  });

  it('rejects requests to projects where the user is not a member', async () => {
    // Return null or empty member list
    mockProjectDocGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        ownerUid: 'some_other_owner',
        members: { 'someone_else': true }
      })
    });

    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/${LOAN_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock'
      },
      body: JSON.stringify({ status: 'Processing' })
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: PROJECT_ID, loanId: LOAN_ID })
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('access denied');
  });
});
