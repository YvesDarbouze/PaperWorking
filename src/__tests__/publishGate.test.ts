// Mock the admin auth and admin db
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockRunTransaction = jest.fn();

jest.mock('@/lib/firebase/admin', () => {
  return {
    adminAuth: {
      verifyIdToken: (...args: any[]) => mockVerifyIdToken(...args),
    },
    adminDb: {
      collection: jest.fn((colName) => ({
        doc: jest.fn((docId) => {
          const docRef = {
            id: docId,
            path: `${colName}/${docId}`,
            update: (payload: any) => mockUpdate(docRef, payload),
            collection: jest.fn((subCol) => ({
              get: jest.fn().mockResolvedValue({
                docs: [],
                forEach: (cb: any) => [].forEach(cb),
              }),
              add: jest.fn().mockResolvedValue({ id: 'new-id' }),
            })),
          };
          return {
            id: docId,
            path: `${colName}/${docId}`,
            get: async () => {
              const res = await mockGet(colName, docId);
              return {
                exists: res ? res.exists : false,
                data: res ? res.data : () => undefined,
                ref: docRef,
              };
            },
            set: (...args: any[]) => mockSet(colName, docId, ...args),
            update: (payload: any) => mockUpdate(docRef, payload),
            collection: docRef.collection,
          };
        }),
        where: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        })),
      })),
      batch: jest.fn(() => ({
        update: (ref: any, payload: any) => mockUpdate(ref, payload),
        commit: jest.fn().mockResolvedValue(true),
      })),
      runTransaction: (...args: any[]) => mockRunTransaction(...args),
    },
  };
});

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(() => null),
  })),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    arrayUnion: jest.fn((val) => [val]),
    delete: jest.fn(() => 'DELETE_SENTINEL'),
    serverTimestamp: jest.fn(() => new Date()),
    increment: jest.fn((n) => n),
  },
}));

jest.mock('@/lib/services/notificationService', () => ({
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue('notif_123'),
    broadcastProjectNotification: jest.fn().mockResolvedValue(true),
    buildNotificationContent: jest.fn().mockReturnValue({ title: 'Title', body: 'Body' }),
  },
}));

jest.mock('@/lib/providers/geocode', () => ({
  geocodeAddress: jest.fn().mockResolvedValue({ lat: 40.7128, lng: -74.0060 }),
}));

import { adminDb } from '@/lib/firebase/admin';
import {
  publishListing,
  changeVisibilityMode,
  acknowledgeDisclosure,
  updateControlStatus,
  getSubscriberListing,
} from '@/actions/listings';
import { evaluatePublishGate } from '@/lib/deals/publishGate';
import type { Project } from '@/types/schema';
import type { DealListing, VisibilityMode } from '@/types/listing';

