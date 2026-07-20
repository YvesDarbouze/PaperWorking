import { NextRequest } from 'next/server';

/* ──────────────────────────────────────────────────────────────────────────
   Shared mock vars
   ────────────────────────────────────────────────────────────────────────── */
var mockVerifyIdToken = jest.fn();
var mockProjectDocGet = jest.fn();
var mockProjectDocUpdate = jest.fn();
var mockOrgDocGet = jest.fn();
var mockWriteActivityLog = jest.fn();
var mockCreateNotification = jest.fn();
var mockCollectionGroupGet = jest.fn();

/* ──────────────────────────────────────────────────────────────────────────
   Firebase Admin mock
   ────────────────────────────────────────────────────────────────────────── */
jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
  },
  adminDb: {
    collectionGroup: (_groupName: string) => {
      if (_groupName === 'vendorRequests') {
        return {
          where: (_field: string, _op: string, _value: string) => ({
            get: (...args: any[]) => mockCollectionGroupGet(_field, _op, _value, ...args),
          }),
        };
      }
      return {};
    },
    collection: (_colName: string) => {
      if (_colName === 'organizations') {
        return {
          doc: () => ({
            get: (...args: any[]) => mockOrgDocGet(...args),
          }),
        };
      }
      // projects or users
      return {
        doc: (docId?: string) => ({
          get: (...args: any[]) => mockProjectDocGet(docId, ...args),
          update: (...args: any[]) => mockProjectDocUpdate(docId, ...args),
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
import { GET as getVendorRequests } from '@/app/api/vendor-portal/requests/route';
import { SLOT_LABELS, getSlotServiceType } from '@/hooks/useMarketplaceVendors';

describe('FD-24: Fund Vendor Categories & Professional Marketplace', () => {
  const PROJECT_ID = 'proj_fd24_test';
  const OWNER_UID = 'user_fd24_owner';
  const VENDOR_UID = 'vendor_fd24_pro';

  const buildRequest = (body: Record<string, any>) =>
    new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/team-slots`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    jest.clearAllMocks();

    mockVerifyIdToken.mockResolvedValue({
      uid: OWNER_UID,
      email: 'owner@paperworking.co',
      name: 'Owner User',
      token: {
        name: 'Owner User',
        email: 'owner@paperworking.co',
      },
    });

    mockProjectDocGet.mockImplementation((docId: string) => {
      if (docId === PROJECT_ID) {
        return Promise.resolve({
          exists: true,
          data: () => ({
            ownerUid: OWNER_UID,
            members: { [OWNER_UID]: true },
            state: 'TX',
            assetClass: 'Commercial',
            propertyName: '123 Fund Plaza',
            financials: {},
          }),
        });
      }
      return Promise.resolve({ exists: false });
    });
  });

  /* ═══ Slot category mappings ═════════════════════════════════════════════ */
  describe('Fund Category Slot Mappings', () => {
    it('correctly maps F4 slot keys to standard service types', () => {
      expect(getSlotServiceType('f4TitleEscrowVendor')).toBe('Title');
      expect(getSlotServiceType('f4ClosingAttorneyVendor')).toBe('Lawyer');
      expect(getSlotServiceType('f4AppraiserVendor')).toBe('Appraiser');
      expect(getSlotServiceType('f4EnvironmentalVendor')).toBe('Inspector');
      expect(getSlotServiceType('f4SurveyorVendor')).toBe('Inspector');
      expect(getSlotServiceType('f4InsuranceBrokerVendor')).toBe('Insurance');
      expect(getSlotServiceType('f4CdcVendor')).toBe('Lender');
      expect(getSlotServiceType('f4HardMoneyLenderVendor')).toBe('Lender');
    });

    it('each Fund slot key has a human-readable display label', () => {
      expect(SLOT_LABELS.f4TitleEscrowVendor).toBe('Title / Escrow');
      expect(SLOT_LABELS.f4ClosingAttorneyVendor).toBe('Closing Attorney');
      expect(SLOT_LABELS.f4CdcVendor).toBe('CDC (SBA 504)');
      expect(SLOT_LABELS.f4HardMoneyLenderVendor).toBe('Private / Hard-Money Lender');
    });
  });

  /* ═══ Off-platform assignment ════════════──────────────────────────────── */
  describe('Off-Platform Vendor Recording (No Login/Access)', () => {
    it('successfully records an off-platform CDC vendor and does not assign a vendorUid', async () => {
      const payload = {
        slotKey: 'f4CdcVendor',
        assignment: {
          name: 'Apex CDC corp',
          firm: 'Apex Certified Dev Co',
          phone: '(555) 987-6543',
          email: 'info@apexcdc.com',
          source: 'off_platform',
        },
      };

      const req = buildRequest(payload);
      const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.assignment.name).toBe('Apex CDC corp');
      expect(json.assignment.source).toBe('off_platform');
      
      // Ensure there is no marketplace vendor ID or access privileges
      expect(json.assignment.marketplaceVendorId).toBeNull();
      
      // Verify Firestore update payload carries off-platform values exactly
      expect(mockProjectDocUpdate).toHaveBeenCalledWith(
        PROJECT_ID,
        expect.objectContaining({
          'financials.f4CdcVendor': expect.objectContaining({
            name: 'Apex CDC corp',
            firm: 'Apex Certified Dev Co',
            source: 'off_platform',
            marketplaceVendorId: null,
          }),
        })
      );
    });
  });

  /* ═══ Marketplace assignment & notifications ═════════════════════════════ */
  describe('Marketplace Vendor Assignment & Notifications', () => {
    it('dispatches a VENDOR_LEAD matching notification when marketplace vendor is assigned', async () => {
      const payload = {
        slotKey: 'f4HardMoneyLenderVendor',
        assignment: {
          name: 'Fast Capital Hard Money',
          firm: 'Fast Capital Group',
          source: 'marketplace',
          marketplaceVendorId: VENDOR_UID,
        },
      };

      const req = buildRequest(payload);
      const res = await PATCH(req, { params: Promise.resolve({ id: PROJECT_ID }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.assignment.source).toBe('marketplace');
      expect(json.assignment.marketplaceVendorId).toBe(VENDOR_UID);

      // Verify that activity log is written
      expect(mockWriteActivityLog).toHaveBeenCalled();

      // Verify that matching/assignment notification is sent
      expect(mockCreateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: OWNER_UID,
          type: 'TASK_ASSIGNED',
          objectReference: expect.objectContaining({
            projectId: PROJECT_ID,
            task: expect.stringContaining('Hard Money Lender assigned: Fast Capital Hard Money'),
          }),
        })
      );
    });
  });

  /* ═══ Vendor portal isolation (Rule 15) ══════════════════════════════════ */
  describe('Vendor Portal Isolation (Global Rule 15)', () => {
    it('returns only requests matching the authenticated vendor ID', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: VENDOR_UID,
        email: 'pro@paperworking.co',
        name: 'Pro Vendor',
        token: {
          name: 'Pro Vendor',
          email: 'pro@paperworking.co',
        },
      });

      // Mock Firestore users lookup
      mockProjectDocGet.mockImplementation((id: string) => {
        if (id === VENDOR_UID) {
          return Promise.resolve({
            exists: true,
            data: () => ({
              uid: VENDOR_UID,
              accountType: 'vendor',
              vendorProfile: {
                companyName: 'Apex CDC corp',
                type: 'Lender',
              },
            }),
          });
        }
        return Promise.resolve({ exists: false });
      });

      // Mock collectionGroup vendorRequests lookup
      mockCollectionGroupGet.mockImplementation((field, op, value) => {
        expect(field).toBe('vendorUid');
        expect(op).toBe('==');
        expect(value).toBe(VENDOR_UID);

        return Promise.resolve({
          docs: [
            {
              id: 'req_001',
              data: () => ({
                id: 'req_001',
                projectId: PROJECT_ID,
                vendorUid: VENDOR_UID,
                status: 'PENDING',
                requestedAt: { toDate: () => new Date() },
              }),
            },
          ],
        });
      });

      const req = new NextRequest('http://localhost/api/vendor-portal/requests', {
        headers: {
          Authorization: 'Bearer valid-token',
        },
      });

      const res = await getVendorRequests(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.requests).toHaveLength(1);
      expect(json.requests[0].vendorUid).toBe(VENDOR_UID);
    });
  });
});
