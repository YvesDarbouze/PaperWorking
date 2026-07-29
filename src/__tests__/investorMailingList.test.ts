import { inviteSubscribers } from '@/actions/dealInvitations';

var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockSet = jest.fn().mockResolvedValue(true);
var mockUpdate = jest.fn().mockResolvedValue(true);
var mockDelete = jest.fn().mockResolvedValue(true);

jest.mock('next/headers', () => ({
  cookies: async () => ({
    get: (key: string) => {
      if (key === 'mock_user_role') return { value: 'Lead Investor' };
      if (key === 'mock_user_uid') return { value: 'lead_investor_123' };
      if (key === 'mock_user_email') return { value: 'sponsor@test.com' };
      if (key === 'mock_user_org_id') return { value: 'org_123' };
      return undefined;
    },
  }),
}));

jest.mock('@/lib/invitations/abuseCheckers', () => ({
  checkUserInvitationSuspended: jest.fn(async () => {}),
  checkInvitationRateLimits: jest.fn(async () => {}),
  detectPurchasedListPattern: jest.fn(async () => ({ isSuspicious: false, strangersCount: 0, ratio: 0 })),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockImplementation(async (token: string) => {
      return mockVerifyIdToken(token);
    }),
  },
  adminDb: {
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn().mockResolvedValue(true),
    })),
    collection: jest.fn((colName) => {
      const colChain: any = {
        doc: jest.fn((docId) => {
          const docRef = {
            id: docId,
            path: `${colName}/${docId}`,
            update: (payload: any) => mockUpdate(docRef, payload),
            delete: () => mockDelete(docRef),
            set: (payload: any) => mockSet(docRef, payload),
          };
          
          const docObj: any = {
            id: docId,
            path: `${colName}/${docId}`,
            get: async () => {
              const res = await mockGet(colName, docId);
              return {
                exists: !!res,
                data: () => res,
                ref: docRef,
              };
            },
            set: (payload: any) => mockSet(docRef, payload),
            update: (payload: any) => mockUpdate(docRef, payload),
          };

          docObj.collection = jest.fn((subColName) => {
            const subColChain: any = {
              doc: jest.fn((subDocId) => {
                const subDocRef = {
                  id: subDocId,
                  path: `${colName}/${docId}/${subColName}/${subDocId}`,
                  update: (payload: any) => mockUpdate(subDocRef, payload),
                  delete: () => mockDelete(subDocRef),
                  set: (payload: any) => mockSet(subDocRef, payload),
                };
                return {
                  id: subDocId,
                  path: `${colName}/${docId}/${subColName}/${subDocId}`,
                  get: async () => {
                    const res = await mockGet(`${colName}_${subColName}`, subDocId);
                    return {
                      exists: !!res,
                      data: () => res,
                      ref: subDocRef,
                    };
                  },
                  set: (payload: any) => mockSet(subDocRef, payload),
                  update: (payload: any) => mockUpdate(subDocRef, payload),
                };
              }),
              where: jest.fn((field, op, val) => {
                const chain: any = {
                  limit: jest.fn(() => chain),
                  get: async () => {
                    const res = await mockGet(`${colName}_${subColName}`, `query_${field}_${op}_${val}`);
                    const docs = (res || []).map((docData: any) => ({
                      id: docData.id || 'mock-doc-id',
                      ref: {
                        update: (payload: any) => mockUpdate({ id: docData.id || 'mock-doc-id' }, payload),
                      },
                      data: () => docData,
                    }));
                    return {
                      empty: docs.length === 0,
                      docs,
                    };
                  },
                };
                return chain;
              }),
            };
            return subColChain;
          });

          return docObj;
        }),
        where: jest.fn((field, op, val) => {
          const chain: any = {
            limit: jest.fn(() => chain),
            get: async () => {
              const res = await mockGet(colName, `query_${field}_${op}_${val}`);
              const docs = (res || []).map((docData: any) => ({
                id: docData.id || 'mock-doc-id',
                ref: {
                  update: (payload: any) => mockUpdate({ id: docData.id || 'mock-doc-id' }, payload),
                },
                data: () => docData,
              }));
              return {
                empty: docs.length === 0,
                docs,
              };
            },
          };
          return chain;
        }),
      };
      return colChain;
    }),
  },
}));

describe('DM-37: Investor Mailing List', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
    mockVerifyIdToken.mockReset();
  });

  it('guarantees global unsubscribe blocks invitations sent by a second Lead Investor', async () => {
    // Mock verifyActionAuth token response
    mockVerifyIdToken.mockResolvedValue({ uid: 'lead_investor_123' });

    // Mock project data, list status, and global unsubscribe state
    mockGet.mockImplementation((colName, key) => {
      if (colName === 'projects' && key === 'project_123') {
        return { ownerUid: 'lead_investor_123', organizationId: 'org_123' };
      }
      if (colName === 'dealListings') {
        return [{ id: 'listing_123', projectId: 'project_123', status: 'published', visibilityMode: 'PUBLIC_SOLICITED' }];
      }
      if (colName === 'unsubscribedEmails' && key === 'lp@test.com') {
        return { email: 'lp@test.com', unsubscribedAt: '2026-07-23' };
      }
      return null;
    });

    // Attempting to invite this contact throws a global unsubscribe block error
    await expect(
      inviteSubscribers('mock_token', 'project_123', [{ email: 'lp@test.com' }])
    ).rejects.toThrow('opted out of platform invitations');
  });

  it('honors local unsubscribe (emailConsent = false) and blocks invitations', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'lead_investor_123' });

    mockGet.mockImplementation((colName, key) => {
      if (colName === 'projects' && key === 'project_123') {
        return { ownerUid: 'lead_investor_123', organizationId: 'org_123' };
      }
      if (colName === 'dealListings') {
        return [{ id: 'listing_123', projectId: 'project_123', status: 'published', visibilityMode: 'PUBLIC_SOLICITED' }];
      }
      if (colName === 'unsubscribedEmails' && key === 'lp@test.com') {
        return null; // Not globally unsubscribed
      }
      if (colName === 'users' && key === 'query_email_==_lp@test.com') {
        return []; // No registered account
      }
      if (colName === 'projects_investor_contacts') {
        // Return local opted-out contact
        return [{ id: 'contact_lp', email: 'lp@test.com', emailConsent: false, source: 'manual' }];
      }
      return null;
    });

    // Attempting to invite this locally opted-out contact throws a block error
    await expect(
      inviteSubscribers('mock_token', 'project_123', [{ email: 'lp@test.com' }])
    ).rejects.toThrow('opted out of communications from this sender');
  });
});
