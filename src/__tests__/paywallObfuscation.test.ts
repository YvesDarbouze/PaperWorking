import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { getPublishedListings, getPublicListing, getSubscriberListing, searchDealsAuthenticated, searchDealByAddress } from '@/actions/listings';
import { GET as getDocuments } from '@/app/api/projects/[id]/documents/route';
import { GET as downloadDocument } from '@/app/api/projects/[id]/documents/[docId]/download/route';
import { NextRequest } from 'next/server';

// ── Mock verifyIdToken & DB ──
var mockVerifyIdToken = jest.fn();
var mockGet = jest.fn();
var mockWhere = jest.fn();

// Mock next/headers cookies
var mockCookieStore = {
  get: jest.fn((key: string) => ({ value: 'None' } as any)),
};
jest.mock('next/headers', () => ({
  cookies: async () => mockCookieStore,
}));

// Mock requireAuth
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockImplementation(async () => {
    return {
      uid: 'user_non_subscriber',
      token: {
        uid: 'user_non_subscriber',
        email: 'nonsub@test.com',
      },
    };
  }),
  isAuthError: jest.fn().mockReturnValue(false),
}));

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn().mockImplementation(async (token: string) => {
      return mockVerifyIdToken(token);
    }),
  },
  adminDb: {
    collection: jest.fn((colName) => {
      const colChain: any = {
        doc: jest.fn((docId) => {
          const docObj: any = {
            id: docId,
            path: `${colName}/${docId}`,
            collection: jest.fn((subColName) => {
              const subColChain: any = {
                doc: jest.fn((subDocId) => {
                  const subDocObj: any = {
                    id: subDocId,
                    get: async () => {
                      const res = await mockGet(`${colName}/${docId}/${subColName}`, subDocId);
                      return {
                        exists: !!res,
                        data: () => res,
                        id: subDocId,
                      };
                    },
                  };
                  return subDocObj;
                }),
                get: async () => {
                  const res = await mockGet(`${colName}/${docId}/${subColName}`, 'all');
                  const docs = Array.isArray(res)
                    ? res.map((item, idx) => ({
                        id: item.id || `doc_${idx}`,
                        data: () => item,
                      }))
                    : [];
                  return { empty: docs.length === 0, docs };
                },
              };
              return subColChain;
            }),
            get: async () => {
              const res = await mockGet(colName, docId);
              return {
                exists: !!res,
                data: () => res,
                id: docId,
              };
            },
            set: jest.fn().mockResolvedValue(true),
            update: jest.fn().mockResolvedValue(true),
          };
          return docObj;
        }),
        where: jest.fn((field, op, val) => {
          mockWhere(colName, field, op, val);
          const queryChain: any = {
            where: jest.fn(() => queryChain),
            limit: jest.fn(() => queryChain),
            get: async () => {
              const res = await mockGet(colName, 'query_result');
              const docs = Array.isArray(res)
                ? res.map((item, idx) => ({
                    id: item.id || `doc_${idx}`,
                    data: () => item,
                    ref: { update: jest.fn().mockResolvedValue(true) },
                  }))
                : [];
              return {
                empty: docs.length === 0,
                docs,
              };
            },
          };
          return queryChain;
        }),
        get: async () => {
          const res = await mockGet(colName, 'all');
          const docs = Array.isArray(res)
            ? res.map((item, idx) => ({
                id: item.id || `doc_${idx}`,
                data: () => item,
                ref: { update: jest.fn().mockResolvedValue(true) },
              }))
            : [];
          return {
            empty: docs.length === 0,
            docs,
          };
        },
      };
      return colChain;
    }),
  },
}));

// Mock geocodeAddress
jest.mock('@/lib/providers/geocode', () => ({
  geocodeAddress: jest.fn().mockResolvedValue({ lat: 30.2672, lng: -97.7431 }),
}));

