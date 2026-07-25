import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
var mockVerifyIdToken = jest.fn();
var mockProjectDocGet = jest.fn();
var mockProjectDocUpdate = jest.fn();
var mockSubCollGet = jest.fn();
var mockSubDocUpdate = jest.fn();
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
            get: (...args: any[]) => mockSubCollGet(...args),
            doc: (subDocId?: string) => {
              const ref = { id: subDocId || 'mock-doc-id' };
              return {
                ...ref,
                update: (...args: any[]) => mockSubDocUpdate(...args),
              };
            },
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
   Lazy-import route AFTER mocks are configured
   ────────────────────────────────────────────────────────────────────────── */
import { POST } from '@/app/api/projects/[id]/loans/sba504/route';

describe('Card F3.6 — SBA 504 Route API', () => {
  const PROJECT_ID = 'proj_sba_test';
  const OWNER_UID = 'user_sba_owner';

  const buildRequest = (body: Record<string, any>) =>
    new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/sba504`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify(body),
    });

  const defaultPayload = {
    occupancyType: 'existing',
    occupancyRate: 65,
    injectionTier: 10,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'sbaowner@paperworking.co',
      name: 'SBA Owner',
    });

    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        financials: {
          purchasePrice: 500000,
          financingType: 'Financed',
          capitalStack: [],
        },
        propertyName: '123 Main St',
      }),
    });

    // Two existing SBA 504 loan docs
    const bankRef = { ref: { id: 'loan-bank', update: mockSubDocUpdate } };
    const cdcRef = { ref: { id: 'loan-cdc', update: mockSubDocUpdate } };
    mockSubCollGet.mockResolvedValue({
      docs: [
        { ...bankRef, data: () => ({ lenderName: 'SBA 504 First Lien Bank', instrument: 'SBA 504' }) },
        { ...cdcRef, data: () => ({ lenderName: 'CDC Debenture Second Lien', instrument: 'SBA 504' }) },
      ],
    });

    mockProjectDocUpdate.mockResolvedValue(undefined);
    mockSubDocUpdate.mockResolvedValue(undefined);
    mockWriteActivityLog.mockResolvedValue(undefined);
    mockCreateNotification.mockResolvedValue(undefined);
  });

  /* ═══ Auth ═══════════════════════════════════════════════════════════════ */
  it('rejects unauthenticated requests', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Unauthorized'));
    const req = new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/loans/sba504`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaultPayload),
    });
    // The route's requireAuth will catch the missing token
    // It should not return 200
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).not.toBe(200);
  });

  /* ═══ Validation ═════════════════════════════════════════════════════════ */
  it('rejects invalid occupancyType', async () => {
    const req = buildRequest({ ...defaultPayload, occupancyType: 'invalid' });
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('occupancyType');
  });

  it('rejects occupancyRate outside 0-100', async () => {
    const req = buildRequest({ ...defaultPayload, occupancyRate: 150 });
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('occupancyRate');
  });

  it('rejects invalid injectionTier', async () => {
    const req = buildRequest({ ...defaultPayload, injectionTier: 25 });
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('injectionTier');
  });

  it('requires occupancyRateTenYears for new_construction', async () => {
    const req = buildRequest({
      ...defaultPayload,
      occupancyType: 'new_construction',
      occupancyRate: 65,
    });
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('occupancyRateTenYears');
  });

  it('rejects when purchasePrice is not set', async () => {
    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        financials: { purchasePrice: 0 },
      }),
    });
    const req = buildRequest(defaultPayload);
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Purchase price');
  });

  /* ═══ FX-7 Structure ═════════════════════════════════════════════════════ */
  it('calculates 50/40/10 structure for standard injection', async () => {
    const req = buildRequest(defaultPayload); // injectionTier: 10
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.structure.bankPct).toBe(50);
    expect(json.structure.cdcPct).toBe(40);
    expect(json.structure.injectionPct).toBe(10);
    expect(json.structure.bankAmountCents).toBe(25000000); // 50% of $500k
    expect(json.structure.cdcAmountCents).toBe(20000000);  // 40% of $500k
    expect(json.structure.injectionAmountCents).toBe(5000000); // 10% of $500k
  });

  it('calculates 50/35/15 structure for new-business injection', async () => {
    const req = buildRequest({ ...defaultPayload, injectionTier: 15 });
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.structure.bankPct).toBe(50);
    expect(json.structure.cdcPct).toBe(35);
    expect(json.structure.injectionPct).toBe(15);
  });

  it('calculates 50/30/20 structure for dual-condition injection', async () => {
    const req = buildRequest({ ...defaultPayload, injectionTier: 20 });
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.structure.bankPct).toBe(50);
    expect(json.structure.cdcPct).toBe(30);
    expect(json.structure.injectionPct).toBe(20);
  });

  /* ═══ Guarded Reconciliation ═════════════════════════════════════════════ */
  it('updates existing loan records via guarded reconciliation (not delete+recreate)', async () => {
    const req = buildRequest(defaultPayload);
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);

    // Bank and CDC doc refs should have been updated
    expect(mockSubDocUpdate).toHaveBeenCalledTimes(2);
  });

  it('upserts borrower injection into capitalStack without overwriting other sources', async () => {
    // Pre-seed an unrelated equity source
    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        financials: {
          purchasePrice: 500000,
          capitalStack: [
            { id: 'existing-partner-equity', category: 'Partner Equity', amount: 50000 },
          ],
        },
      }),
    });

    const req = buildRequest(defaultPayload);
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);

    // Verify the update call includes the existing partner equity plus the new injection
    const updateCalls = mockProjectDocUpdate.mock.calls;
    const lastCall = updateCalls[updateCalls.length - 1][0];
    const stack = lastCall['financials.capitalStack'];
    expect(stack).toBeDefined();
    expect(stack.length).toBe(2); // existing + injection
    expect(stack[0].id).toBe('existing-partner-equity');
    expect(stack[1].id).toBe('sba504-borrower-injection');
    expect(stack[1].amount).toBe(50000); // 10% of $500k
  });

  /* ═══ Timeline & Notification ════════════════════════════════════════════ */
  it('writes activity log on successful configuration', async () => {
    const req = buildRequest(defaultPayload);
    await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(mockWriteActivityLog).toHaveBeenCalledTimes(1);
    expect(mockWriteActivityLog).toHaveBeenCalledWith(
      PROJECT_ID,
      OWNER_UID,
      expect.arrayContaining([
        expect.objectContaining({ fieldPath: 'financials.sbaInjectionTier' }),
      ]),
      'manual'
    );
  });

  it('fires notification on successful configuration', async () => {
    const req = buildRequest(defaultPayload);
    await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'LOAN_STATUS_UPDATE',
        objectReference: expect.objectContaining({
          task: expect.stringContaining('SBA 504 structure configured'),
        }),
      })
    );
  });

  /* ═══ Credit Context (Optional) ══════════════════════════════════════════ */
  it('stores optional credit scores with source provenance', async () => {
    const req = buildRequest({
      ...defaultPayload,
      paydexScore: 82,
      paydexSource: 'D&B Report, Feb 2026',
      sbssScore: 170,
      sbssSource: 'SBA Prescreen',
    });
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);

    const updateCalls = mockProjectDocUpdate.mock.calls;
    const lastCall = updateCalls[updateCalls.length - 1][0];
    expect(lastCall['financials.sbaPaydexScore']).toBe(82);
    expect(lastCall['financials.sbaPaydexSource']).toBe('D&B Report, Feb 2026');
    expect(lastCall['financials.sbaSbssScore']).toBe(170);
  });

  /* ═══ new_construction Flow ══════════════════════════════════════════════ */
  it('accepts valid new_construction with ten-year projection', async () => {
    const req = buildRequest({
      ...defaultPayload,
      occupancyType: 'new_construction',
      occupancyRate: 62,
      occupancyRateTenYears: 85,
      injectionTier: 15,
    });
    const res = await POST(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.structure.cdcPct).toBe(35);
    expect(json.structure.injectionPct).toBe(15);

    const updateCalls = mockProjectDocUpdate.mock.calls;
    const lastCall = updateCalls[updateCalls.length - 1][0];
    expect(lastCall['financials.sbaOccupancyType']).toBe('new_construction');
    expect(lastCall['financials.sbaOccupancyRateTenYears']).toBe(85);
  });
});