describe('DM-21: Publish Gate', () => {
  let projectMock: Project;
  let listingMock: Partial<DealListing>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_lead_investor_seed' });

    // Mock project document that passes all criteria
    projectMock = {
      id: 'proj_123',
      organizationId: 'org_123',
      propertyName: 'Clean Deal',
      address: '123 Main St',
      status: 'acquisition',
      dispositionType: 'SALE',
      rehabTier: 'RENOVATE',
      controlStatus: 'under-contract',
      equityTerms: {
        funding_target: 100000,
        min_ticket: 10000,
      },
      financials: {
        purchasePrice: 200000,
        grossRent: 2000,
        vacancy_pct: 5,
        tax: 150,
        insurance: 80,
        utilities: 50,
        management_pct: 8,
        maintenance: 100,
      },
    } as any;

    // Mock listing that passes all criteria
    listingMock = {
      id: 'listing_123',
      projectId: 'proj_123',
      ownerUid: 'user_lead_investor_seed',
      status: 'draft',
      visibilityMode: 'MARKETPLACE',
      disclosureAcknowledgedForMode: 'MARKETPLACE',
    };
  });

  describe('evaluatePublishGate (Pure Function)', () => {
    it('passes when all criteria are fully met', () => {
      const result = evaluatePublishGate(projectMock, listingMock, 'MARKETPLACE');
      expect(result.passed).toBe(true);
      expect(result.criteria).toHaveLength(4);
      expect(result.criteria.every((c) => c.status)).toBe(true);
    });

    it('blocks control status set if controlStatus is missing or invalid', () => {
      projectMock.controlStatus = 'none';
      const result = evaluatePublishGate(projectMock, listingMock, 'MARKETPLACE');
      expect(result.passed).toBe(false);
      const crit = result.criteria.find((c) => c.key === 'control_status_set');
      expect(crit?.status).toBe(false);
      expect(crit?.isRed).toBe(true);
    });

    it('blocks required inputs complete if purchase price is missing', () => {
      projectMock.financials!.purchasePrice = 0;
      const result = evaluatePublishGate(projectMock, listingMock, 'MARKETPLACE');
      expect(result.passed).toBe(false);
      const crit = result.criteria.find((c) => c.key === 'underwriting_inputs_complete');
      expect(crit?.status).toBe(false);
      expect(crit?.detail).toContain('Purchase Price');
    });

    it('blocks disclosure acknowledged if mode is not acknowledged', () => {
      listingMock.disclosureAcknowledgedForMode = 'PRIVATE';
      const result = evaluatePublishGate(projectMock, listingMock, 'MARKETPLACE');
      expect(result.passed).toBe(false);
      const crit = result.criteria.find((c) => c.key === 'disclosure_acknowledged');
      expect(crit?.status).toBe(false);
    });

    it('blocks scope tier and disposition type if scope tier is missing', () => {
      delete projectMock.rehabTier;
      const result = evaluatePublishGate(projectMock, listingMock, 'MARKETPLACE');
      expect(result.passed).toBe(false);
      const crit = result.criteria.find((c) => c.key === 'scope_tier_and_strategy_set');
      expect(crit?.status).toBe(false);
    });
  });

  describe('publishListing Server Action', () => {
    it('succeeds publishing when all gate criteria pass', async () => {
      mockGet.mockImplementation((colName, id) => {
        if (colName === 'users') {
          return { exists: true, data: () => ({ role: 'Lead Investor', uid: 'user_lead_investor_seed' }) };
        }
        if (colName === 'dealListings') {
          return { exists: true, data: () => listingMock };
        }
        if (colName === 'projects') {
          return { exists: true, data: () => projectMock };
        }
        return { exists: false };
      });

      const result = await publishListing('mock_token', 'listing_123');
      expect(result.success).toBe(true);

      // Verify that publishGateResult is stored with passed: true
      const calls = mockUpdate.mock.calls.filter((c) => c[0].path === 'dealListings/listing_123');
      expect(calls.length).toBeGreaterThan(0);
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1].status).toBe('published');
      expect(lastCall[1].publishGateResult.passed).toBe(true);
    });

    it('fails publishing and blocks when gate criteria fail and no override reason is provided', async () => {
      // Cause a failure: control status missing
      projectMock.controlStatus = 'none';

      mockGet.mockImplementation((colName, id) => {
        if (colName === 'users') {
          return { exists: true, data: () => ({ role: 'Lead Investor', uid: 'user_lead_investor_seed' }) };
        }
        if (colName === 'dealListings') {
          return { exists: true, data: () => listingMock };
        }
        if (colName === 'projects') {
          return { exists: true, data: () => projectMock };
        }
        return { exists: false };
      });

      await expect(publishListing('mock_token', 'listing_123')).rejects.toThrow(
        'Publish gate blocked:'
      );
    });

    it('succeeds publishing with override reason when gate criteria fail', async () => {
      // Cause a failure
      projectMock.controlStatus = 'none';

      mockGet.mockImplementation((colName, id) => {
        if (colName === 'users') {
          return { exists: true, data: () => ({ role: 'Lead Investor', uid: 'user_lead_investor_seed' }) };
        }
        if (colName === 'dealListings') {
          return { exists: true, data: () => listingMock };
        }
        if (colName === 'projects') {
          return { exists: true, data: () => projectMock };
        }
        return { exists: false };
      });

      const result = await publishListing('mock_token', 'listing_123', 'LeadInvestor has option contract closing next week.');
      expect(result.success).toBe(true);

      // Verify that publishGateResult is stored with override reason
      const calls = mockUpdate.mock.calls.filter((c) => c[0].path === 'dealListings/listing_123');
      expect(calls.length).toBeGreaterThan(0);
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1].publishGateResult.passed).toBe(false);
      expect(lastCall[1].publishGateResult.overrideReason).toBe('LeadInvestor has option contract closing next week.');
    });
  });

  describe('changeVisibilityMode Server Action Gating', () => {
    it('gates visibility mode change when published listing is loosened and criteria fail', async () => {
      // Currently published, target mode is loosened (MARKETPLACE), gate criteria fail (no control status)
      listingMock.status = 'published';
      listingMock.visibilityMode = 'PRIVATE';
      projectMock.controlStatus = 'none';

      mockGet.mockImplementation((colName, id) => {
        if (colName === 'users') {
          return { exists: true, data: () => ({ role: 'Lead Investor', uid: 'user_lead_investor_seed' }) };
        }
        if (colName === 'dealListings') {
          return { exists: true, data: () => listingMock };
        }
        if (colName === 'projects') {
          return { exists: true, data: () => projectMock };
        }
        return { exists: false };
      });

      await expect(
        changeVisibilityMode('mock_token', 'listing_123', 'MARKETPLACE')
      ).rejects.toThrow('Publish gate blocked:');
    });

    it('allows visibility mode change when published listing is loosened with an override reason', async () => {
      listingMock.status = 'published';
      listingMock.visibilityMode = 'PRIVATE';
      projectMock.controlStatus = 'none';

      mockGet.mockImplementation((colName, id) => {
        if (colName === 'users') {
          return { exists: true, data: () => ({ role: 'Lead Investor', uid: 'user_lead_investor_seed' }) };
        }
        if (colName === 'dealListings') {
          return { exists: true, data: () => listingMock };
        }
        if (colName === 'projects') {
          return { exists: true, data: () => projectMock };
        }
        return { exists: false };
      });

      const result = await changeVisibilityMode(
        'mock_token',
        'listing_123',
        'MARKETPLACE',
        'Closing next week'
      );
      expect(result.success).toBe(true);

      const calls = mockUpdate.mock.calls.filter((c) => c[0].path === 'dealListings/listing_123');
      expect(calls.length).toBeGreaterThan(0);
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1].publishGateResult.overrideReason).toBe('Closing next week');
    });
  });

  describe('DM-22: Visibility Mode Selection & Gating', () => {
    const expectedAck = "I acknowledge that Public Solicited mode is irreversible and complies with public offering requirements.";

    beforeEach(() => {
      // Mock verifyIdToken for owner/coworker/stranger
      mockVerifyIdToken.mockImplementation(async (token) => {
        if (token === 'coworker_token') return { uid: 'coworker_456' };
        if (token === 'stranger_token') return { uid: 'stranger_789' };
        return { uid: 'user_lead_investor_seed' };
      });

      // Setup successful auth & details by default
      mockGet.mockImplementation((colName, id) => {
        if (colName === 'users') {
          return {
            exists: true,
            data: () => ({
              uid: id === 'coworker_456' ? 'coworker_456' : id === 'stranger_789' ? 'stranger_789' : 'user_lead_investor_seed',
              role: 'Lead Investor',
              accountType: 'subscriber',
              subscriptionPlan: 'Enterprise Plan',
              subscriptionStatus: 'active',
              organizationId: id === 'stranger_789' ? 'org_different' : 'org_123',
            }),
          };
        }
        if (colName === 'dealListings') {
          return { exists: true, data: () => listingMock };
        }
        if (colName === 'projects') {
          return { exists: true, data: () => projectMock };
        }
        return { exists: false };
      });
    });

    it('requires typed acknowledgment when publishing under PUBLIC_SOLICITED mode', async () => {
      listingMock.visibilityMode = 'PUBLIC_SOLICITED';
      listingMock.disclosureAcknowledgedForMode = 'PUBLIC_SOLICITED';

      // Silent/empty acknowledgment fails
      await expect(
        publishListing('owner_token', 'listing_123')
      ).rejects.toThrow('Typed acknowledgment is required for Public Solicited mode.');

      // Correct acknowledgment succeeds
      const result = await publishListing('owner_token', 'listing_123', undefined, expectedAck);
      expect(result.success).toBe(true);

      const calls = mockUpdate.mock.calls.filter((c) => c[0].path === 'dealListings/listing_123');
      const lastCall = calls[calls.length - 1];
      expect(lastCall[1].publicSolicitationAcknowledgment).toBe(expectedAck);
    });

    it('requires typed acknowledgment when changing visibility mode to PUBLIC_SOLICITED', async () => {
      // Failed acknowledgment throws error
      await expect(
        changeVisibilityMode('owner_token', 'listing_123', 'PUBLIC_SOLICITED', undefined, 'Wrong text')
      ).rejects.toThrow('Typed acknowledgment is required for Public Solicited mode.');

      // Correct acknowledgment succeeds
      const result = await changeVisibilityMode('owner_token', 'listing_123', 'PUBLIC_SOLICITED', undefined, expectedAck);
      expect(result.success).toBe(true);
    });

    it('blocks attempting to revert/loosen PUBLIC_SOLICITED mode once set', async () => {
      listingMock.visibilityMode = 'PUBLIC_SOLICITED';

      await expect(
        changeVisibilityMode('owner_token', 'listing_123', 'PRIVATE')
      ).rejects.toThrow('PUBLIC_SOLICITED is irreversible');
    });

    it('gates getSubscriberListing to block access to PRIVATE listings for unauthorized users', async () => {
      listingMock.visibilityMode = 'PRIVATE';

      // 1. Authorized as listing owner
      const resOwner = await getSubscriberListing('owner_token', 'listing_123');
      expect(resOwner.listing.id).toBe('listing_123');

      // 2. Authorized as coworker (organizationId matches)
      const resTeammate = await getSubscriberListing('coworker_token', 'listing_123');
      expect(resTeammate.listing.id).toBe('listing_123');

      // 3. Unauthorized external user
      await expect(
        getSubscriberListing('stranger_token', 'listing_123')
      ).rejects.toThrow('Access denied: this listing is private.');
    });
  });

  describe('DM-23: Edit, Recompute, Republish', () => {
    let projectMock: Project;
    let listingMock: Partial<DealListing>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockVerifyIdToken.mockResolvedValue({ uid: 'user_lead_investor_seed' });

      projectMock = {
        id: 'proj_123',
        organizationId: 'org_123',
        activeListingId: 'listing_123',
        propertyName: 'Clean Deal',
        address: '123 Main St',
        rehabTier: 'RENOVATE',
        controlStatus: 'under-contract',
        financials: {
          purchasePrice: 200000,
          capitalPlan: 'raise interest',
          equityTerms: {
            funding_target: 100000,
          },
        },
      } as any;

      listingMock = {
        id: 'listing_123',
        projectId: 'proj_123',
        status: 'published',
        visibilityMode: 'PRIVATE',
        version: 1,
        askingPriceCents: 200000,
        propertyName: 'Clean Deal',
        address: '123 Main St',
        transitionLog: [],
        versions: [],
      };

      // Mock transaction calls
      mockRunTransaction.mockImplementation(async (cb: any) => {
        return cb({
          get: async (ref: any) => {
            if (ref.path === 'projects/proj_123') {
              return { exists: true, data: () => projectMock };
            }
            if (ref.path === 'dealListings/listing_123') {
              return { exists: true, data: () => listingMock };
            }
            if (ref.path === 'organizations/org_123') {
              return { exists: true, data: () => ({ teamMembers: [{ id: 'user_lead_investor_seed', status: 'active', role: 'Lead Investor' }] }) };
            }
            return { exists: false };
          },
          update: mockUpdate,
        });
      });

      mockGet.mockImplementation((colName, id) => {
        if (colName === 'users') {
          return {
            exists: true,
            data: () => ({
              uid: 'user_lead_investor_seed',
              role: 'Lead Investor',
              organizationId: 'org_123',
            }),
          };
        }
        if (colName === 'dealListings') {
          return { exists: true, data: () => listingMock };
        }
        if (colName === 'projects') {
          return { exists: true, data: () => projectMock };
        }
        return { exists: false };
      });
    });

    it('automatically reopens a published listing to draft status on material price change', async () => {
      const { PATCH } = await import('@/app/api/projects/[id]/route');
      const { NextRequest } = await import('next/server');

      const req = new NextRequest('http://localhost/api/projects/proj_123', {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer owner_token',
        },
        body: JSON.stringify({
          financials: {
            purchasePrice: 250000, // Material Change!
          },
        }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: 'proj_123' }) });
      expect(response.status).toBe(200);

      const listingUpdateCall = mockUpdate.mock.calls.find(c => c[0].path === 'dealListings/listing_123');
      expect(listingUpdateCall).toBeDefined();
      const updatePayload = listingUpdateCall[1];
      expect(updatePayload.status).toBe('draft');
      expect(updatePayload.version).toBe(2);
      expect(updatePayload.versions).toBeDefined();
      expect(updatePayload.versions[0].snapshot.askingPriceCents).toBe(200000);
    });

    it('does not reopen listing to draft on non-material changes', async () => {
      const { PATCH } = await import('@/app/api/projects/[id]/route');
      const { NextRequest } = await import('next/server');

      const req = new NextRequest('http://localhost/api/projects/proj_123', {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer owner_token',
        },
        body: JSON.stringify({
          financials: {
            loanTermYears: 15, // Non-Material!
          },
        }),
      });

      const response = await PATCH(req, { params: Promise.resolve({ id: 'proj_123' }) });
      expect(response.status).toBe(200);

      const listingUpdateCall = mockUpdate.mock.calls.find(c => c[0].path === 'dealListings/listing_123');
      expect(listingUpdateCall).toBeUndefined(); // Listing should NOT have been updated in transaction to reopen
    });
  });
});
