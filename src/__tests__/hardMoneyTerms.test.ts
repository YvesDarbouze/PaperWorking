import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
var mockVerifyIdToken = jest.fn();
var mockProjectDocGet = jest.fn();
var mockProjectDocUpdate = jest.fn();
var mockLoanDocGet = jest.fn();
var mockLoanDocUpdate = jest.fn();
var mockWriteActivityLog = jest.fn();
var mockCreateNotification = jest.fn();

/* ──────────────────────────────────────────────────────────────────────────
   Firebase Admin mock
   ────────────────────────────────────────────────────────────────────────── */
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collection: (_colName: string) => {
      if (_colName === 'organizations') {
        return {
          doc: () => ({
            get: () => Promise.resolve({ exists: false }),
          }),
        };
      }
      // projects
      return {
        doc: (docId?: string) => ({
          get: (...args: any[]) => mockProjectDocGet(...args),
          update: (...args: any[]) => mockProjectDocUpdate(...args),
          collection: (_subCol: string) => ({
            doc: (subDocId?: string) => ({
              get: (...args: any[]) => mockLoanDocGet(...args),
              update: (...args: any[]) => mockLoanDocUpdate(...args),
            }),
          }),
        }),
      };
    },
  },
}));

jest.mock('@/lib/firebase/activityLogWriter', () => ({
  writeActivityLog: (...args: any[]) => mockWriteActivityLog(...args),
}));

jest.mock('@/lib/services/notificationService', () => ({
  NotificationService: {
    createNotification: (...args: any[]) => mockCreateNotification(...args),
  },
}));

/* ──────────────────────────────────────────────────────────────────────────
   Import under test
   ────────────────────────────────────────────────────────────────────────── */
import { PATCH } from '@/app/api/projects/[id]/loans/hard-money-terms/route';
import { calculateAmortization } from '@/lib/utils/reiCalculators';