describe('DM-40: Paywall and Obfuscation (Server-Side)', () => {
  const mockListingData = {
    id: 'listing_123',
    projectId: 'project_123',
    propertyName: 'Capital Heights Premium',
    address: '123 Syndicate Way, Austin, TX 78701',
    neighborhood: 'Downtown Austin',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    assetClass: 'SFR',
    subStrategy: 'Long-Term',
    status: 'published',
    visibilityMode: 'PUBLIC_SOLICITED',
    askingPriceCents: 50000000, // $500,000
    capRate: 9.12,
    cashOnCash: 8.29,
    projectedROI: 12.5,
    documents: ['doc1.pdf', 'doc2.pdf'],
    equityTerms: {
      fundingTarget: 20000000,
      equityOfferedPct: 30,
      minTicket: 1000000,
      priceBasis: 50000000,
    },
    leadInvestor: {
      uid: 'lead_456',
      displayName: 'Marcus Aurelius',
      email: 'marcus@syndicate.com',
      phone: '512-555-0199',
    },
    followCount: 5,
    viewCount: 12,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockWhere.mockReset();
    mockVerifyIdToken.mockReset();

    // Default mock user profile: non-subscriber
    mockGet.mockImplementation((colName, key) => {
      if (colName === 'users' && key === 'user_non_subscriber') {
        return {
          uid: 'user_non_subscriber',
          role: 'Investor',
          accountType: 'investor',
          subscriptionPlan: 'None',
          subscriptionStatus: 'inactive',
        };
      }
      if (colName === 'dealListings' && key === 'listing_123') {
        return mockListingData;
      }
      if (colName === 'projects' && key === 'project_123') {
        return {
          id: 'project_123',
          propertyName: 'Capital Heights Premium',
          address: { street: '123 Syndicate Way', city: 'Austin', state: 'TX', zip: '78701' },
          financials: {
            capitalRaiseTarget: 200000,
          },
        };
      }
      if (colName === 'projectFiles' && key === 'doc_123') {
        return {
          id: 'doc_123',
          projectId: 'project_123',
          name: 'Important Pitch Deck.pdf',
        };
      }
      return null;
    });

    mockCookieStore.get.mockImplementation((key) => {
      if (key === 'mock_user_role') return { value: 'Investor' };
      if (key === 'mock_user_account_type') return { value: 'investor' };
      if (key === 'mock_user_uid') return { value: 'user_non_subscriber' };
      if (key === 'mock_user_subscription_plan') return { value: 'None' };
      return undefined;
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: 'user_non_subscriber',
      email: 'nonsub@test.com',
    });
  });

  describe('Gated Operations Block Non-Subscribers', () => {
    it('throws error for getSubscriberListing when non-subscribed', async () => {
      await expect(getSubscriberListing('mock_token', 'listing_123')).rejects.toThrow(
        /subscription/i
      );
    });

    it('throws error for searchDealsAuthenticated when non-subscribed', async () => {
      await expect(
        searchDealsAuthenticated('mock_token', '123 Syndicate Way')
      ).rejects.toThrow(/subscription/i);
    });
  });

  describe('Public Actions Only Return Obfuscated/Teaser Values', () => {
    it('returns obfuscated data from getPublicListing for anonymous/non-subscribed users', async () => {
      const teaser = await getPublicListing('listing_123');
      expect(teaser).not.toBeNull();

      // Protected/Premium values MUST be stripped or obfuscated
      expect(teaser).not.toHaveProperty('address');
      expect(teaser).not.toHaveProperty('capRate');
      expect(teaser).not.toHaveProperty('cashOnCash');
      expect(teaser).not.toHaveProperty('projectedROI');
      expect(teaser).not.toHaveProperty('askingPriceCents');
      expect(teaser).not.toHaveProperty('documents');
      expect(teaser).not.toHaveProperty('equityTerms');

      // Obfuscated ranges or approximations instead
      expect(teaser?.askingPriceApprox).toBe('~$500K');
      expect(teaser?.capRateRange).toBe('9–10%');
      expect(teaser?.cashOnCashRange).toBe('8–10%');
      expect(teaser?.projectedROIRange).toBe('10–15%');
      expect(teaser?.neighborhood).toBe('Downtown Austin');
    });

    it('returns null from getPublicListing for PRIVATE listings', async () => {
      // Mock listing as PRIVATE
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'dealListings' && key === 'listing_123') {
          return { ...mockListingData, visibilityMode: 'PRIVATE' };
        }
        return null;
      });

      const teaser = await getPublicListing('listing_123');
      expect(teaser).toBeNull();
    });

    it('returns stripped teaser from searchDealByAddress in PUBLIC_SOLICITED mode', async () => {
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'dealListings' && key === 'query_result') {
          return [mockListingData];
        }
        return null;
      });

      const result = await searchDealByAddress('123 Syndicate Way');
      expect(result.mode).toBe('public_solicited');
      if (result.mode === 'public_solicited') {
        const teaser = result.teaser;
        // Even teaser metrics are stripped here for public search
        expect(teaser).not.toHaveProperty('askingPriceApprox');
        expect(teaser).not.toHaveProperty('capRateRange');
        expect(teaser).not.toHaveProperty('cashOnCashRange');
        expect(teaser).not.toHaveProperty('projectedROIRange');
        expect(teaser.propertyName).toBe('Capital Heights Premium');
      }
    });

    it('returns exists: true and listingId without data from searchDealByAddress in MARKETPLACE mode', async () => {
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'dealListings' && key === 'query_result') {
          return [{ ...mockListingData, visibilityMode: 'MARKETPLACE' }];
        }
        return null;
      });

      const result = await searchDealByAddress('123 Syndicate Way');
      expect(result.mode).toBe('marketplace');
      if (result.mode === 'marketplace') {
        expect(result.exists).toBe(true);
        expect(result.listingId).toBe('listing_123');
        expect(result).not.toHaveProperty('teaser');
        expect(result).not.toHaveProperty('listing');
      }
    });
  });

  describe('Document Access Routes are Paywalled', () => {
    it('returns 403 Access Denied for GET /api/projects/[id]/documents for non-subscribers', async () => {
      // Mock active listing for project is PUBLIC_SOLICITED
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'users' && key === 'user_non_subscriber') {
          return { uid: 'user_non_subscriber', subscriptionPlan: 'None', subscriptionStatus: 'inactive' };
        }
        if (colName === 'dealListings' && key === 'query_result') {
          return [{ ...mockListingData, projectId: 'project_123' }];
        }
        if (colName === 'projects' && key === 'project_123') {
          return { id: 'project_123' };
        }
        return null;
      });

      const req = new NextRequest('http://localhost:3000/api/projects/project_123/documents', {
        headers: { 'authorization': 'Bearer mock_token_nonsub' }
      });
      const params = Promise.resolve({ id: 'project_123' });
      const response = await getDocuments(req, { params });
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Access denied');
    });

    it('returns 403 Access Denied for GET /api/projects/[id]/documents/[docId]/download for non-subscribers', async () => {
      // Mock active listing for project is PUBLIC_SOLICITED
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'users' && key === 'user_non_subscriber') {
          return { uid: 'user_non_subscriber', subscriptionPlan: 'None', subscriptionStatus: 'inactive' };
        }
        if (colName === 'dealListings' && key === 'query_result') {
          return [{ ...mockListingData, projectId: 'project_123' }];
        }
        if (colName === 'projects' && key === 'project_123') {
          return { id: 'project_123' };
        }
        if (colName === 'projectFiles' && key === 'doc_123') {
          return { id: 'doc_123', projectId: 'project_123', name: 'Important Pitch Deck.pdf' };
        }
        return null;
      });

      const req = new NextRequest('http://localhost:3000/api/projects/project_123/documents/doc_123/download', {
        headers: { 'authorization': 'Bearer mock_token_nonsub' }
      });
      const params = Promise.resolve({ id: 'project_123', docId: 'doc_123' });
      const response = await downloadDocument(req, { params });
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Access denied');
    });
  });
});
