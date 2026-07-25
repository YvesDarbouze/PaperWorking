import { inviteSubscribers, getDealInvitations } from '@/actions/dealInvitations';
import { getSubscriberListing } from '@/actions/listings';
import { adminDb } from '@/lib/firebase/admin';

var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockRunTransaction = jest.fn();
var mockBatchSet = jest.fn();
var mockBatchCommit = jest.fn().mockResolvedValue(true);

var mockUserData = { role: 'Subscriber', email: 'test@subscriber.com' };
var mockListingData = { id: 'listing_123', status: 'published', visibilityMode: 'PRIVATE', version: 1 };

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
            collection: jest.fn((subCol) => {
              const chain: any = {
                doc: jest.fn((subDocId) => ({
                  id: subDocId,
                  path: `${colName}/${docId}/${subCol}/${subDocId}`,
                  set: (...args: any[]) => mockSet(`${colName}/${docId}/${subCol}`, subDocId, ...args),
                  update: (payload: any) => mockUpdate(subDocId, payload),
                })),
                where: jest.fn(() => chain),
                limit: jest.fn(() => chain),
                get: jest.fn().mockImplementation(() => {
                  return {
                    empty: true,
                    docs: [],
                    size: 0,
                    forEach: (cb: any) => [].forEach(cb),
                  };
                }),
                add: jest.fn().mockResolvedValue({ id: 'new-id' }),
              };
              return chain;
            }),
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
        where: jest.fn(() => {
          const chain: any = {
            limit: jest.fn(() => chain),
            where: jest.fn(() => chain),
            get: jest.fn().mockImplementation(() => {
              if (colName === 'users') {
                return {
                  empty: false,
                  docs: [{ id: 'user_123', data: () => mockUserData }],
                };
              }
              if (colName === 'dealListings') {
                return {
                  empty: false,
                  docs: [{ id: 'listing_123', data: () => mockListingData }],
                };
              }
              if (colName === 'dealInvitations') {
                return {
                  empty: false,
                  docs: [{
                    ref: { update: mockUpdate },
                    data: () => ({
                      id: 'invite_123',
                      projectId: 'proj_123',
                      status: 'sent',
                      inviteeEmail: 'marcus@apexcapital.io',
                    }),
                  }],
                };
              }
              return { empty: true, docs: [], size: 0 };
            }),
          };
          return chain;
        }),
      })),
      batch: jest.fn(() => ({
        set: (...args: any[]) => mockBatchSet(...args),
        update: (ref: any, payload: any) => mockUpdate(ref, payload),
        commit: () => mockBatchCommit(),
      })),
      runTransaction: (...args: any[]) => mockRunTransaction(...args),
    },
  };
});

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn((name) => {
      if (name === 'mock_user_role') return { value: 'Lead Investor' };
      if (name === 'mock_user_email') return { value: 'marcus@apexcapital.io' };
      return null;
    }),
  })),
}));

jest.mock('@/lib/firebase/activityLogWriter', () => ({
  writeActivityLog: jest.fn().mockResolvedValue(true),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    arrayUnion: jest.fn((val) => [val]),
    delete: jest.fn(() => 'DELETE_SENTINEL'),
    serverTimestamp: jest.fn(() => new Date()),
    increment: jest.fn((n) => n),
  },
}));

describe('DM-24: In-platform invite composer', () => {
  let projectMock: any;
  let listingMock: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken.mockResolvedValue({ uid: 'user_lead_investor_seed' });

    mockUserData = { role: 'Subscriber', email: 'test@subscriber.com' };
    mockListingData = { id: 'listing_123', status: 'published', visibilityMode: 'PRIVATE', version: 1 };

    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockImplementation(() => Promise.resolve({
      get: jest.fn((name) => {
        if (name === 'mock_user_role') return { value: 'Lead Investor' };
        if (name === 'mock_user_email') return { value: 'marcus@apexcapital.io' };
        return null;
      }),
    }));

    projectMock = {
      id: 'proj_123',
      organizationId: 'org_123',
      ownerUid: 'user_lead_investor_seed',
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
    };

    listingMock = {
      id: 'listing_123',
      projectId: 'proj_123',
      ownerUid: 'user_lead_investor_seed',
      organizationId: 'org_123',
      status: 'published',
      visibilityMode: 'PRIVATE',
      version: 1,
      askingPriceCents: 200000,
      propertyName: 'Clean Deal',
      address: '123 Main St',
    };

    mockGet.mockImplementation((colName, id) => {
      if (colName === 'projects') return { exists: true, data: () => projectMock };
      if (colName === 'dealListings') return { exists: true, data: () => listingMock };
      return null;
    });
  });

  it('fails if the deal listing is not published', async () => {
    mockListingData.status = 'draft';
    listingMock.status = 'draft';
    await expect(
      inviteSubscribers('mock_token', 'proj_123', [{ email: 'test@sub.com' }])
    ).rejects.toThrow('Cannot send invitations for an unpublished Deal.');
  });

  it('fails if bulk count is greater than 20', async () => {
    const list = Array.from({ length: 21 }, (_, i) => ({ email: `test${i}@sub.com` }));
    await expect(
      inviteSubscribers('mock_token', 'proj_123', list)
    ).rejects.toThrow('Bulk invitation is capped at 20 recipients per submission.');
  });

  it('fails if target user is a Vendor (G-9)', async () => {
    mockUserData.role = 'Vendor';
    mockUserData.email = 'vendor@example.com';

    await expect(
      inviteSubscribers('mock_token', 'proj_123', [{ email: 'vendor@example.com' }])
    ).rejects.toThrow('A Vendor (vendor@example.com) cannot be invited to a Deal listing.');
  });

  it('successfully creates invitations and writes to dealLedger & activityLog', async () => {
    const result = await inviteSubscribers('mock_token', 'proj_123', [
      { email: 'investor1@example.com', name: 'Investor One' }
    ], 'Welcome to Apex Capital!');

    expect(result.success).toBe(true);
    expect(result.invitedCount).toBe(1);

    expect(mockBatchSet).toHaveBeenCalledTimes(2);
  });

  it('automatically transitions sent invitation to opened status on private listing retrieve', async () => {
    const { cookies } = require('next/headers');
    (cookies as jest.Mock).mockImplementation(() => Promise.resolve({
      get: jest.fn((name) => {
        if (name === 'mock_user_uid') return { value: 'subscriber_user_id' };
        if (name === 'mock_user_role') return { value: 'Subscriber' };
        if (name === 'mock_user_email') return { value: 'marcus@apexcapital.io' };
        return null;
      }),
    }));

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
            return { exists: true, data: () => ({ teamMembers: [] }) };
          }
          return { exists: false };
        },
        update: mockUpdate,
      });
    });



    const res = await getSubscriberListing('mock_token', 'listing_123');
    expect(res).toBeDefined();

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'opened',
        openedAt: expect.any(String),
      })
    );
  });
});