describe('Card F3.7 — Hard Money / Bridge Terms API', () => {
  const PROJECT_ID = 'proj_hm_test';
  const OWNER_UID = 'user_hm_owner';
  const LOAN_ID = 'loan_hm_001';

  const buildRequest = (body: Record<string, any>) =>
    new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/hard-money-terms`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify(body),
    });

  const defaultPayload = {
    loanId: LOAN_ID,
    arvCents: 45000000,     // $450,000 in cents
    arvSource: 'user_assumption',
    amountCents: 31500000,  // $315,000 in cents
    interestRate: 10.5,
    termMonths: 12,
    points: 2,
    interestOnly: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'hmowner@paperworking.co',
      name: 'HM Owner',
    });

    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        dispositionType: 'SALE',
        propertyName: '456 Rehab Ave',
        financials: {
          purchasePrice: 350000,
          estimatedARV: 450000,
          financingType: 'Financed',
        },
      }),
    });

    mockLoanDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: LOAN_ID,
        projectId: PROJECT_ID,
        instrument: 'Hard Money',
        lenderName: 'Hard Money Lender',
        amountCents: 0,
        interestRate: 0,
        termMonths: 12,
        points: 0,
        status: 'Application-Submitted',
      }),
    });

    mockProjectDocUpdate.mockResolvedValue(undefined);
    mockLoanDocUpdate.mockResolvedValue(undefined);
    mockWriteActivityLog.mockResolvedValue(undefined);
    mockCreateNotification.mockResolvedValue(undefined);
  });

  /* ═══ Validation ═════════════════════════════════════════════════════════ */
  it('rejects when loanId is missing', async () => {
    const req = buildRequest({ ...defaultPayload, loanId: undefined });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('loanId');
  });

  it('rejects when loan record does not exist', async () => {
    mockLoanDocGet.mockResolvedValue({ exists: false });
    const req = buildRequest(defaultPayload);
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(404);
  });

  it('rejects when instrument is not Hard Money or Bridge', async () => {
    mockLoanDocGet.mockResolvedValue({
      exists: true,
      data: () => ({ instrument: 'Conventional' }),
    });
    const req = buildRequest(defaultPayload);
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('Hard Money or Bridge');
  });

  it('rejects invalid interestRate', async () => {
    const req = buildRequest({ ...defaultPayload, interestRate: 150 });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('interestRate');
  });

  it('rejects invalid arvSource', async () => {
    const req = buildRequest({ ...defaultPayload, arvSource: 'magic' });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('arvSource');
  });

  /* ═══ Successful Configuration ═══════════════════════════════════════════ */
  it('saves terms and returns correct structure', async () => {
    const req = buildRequest(defaultPayload);
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.loan.instrument).toBe('Hard Money');
    expect(json.loan.arvCents).toBe(45000000);
    expect(json.loan.ltarvPercent).toBe(70); // 315k / 450k = 70%
    expect(json.loan.interestOnly).toBe(true);
    expect(json.loan.exitPlan).toBe('SALE');
  });

  /* ═══ Exit Plan — reads from dispositionType, never re-asks ══════════════ */
  it('reads exit plan from project.dispositionType', async () => {
    const req = buildRequest(defaultPayload);
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    const json = await res.json();
    expect(json.loan.exitPlan).toBe('SALE');
  });

  it('returns null exit plan when dispositionType is not set', async () => {
    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        financials: { purchasePrice: 350000, financingType: 'Financed' },
      }),
    });
    const req = buildRequest(defaultPayload);
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    const json = await res.json();
    expect(json.loan.exitPlan).toBeNull();
  });

  /* ═══ LTARV Calculation ══════════════════════════════════════════════════ */
  it('calculates LTARV% correctly', async () => {
    const req = buildRequest({
      ...defaultPayload,
      amountCents: 33750000,  // $337,500
      arvCents: 45000000,     // $450,000
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    const json = await res.json();
    expect(json.loan.ltarvPercent).toBe(75); // 337.5k / 450k = 75%
  });

  /* ═══ Interest-Only Debt Service ═════════════════════════════════════════ */
  it('returns correct interest-only debt service', async () => {
    const req = buildRequest(defaultPayload);
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    const json = await res.json();

    // Interest-only: $315,000 * (10.5% / 12) = $2,756.25/mo
    expect(json.debtService.monthlyPayment).toBeCloseTo(2756.25, 0);
    expect(json.debtService.firstYearPrincipal).toBe(0);
    expect(json.debtService.annualDebtService).toBeCloseTo(2756.25 * 12, 0);
  });

  it('returns amortizing debt service when interestOnly is false', async () => {
    const req = buildRequest({ ...defaultPayload, interestOnly: false });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    const json = await res.json();

    expect(json.debtService.firstYearPrincipal).toBeGreaterThan(0);
    expect(json.debtService.monthlyPayment).toBeGreaterThan(2756.25); // higher than I/O
  });

  /* ═══ Compressed Timeline Template ═══════════════════════════════════════ */
  it('sets compressed timeline template on project financials', async () => {
    const req = buildRequest(defaultPayload);
    await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });

    expect(mockProjectDocUpdate).toHaveBeenCalled();
    const updateCalls = mockProjectDocUpdate.mock.calls;
    const lastCall = updateCalls[updateCalls.length - 1][0];
    expect(lastCall['financials.timelineTemplate']).toBe('compressed');
  });

  /* ═══ Guarded Reconciliation ═════════════════════════════════════════════ */
  it('updates only the targeted loan doc fields (guarded)', async () => {
    const req = buildRequest(defaultPayload);
    await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });

    expect(mockLoanDocUpdate).toHaveBeenCalledTimes(1);
    const updatePayload = mockLoanDocUpdate.mock.calls[0][0];
    expect(updatePayload.arvCents).toBe(45000000);
    expect(updatePayload.arvSource).toBe('user_assumption');
    expect(updatePayload.interestOnly).toBe(true);
    expect(updatePayload.exitPlan).toBe('SALE');
    expect(updatePayload.ltarvPercent).toBe(70);
  });

  /* ═══ Bridge Instrument Accepted ═════════════════════════════════════════ */
  it('accepts Bridge instrument loans', async () => {
    mockLoanDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        id: LOAN_ID,
        instrument: 'Bridge',
        amountCents: 0,
        termMonths: 24,
      }),
    });
    const req = buildRequest(defaultPayload);
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.loan.instrument).toBe('Bridge');
  });

  /* ═══ Timeline + Notification ════════════════════════════════════════════ */
  it('writes activity log on configuration', async () => {
    const req = buildRequest(defaultPayload);
    await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(mockWriteActivityLog).toHaveBeenCalledTimes(1);
  });

  it('fires notification with I/O flag', async () => {
    const req = buildRequest(defaultPayload);
    await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    const notif = mockCreateNotification.mock.calls[0][0];
    expect(notif.objectReference.task).toContain('I/O');
  });
});

/* ═══ Shared Utility: Interest-Only Amortization ═══════════════════════════ */
describe('calculateAmortization — interest-only support', () => {
  it('backward-compatible: 3-arg call still works', () => {
    const result = calculateAmortization(100000, 6, 360);
    expect(result.monthlyPayment).toBeGreaterThan(0);
    expect(result.firstYearPrincipal).toBeGreaterThan(0);
  });

  it('interest-only: monthly payment = interest only, no principal', () => {
    const result = calculateAmortization(100000, 12, 12, true);
    // $100,000 * (12% / 12) = $1,000/mo
    expect(result.monthlyPayment).toBe(1000);
    expect(result.firstYearPrincipal).toBe(0);
    expect(result.annualDebtService).toBe(12000);
    expect(result.firstYearInterest).toBe(12000);
  });

  it('interest-only: balance never decreases', () => {
    const result = calculateAmortization(200000, 10, 24, true);
    expect(result.schedule.every((s) => s.remainingBalance === 200000)).toBe(true);
    expect(result.schedule.every((s) => s.principal === 0)).toBe(true);
  });

  it('fully-amortizing: balance reaches zero', () => {
    const result = calculateAmortization(100000, 6, 360, false);
    const lastEntry = result.schedule[result.schedule.length - 1];
    expect(lastEntry.remainingBalance).toBeCloseTo(0, 0);
  });
});
