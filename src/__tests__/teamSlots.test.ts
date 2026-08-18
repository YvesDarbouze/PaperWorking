import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
const mockVerifyIdToken = jest.fn();
const mockProjectDocGet = jest.fn();
const mockProjectDocUpdate = jest.fn();
const mockOrgDocGet = jest.fn();
const mockWriteActivityLog = jest.fn();
const mockCreateNotification = jest.fn();

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
            get: (...args: any[]) => mockOrgDocGet(...args),
          }),
        };
      }
      // projects
      return {
        doc: (docId?: string) => ({
          get: (...args: any[]) => mockProjectDocGet(...args),
          update: (...args: any[]) => mockProjectDocUpdate(...args),
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
import { PATCH } from '@/app/api/projects/[id]/team-slots/route';

describe('Card F4.1 — Team Slots API', () => {
  const PROJECT_ID = 'proj_f4_test';
  const OWNER_UID = 'user_f4_owner';

  const buildRequest = (body: Record<string, any>) =>
    new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/team-slots`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify(body),
    });

  const marketplaceAssignment = {
    name: 'Jane Title',
    firm: 'Title Solutions LLC',
    phone: '(555) 123-4567',
    email: 'jane@titlesolutions.com',
    source: 'marketplace',
    marketplaceVendorId: 'vendor_mp_001',
  };

  const offPlatformAssignment = {
    name: 'Bob Attorney',
    firm: 'Smith & Partners LLP',
    source: 'off_platform',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'f4owner@paperworking.co',
      name: 'F4 Owner',
    });

    mockProjectDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        ownerUid: OWNER_UID,
        members: { [OWNER_UID]: true },
        state: 'NY',
        assetClass: 'Commercial',
        propertyName: '789 Broadway',
        financials: {
          purchasePrice: 500000,
          financingType: 'Financed',
          titleCompany: 'Legacy Title Corp',
          f4TitleEscrowVendor: null,
          f4ClosingAttorneyVendor: null,
        },
      }),
    });

    mockOrgDocGet.mockResolvedValue({ exists: false });
    mockProjectDocUpdate.mockResolvedValue(undefined);
    mockWriteActivityLog.mockResolvedValue(undefined);
    mockCreateNotification.mockResolvedValue(undefined);
  });

  /* ═══ Validation ═════════════════════════════════════════════════════════ */
  it('rejects unauthenticated requests', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('invalid'));
    const req = buildRequest({
      slotKey: 'f4TitleEscrowVendor',
      assignment: marketplaceAssignment,
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).not.toBe(200);
  });

  it('rejects invalid slotKey', async () => {
    const req = buildRequest({ slotKey: 'f4InvalidSlot', assignment: marketplaceAssignment });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('Invalid slotKey');
  });

  it('rejects assignment without name', async () => {
    const req = buildRequest({
      slotKey: 'f4TitleEscrowVendor',
      assignment: { ...marketplaceAssignment, name: '' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('name');
  });

  it('rejects assignment with invalid source', async () => {
    const req = buildRequest({
      slotKey: 'f4TitleEscrowVendor',
      assignment: { ...marketplaceAssignment, source: 'magic_marketplace' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain('source');
  });

  /* ═══ Marketplace Assignment ═════════════════════════════════════════════ */
  it('assigns a marketplace vendor with all fields', async () => {
    const req = buildRequest({
      slotKey: 'f4TitleEscrowVendor',
      assignment: marketplaceAssignment,
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.slotKey).toBe('f4TitleEscrowVendor');
    expect(json.assignment.name).toBe('Jane Title');
    expect(json.assignment.firm).toBe('Title Solutions LLC');
    expect(json.assignment.source).toBe('marketplace');
    expect(json.assignment.marketplaceVendorId).toBe('vendor_mp_001');
    expect(json.assignment.assignedAt).toBeTruthy();
    expect(json.assignment.assignedBy).toBe(OWNER_UID);
  });

  /* ═══ Off-Platform Assignment ════════════════════════════════════════════ */
  it('assigns an off-platform vendor', async () => {
    const req = buildRequest({
      slotKey: 'f4ClosingAttorneyVendor',
      assignment: offPlatformAssignment,
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.assignment.name).toBe('Bob Attorney');
    expect(json.assignment.source).toBe('off_platform');
    expect(json.assignment.phone).toBeNull();
    expect(json.assignment.email).toBeNull();
  });

  /* ═══ Clear Assignment ═══════════════════════════════════════════════════ */
  it('clears a slot when assignment is null', async () => {
    const req = buildRequest({
      slotKey: 'f4AppraiserVendor',
      assignment: null,
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.assignment).toBeNull();
  });

  /* ═══ Guarded Write ══════════════════════════════════════════════════════ */
  it('updates only the targeted financials field (guarded)', async () => {
    const req = buildRequest({
      slotKey: 'f4SurveyorVendor',
      assignment: { name: 'Survey Pro', source: 'off_platform' },
    });
    await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });

    expect(mockProjectDocUpdate).toHaveBeenCalledTimes(1);
    const updatePayload = mockProjectDocUpdate.mock.calls[0][0];

    // Only f4SurveyorVendor should be in the update
    expect(updatePayload['financials.f4SurveyorVendor']).toBeDefined();
    expect(updatePayload['financials.f4SurveyorVendor'].name).toBe('Survey Pro');

    // Other slots should NOT be touched
    expect(updatePayload['financials.f4TitleEscrowVendor']).toBeUndefined();
    expect(updatePayload['financials.f4ClosingAttorneyVendor']).toBeUndefined();
  });

  /* ═══ All Valid Slot Keys ════════════════════════════════════════════════ */
  const ALL_VALID_KEYS = [
    'f4TitleEscrowVendor',
    'f4ClosingAttorneyVendor',
    'f4AppraiserVendor',
    'f4EnvironmentalVendor',
    'f4SurveyorVendor',
    'f4InsuranceBrokerVendor',
    'f4CdcVendor',
    'f4HardMoneyLenderVendor',
  ];

  it('accepts all 8 valid slot keys', async () => {
    for (const key of ALL_VALID_KEYS) {
      const req = buildRequest({
        slotKey: key,
        assignment: { name: `Vendor for ${key}`, source: 'off_platform' },
      });
      const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      expect(res.status).toBe(200);
    }
    // Should have been called once per slot
    expect(mockProjectDocUpdate).toHaveBeenCalledTimes(ALL_VALID_KEYS.length);
  });

  /* ═══ Hard Money Lender Slot ═════════════════════════════════════════════ */
  it('assigns hard money lender slot', async () => {
    const req = buildRequest({
      slotKey: 'f4HardMoneyLenderVendor',
      assignment: { name: 'Patch Capital', firm: 'Patch Finance', source: 'off_platform' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.assignment.name).toBe('Patch Capital');
  });

  /* ═══ Timeline + Notification ════════════════════════════════════════════ */
  it('writes activity log on assignment', async () => {
    const req = buildRequest({
      slotKey: 'f4TitleEscrowVendor',
      assignment: marketplaceAssignment,
    });
    await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(mockWriteActivityLog).toHaveBeenCalledTimes(1);
    const logArgs = mockWriteActivityLog.mock.calls[0];
    expect(logArgs[0]).toBe(PROJECT_ID);
    expect(logArgs[2][0].newValue).toBe('Jane Title');
  });

  it('fires notification with slot label and vendor name', async () => {
    const req = buildRequest({
      slotKey: 'f4InsuranceBrokerVendor',
      assignment: { name: 'Allstate Contact', firm: 'Allstate', source: 'off_platform' },
    });
    await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    const notif = mockCreateNotification.mock.calls[0][0];
    expect(notif.objectReference.task).toContain('Insurance Broker');
    expect(notif.objectReference.task).toContain('Allstate Contact');
  });

  it('fires notification with "cleared" when assignment is null', async () => {
    const req = buildRequest({
      slotKey: 'f4AppraiserVendor',
      assignment: null,
    });
    await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(mockCreateNotification).toHaveBeenCalledTimes(1);
    const notif = mockCreateNotification.mock.calls[0][0];
    expect(notif.objectReference.task).toContain('cleared');
  });

  /* ═══ Carried Forward Source ═════════════════════════════════════════════ */
  it('accepts carried_forward as a valid source', async () => {
    const req = buildRequest({
      slotKey: 'f4TitleEscrowVendor',
      assignment: {
        name: 'Legacy Title Corp',
        firm: 'Legacy Title Corp',
        source: 'carried_forward',
      },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.assignment.source).toBe('carried_forward');
  });
});
