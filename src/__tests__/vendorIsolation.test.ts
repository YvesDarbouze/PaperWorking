import { adminDb } from '@/lib/firebase/admin';
import { getPublishedListings, getPublicListing, getSubscriberListing } from '@/actions/listings';
import { GET as getProjectTimeline } from '@/app/api/projects/[id]/timeline/route';
import { GET as getInvestorTimeline } from '@/app/api/investor/timeline/route';
import { GET as getInvitation } from '@/app/api/invitations/[token]/route';
import { POST as postIndication, DELETE as deleteIndication } from '@/app/api/invitations/[token]/indication/route';
import { POST as postSubscribe } from '@/app/api/invitations/[token]/subscribe/route';
import { NotificationService } from '@/lib/services/notificationService';
import { NextRequest } from 'next/server';

// Mock verifyIdToken
const mockVerifyIdToken = jest.fn();
const mockGet = jest.fn();

// Mock next/headers cookies
const mockCookieStore = {
  get: jest.fn((key: string) => ({ value: 'Vendor' } as any)),
};
jest.mock('next/headers', () => ({
  cookies: async () => mockCookieStore,
}));

// Mock requireAuth
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockImplementation(async () => {
    return {
      uid: 'vendor_123',
      token: {
        uid: 'vendor_123',
        email: 'vendor@test.com',
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
        where: jest.fn(() => {
          const queryChain: any = {
            limit: jest.fn(() => queryChain),
            get: async () => {
              const res = await mockGet(colName, 'query');
              const docs = (res || []).map((docData: any) => ({
                id: docData.id || 'mock-doc-id',
                data: () => docData,
              }));
              return {
                empty: docs.length === 0,
                docs,
              };
            },
          };
          return queryChain;
        }),
      };
      return colChain;
    }),
  },
}));

describe('DM-39: Vendor Isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
    mockVerifyIdToken.mockReset();
    mockVerifyIdToken.mockResolvedValue({
      uid: 'vendor_123',
      email: 'vendor@test.com',
    });

    // Default mock user cookies to Vendor
    mockCookieStore.get.mockImplementation((key: string) => {
      if (key === 'mock_user_role') return { value: 'Vendor' };
      if (key === 'mock_user_account_type') return { value: 'vendor' };
      if (key === 'mock_user_uid') return { value: 'vendor_123' };
      if (key === 'mock_user_email') return { value: 'vendor@test.com' };
      return undefined;
    });

    // Default db lookup for user resolves as Vendor
    mockGet.mockImplementation((colName, key) => {
      if (colName === 'users' && key === 'vendor_123') {
        return {
          uid: 'vendor_123',
          role: 'Vendor',
          accountType: 'vendor',
        };
      }
      return null;
    });
  });

  it('guarantees getPublishedListings throws Not Found error for Vendor principals', async () => {
    await expect(getPublishedListings()).rejects.toThrow('Not Found');
  });

  it('guarantees getPublicListing throws Not Found error for Vendor principals', async () => {
    await expect(getPublicListing('listing_123')).rejects.toThrow('Not Found');
  });

  it('guarantees getSubscriberListing throws Not Found error for Vendor principals', async () => {
    await expect(getSubscriberListing('mock_token', 'listing_123')).rejects.toThrow('Not Found');
  });

  it('ensures GET /api/projects/[id]/timeline returns 404 for Vendor principals', async () => {
    const req = new NextRequest('http://localhost:3000/api/projects/project_123/timeline');
    const params = Promise.resolve({ id: 'project_123' });
    const response = await getProjectTimeline(req, { params });
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Not Found');
  });

  it('ensures GET /api/investor/timeline returns 404 for Vendor principals', async () => {
    const req = new NextRequest('http://localhost:3000/api/investor/timeline');
    const response = await getInvestorTimeline(req);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Not Found');
  });

  it('ensures GET /api/invitations/[token] returns 404 for Vendor principals', async () => {
    const req = new NextRequest('http://localhost:3000/api/invitations/token_123', {
      headers: { 'authorization': 'Bearer mock_token_vendor' }
    });
    const params = Promise.resolve({ token: 'token_1234567890123456' });
    const response = await getInvitation(req, { params });
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Not Found');
  });

  it('ensures POST /api/invitations/[token]/indication returns 404 for Vendor principals', async () => {
    const req = new NextRequest('http://localhost:3000/api/invitations/token_123/indication', {
      method: 'POST',
      body: JSON.stringify({ type: 'amount', value: 1000, currency: 'USD' }),
      headers: { 'authorization': 'Bearer mock_token_vendor' }
    });
    const params = Promise.resolve({ token: 'token_1234567890123456' });
    const response = await postIndication(req, { params });
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Not Found');
  });

  it('ensures DELETE /api/invitations/[token]/indication returns 404 for Vendor principals', async () => {
    const req = new NextRequest('http://localhost:3000/api/invitations/token_123/indication', {
      method: 'DELETE',
      headers: { 'authorization': 'Bearer mock_token_vendor' }
    });
    const params = Promise.resolve({ token: 'token_1234567890123456' });
    const response = await deleteIndication(req, { params });
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Not Found');
  });

  it('ensures POST /api/invitations/[token]/subscribe returns 404 for Vendor principals', async () => {
    const req = new NextRequest('http://localhost:3000/api/invitations/token_123/subscribe', {
      method: 'POST',
      body: JSON.stringify({ name: 'Vendor User', email: 'vendor@test.com' }),
      headers: { 'authorization': 'Bearer mock_token_vendor' }
    });
    const params = Promise.resolve({ token: 'token_1234567890123456' });
    const response = await postSubscribe(req, { params });
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Not Found');
  });

  it('guarantees deal-related notifications are suppressed for Vendor accounts', async () => {
    const service = NotificationService;
    const result = await service.createNotification({
      recipientId: 'vendor_123',
      type: 'INVEST_INVITE',
      actor: { uid: 'investor_456', name: 'Marcus' },
      objectReference: { dealAddress: '123 Syndicate Way', projectId: 'project_123' },
      deepLinkUrl: '/dashboard/deals/listing_123',
    });

    expect(result).toContain('skipped_vendor_block_');
  });
});
