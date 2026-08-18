import { normalizeDealStatus, matchesDealStatus } from '@/lib/deals/statuses';
import { GET } from '@/app/api/deals/route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock auth guard to allow tests to run
jest.mock('@/lib/firebase-admin/auth-guard', () => ({
  requireAuth: jest.fn().mockResolvedValue({ uid: 'user_123' }),
  isAuthError: jest.fn().mockReturnValue(false),
}));

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    deal: {
      findMany: jest.fn(),
    },
  },
}));

describe('BUG-006 — Deal Status Filter Contract Unit & Integration Tests', () => {
  describe('normalizeDealStatus Utility', () => {
    it('normalizes Listed, listed, published, and PUBLISHED to canonical "published"', () => {
      expect(normalizeDealStatus('Listed')).toBe('published');
      expect(normalizeDealStatus('listed')).toBe('published');
      expect(normalizeDealStatus('published')).toBe('published');
      expect(normalizeDealStatus('PUBLISHED')).toBe('published');
      expect(normalizeDealStatus('active')).toBe('published');
    });

    it('normalizes Draft and draft to canonical "draft"', () => {
      expect(normalizeDealStatus('Draft')).toBe('draft');
      expect(normalizeDealStatus('draft')).toBe('draft');
    });

    it('normalizes Under review, under_review, and funding to canonical "funding"', () => {
      expect(normalizeDealStatus('Under review')).toBe('funding');
      expect(normalizeDealStatus('under_review')).toBe('funding');
      expect(normalizeDealStatus('funding')).toBe('funding');
    });

    it('normalizes Closed and funded to canonical "closed"', () => {
      expect(normalizeDealStatus('Closed')).toBe('closed');
      expect(normalizeDealStatus('funded')).toBe('closed');
    });

    it('returns null for unknown status strings or empty values', () => {
      expect(normalizeDealStatus('non_existent_status_xyz')).toBeNull();
      expect(normalizeDealStatus('')).toBeNull();
      expect(normalizeDealStatus(null)).toBeNull();
    });
  });

  describe('matchesDealStatus Utility', () => {
    it('matches "published" DB status against "Listed" UI filter parameter', () => {
      expect(matchesDealStatus('published', 'Listed')).toBe(true);
      expect(matchesDealStatus('published', 'published')).toBe(true);
      expect(matchesDealStatus('listed', 'Listed')).toBe(true);
    });

    it('matches "funding" DB status against "Under review" UI filter parameter', () => {
      expect(matchesDealStatus('funding', 'Under review')).toBe(true);
      expect(matchesDealStatus('funding', 'under_review')).toBe(true);
    });

    it('returns true when filter status is "All"', () => {
      expect(matchesDealStatus('published', 'All')).toBe(true);
      expect(matchesDealStatus('draft', 'all')).toBe(true);
    });

    it('returns false when statuses do not match', () => {
      expect(matchesDealStatus('published', 'Draft')).toBe(false);
      expect(matchesDealStatus('draft', 'Listed')).toBe(false);
    });
  });

  describe('GET /api/deals Status Filter Handling', () => {
    const mockDeals = [
      {
        id: 'deal_1',
        slug: 'austin-deal-1',
        address: '100 Congress Ave, Austin, TX 78701',
        status: 'published',
        visibility: 'marketplace',
        purchasePrice: 500000,
        rehabCost: 50000,
        arv: 700000,
        holdingCosts: 10000,
        projectedRoi: 0.15,
        creatorId: 'user_1',
        createdAt: new Date(),
        projects: [{ name: 'Austin Multifamily', city: 'Austin', state: 'TX', zip: '78701', propertyType: 'Multi-family', subStrategy: 'FLIP' }],
        commitments: [],
        invitations: [],
      },
      {
        id: 'deal_2',
        slug: 'austin-deal-2',
        address: '200 Main St, Austin, TX 78701',
        status: 'published',
        visibility: 'marketplace',
        purchasePrice: 600000,
        rehabCost: 60000,
        arv: 800000,
        holdingCosts: 12000,
        projectedRoi: 0.18,
        creatorId: 'user_1',
        createdAt: new Date(),
        projects: [{ name: 'Main St Rehab', city: 'Austin', state: 'TX', zip: '78701', propertyType: 'Residential', subStrategy: 'BRRRR' }],
        commitments: [],
        invitations: [],
      },
      {
        id: 'deal_3',
        slug: 'austin-deal-3',
        address: '300 6th St, Austin, TX 78701',
        status: 'published',
        visibility: 'marketplace',
        purchasePrice: 700000,
        rehabCost: 70000,
        arv: 950000,
        holdingCosts: 15000,
        projectedRoi: 0.20,
        creatorId: 'user_2',
        createdAt: new Date(),
        projects: [{ name: '6th St Commercial', city: 'Austin', state: 'TX', zip: '78701', propertyType: 'Commercial', subStrategy: 'Buy and hold' }],
        commitments: [],
        invitations: [],
      },
    ];

    beforeEach(() => {
      (prisma.deal.findMany as jest.Mock).mockResolvedValue(mockDeals);
    });

    it('returns 3 results when status=Listed is passed', async () => {
      const req = new NextRequest('http://localhost:3000/api/deals?status=Listed', {
        headers: { authorization: 'Bearer valid_token' },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.total).toBe(3);
      expect(json.deals).toHaveLength(3);
    });

    it('returns 3 results when status=published is passed', async () => {
      const req = new NextRequest('http://localhost:3000/api/deals?status=published', {
        headers: { authorization: 'Bearer valid_token' },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.total).toBe(3);
    });

    it('returns 3 results when status=listed (lowercase) is passed', async () => {
      const req = new NextRequest('http://localhost:3000/api/deals?status=listed', {
        headers: { authorization: 'Bearer valid_token' },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.total).toBe(3);
    });

    it('returns 0 results when unknown status is passed', async () => {
      const req = new NextRequest('http://localhost:3000/api/deals?status=unknown_invalid_status', {
        headers: { authorization: 'Bearer valid_token' },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.total).toBe(0);
    });
  });
});
