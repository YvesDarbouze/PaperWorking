// Mock the admin auth and admin db
const mockDocVal: any = {
  get: jest.fn(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockCollectionVal: any = {
  doc: jest.fn(() => mockDocVal),
  where: jest.fn(() => mockCollectionVal),
  get: jest.fn(),
  add: jest.fn(),
};

jest.mock('@/lib/firebase/admin', () => {
  return {
    adminAuth: {
      verifyIdToken: jest.fn(),
    },
    adminDb: {
      collection: jest.fn(() => mockCollectionVal),
    },
  };
});

import { adminAuth } from '@/lib/firebase/admin';
import { proposeNegotiationTerms } from '@/actions/negotiations';

describe('Marketplace Negotiation Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects action if token is missing', async () => {
    await expect(
      proposeNegotiationTerms('', 'listing_123', {
        contributionCents: 5000000,
        isCounter: false,
      })
    ).rejects.toThrow('Missing authentication token.');
  });

  it('rejects if user is a vendor', async () => {
    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'user_123' });
    mockDocVal.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        role: 'Vendor',
        accountType: 'vendor',
        displayName: 'Vendor Guy',
        email: 'vendor@example.com',
      }),
    });

    await expect(
      proposeNegotiationTerms('token', 'listing_123', {
        contributionCents: 5000000,
        isCounter: false,
      })
    ).rejects.toThrow('Not Found');
  });

  it('proposes negotiation terms successfully for investor with active subscription', async () => {
    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'investor_123' });
    
    // First read: user profile inside verifyActionAuth
    mockDocVal.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        role: 'Investor',
        accountType: 'investor',
        subscriptionPlan: 'Professional',
        subscriptionStatus: 'active',
        displayName: 'Jane Investor',
        email: 'jane@example.com',
      }),
    });

    // Second read: listing doc
    mockDocVal.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        id: 'listing_123',
        projectId: 'project_123',
        propertyName: 'Sunset Apartments',
        ownerUid: 'lead_123',
        leadInvestor: {
          uid: 'lead_123',
          displayName: 'Bob Lead',
          email: 'bob@example.com',
        },
        equityTerms: {
          fundingTarget: 100000000,
          equityOfferedPct: 20,
          priceBasis: 'rehab budget',
          minTicket: 1000000,
        },
      }),
    });

    // Third read: negotiation existence check (negRef.get())
    mockDocVal.get.mockResolvedValueOnce({
      exists: false,
    });

    // Mock the write to set negotiation doc
    mockDocVal.set.mockResolvedValue({ success: true });

    const res = await proposeNegotiationTerms('token', 'listing_123', {
      contributionCents: 10000000, // $100K
      isCounter: false,
    });

    expect(res.success).toBe(true);
    expect(res.negotiationId).toBe('project_123_investor_123');
  });
});
