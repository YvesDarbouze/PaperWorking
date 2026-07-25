import { limitRequest, trackEnumerationAttempt } from '@/lib/services/scrapingDefense';
import { getPublicListing, getSubscriberListing, searchDealByAddress, searchDealsAuthenticated } from '@/actions/listings';
import { adminDb } from '@/lib/firebase/admin';
import redis from '@/lib/redis';

// Mock Redis INCR and status
let mockRedisStore: Record<string, number> = {};
let mockRedisTtl: Record<string, number> = {};

jest.mock('@/lib/redis', () => ({
  status: 'ready',
  incr: jest.fn(async (key: string) => {
    mockRedisStore[key] = (mockRedisStore[key] || 0) + 1;
    return mockRedisStore[key];
  }),
  expire: jest.fn(async (key: string, ttl: number) => {
    mockRedisTtl[key] = ttl;
  }),
  ttl: jest.fn(async (key: string) => {
    return mockRedisTtl[key] || 60;
  }),
}));

// Mock DB
let mockListings: Record<string, any> = {};
let mockProjects: Record<string, any> = {};
let mockUsers: Record<string, any> = {};

jest.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: async (idToken: string) => {
      if (idToken === 'token_subscriber') return { uid: 'user_subscriber' };
      throw new Error('Invalid token');
    },
  },
  adminDb: {
    collection: jest.fn((colName) => ({
      doc: jest.fn((docId = 'temp_id') => ({
        id: docId,
        get: async () => {
          let data = null;
          if (colName === 'dealListings') data = mockListings[docId];
          if (colName === 'projects') data = mockProjects[docId];
          if (colName === 'users') data = mockUsers[docId];
          return {
            exists: !!data,
            data: () => data,
            id: docId,
            ref: {
              update: async () => {},
            },
          };
        },
      })),
      where: jest.fn(() => ({
        get: async () => ({ empty: true, docs: [] }),
      })),
    })),
  },
}));

// Mock next/headers
let mockIp = '192.168.1.1';
jest.mock('next/headers', () => ({
  headers: async () => ({
    get: (name: string) => {
      if (name === 'x-forwarded-for') return mockIp;
      return null;
    },
  }),
  cookies: async () => ({
    get: (name: string) => {
      if (name === 'mock_user_role') return { value: 'Investor' };
      if (name === 'mock_user_account_type') return { value: 'investor' };
      return null;
    },
  }),
}));

describe('DM-43: Scraping and Enumeration Defense', () => {
  beforeEach(() => {
    mockRedisStore = {};
    mockRedisTtl = {};
    mockIp = '192.168.1.1';
    mockListings = {
      deal_1: {
        id: 'deal_1',
        projectId: 'project_1',
        ownerUid: 'user_lead',
        propertyName: 'Sunset Heights',
        address: '100 Sunset Blvd',
        status: 'published',
        visibilityMode: 'PUBLIC_SOLICITED',
        viewCount: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    mockProjects = {
      project_1: {
        id: 'project_1',
        propertyName: 'Sunset Heights',
        status: 'acquisition',
        ownerUid: 'user_lead',
      },
    };
    mockUsers = {
      user_subscriber: {
        uid: 'user_subscriber',
        role: 'Investor',
        accountType: 'investor',
        subscriptionPlan: 'Team',
        subscriptionStatus: 'active',
      },
    };
    jest.clearAllMocks();
  });

  describe('Rate limits per IP / Principal', () => {
    it('blocks search requests after exceeding the search rate limit threshold', async () => {
      // Simulate 30 calls
      for (let i = 0; i < 30; i++) {
        const check = await limitRequest('192.168.1.1', 'search');
        expect(check.allowed).toBe(true);
      }

      // 31st call should be blocked
      const blockedCheck = await limitRequest('192.168.1.1', 'search');
      expect(blockedCheck.allowed).toBe(false);

      // Verify server action triggers rate limit exception
      await expect(searchDealByAddress('100 Sunset Blvd')).rejects.toThrow('Rate limit exceeded');
    });

    it('blocks deal read requests after exceeding the read rate limit threshold', async () => {
      // Simulate 60 calls
      for (let i = 0; i < 60; i++) {
        const check = await limitRequest('192.168.1.1', 'read');
        expect(check.allowed).toBe(true);
      }

      // 61st call should be blocked
      const blockedCheck = await limitRequest('192.168.1.1', 'read');
      expect(blockedCheck.allowed).toBe(false);

      // Verify server action triggers rate limit exception
      await expect(getPublicListing('deal_1')).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('Enumeration and scrape anomaly detection', () => {
    it('fires a console warning warning (alert) on simulated scrape enumeration threshold breach', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Simulate 9 failures
      for (let i = 0; i < 9; i++) {
        await trackEnumerationAttempt('192.168.1.1', 'user_scrapper');
        expect(warnSpy).not.toHaveBeenCalled();
      }

      // 10th failure should trigger the anomaly alert
      await trackEnumerationAttempt('192.168.1.1', 'user_scrapper');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [ANOMALY ALERT] Enumeration scrape pattern detected!')
      );

      warnSpy.mockRestore();
    });

    it('triggers enumeration tracking when querying nonexistent or private deal IDs', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Call getPublicListing with a guessable/iterative invalid ID multiple times
      for (let i = 0; i < 10; i++) {
        await getPublicListing(`guessable_id_${i}`);
      }

      // Verify that after 10 failed listing attempts, the anomaly alert is fired
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 [ANOMALY ALERT] Enumeration scrape pattern detected!')
      );

      warnSpy.mockRestore();
    });
  });
});
