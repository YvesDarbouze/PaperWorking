import { NextRequest } from 'next/server';
import { GET as getDeals } from '@/app/api/deals/route';
import { GET as getDealExists } from '@/app/api/deals/exists/route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    deal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

const MOCK_DB_DEALS = [
  {
    id: 'deal_123mainst',
    slug: '123mainstaustintx78701',
    address: '123 Main St, Austin, TX 78701',
    purchasePrice: 350000,
    rehabCost: 50000,
    arv: 480000,
    holdingCosts: 12000,
    projectedRoi: 18.5,
    status: 'published',
    visibility: 'marketplace',
    creatorId: 'user_owner_1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    projects: [{ name: 'Austin Core Multifamily Project', city: 'Austin', state: 'TX', zip: '78701', propertyType: 'Commercial', subStrategy: 'FLIP' }],
    commitments: [{ amount: 130000, investorId: 'inv_1' }],
    invitations: [{ inviteeUserId: 'user_invited_1' }],
  },
  {
    id: 'deal_unlisted_invitation',
    slug: '555unlistedstsanantoniotx78205',
    address: '555 Unlisted St, San Antonio, TX 78205',
    purchasePrice: 600000,
    rehabCost: 80000,
    arv: 850000,
    holdingCosts: 18000,
    projectedRoi: 19.2,
    status: 'published',
    visibility: 'invitation_only',
    creatorId: 'user_owner_4',
    createdAt: new Date('2026-01-02T00:00:00Z'),
    projects: [{ name: 'San Antonio Private Syndicate', city: 'San Antonio', state: 'TX', zip: '78205', propertyType: 'Multi-family', subStrategy: 'Buy and hold' }],
    commitments: [],
    invitations: [{ inviteeUserId: 'user_invited_2' }, { inviteeUserId: 'user_invited_vip' }],
  },
];

describe('GET /api/deals Endpoint & Visibility Control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.deal.findMany as jest.Mock).mockResolvedValue(MOCK_DB_DEALS);
  });

  it('returns 401 Unauthorized for requests without authorization header', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?tab=discover');
    const res = await getDeals(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns published marketplace deal listings on Discover tab when authenticated', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?tab=discover', {
      headers: { authorization: 'Bearer mock_token' },
    });
    const res = await getDeals(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.deals)).toBe(true);
    expect(json.deals.every((d: { visibility?: string }) => (d.visibility || 'marketplace') === 'marketplace')).toBe(true);
  });

  it('returns explicit empty collection (200 + []) when database contains no deals', async () => {
    (prisma.deal.findMany as jest.Mock).mockResolvedValue([]);
    const req = new NextRequest('http://localhost:3000/api/deals?tab=discover', {
      headers: { authorization: 'Bearer mock_token' },
    });
    const res = await getDeals(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.total).toBe(0);
    expect(json.deals).toEqual([]);
  });

  it('returns HTTP 500 when database query fails', async () => {
    (prisma.deal.findMany as jest.Mock).mockRejectedValue(new Error('DB Connection Timeout'));
    const req = new NextRequest('http://localhost:3000/api/deals?tab=discover', {
      headers: { authorization: 'Bearer mock_token' },
    });
    const res = await getDeals(req);
    expect(res.status).toBe(500);

    const json = await res.json();
    expect(json.error).toBe('Database query failed');
  });

  it('excludes invitation_only deals from Discover tab', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?tab=discover', {
      headers: { authorization: 'Bearer mock_token' },
    });
    const res = await getDeals(req);
    const json = await res.json();

    const invitationOnlyDeal = json.deals.find((d: { id?: string }) => d.id === 'deal_unlisted_invitation');
    expect(invitationOnlyDeal).toBeUndefined();
  });

  it('includes invitation_only deals on My Activity tab for invited user', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?tab=my_activity&userId=user_invited_2', {
      headers: { authorization: 'Bearer mock_token' },
    });
    const res = await getDeals(req);
    const json = await res.json();

    const invitationOnlyDeal = json.deals.find((d: { id?: string }) => d.id === 'deal_unlisted_invitation');
    expect(invitationOnlyDeal).toBeDefined();
  });

  it('filters deals by propertyType parameter', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals?propertyType=Commercial', {
      headers: { authorization: 'Bearer mock_token' },
    });
    const res = await getDeals(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.deals.every((d: { assetClass?: string }) => d.assetClass?.toLowerCase() === 'commercial')).toBe(true);
  });
});

describe('GET /api/deals/exists Search Collision & Visibility Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.deal.findFirst as jest.Mock).mockImplementation((args: { where?: { slug?: string } }) => {
      const slug = args?.where?.slug;
      const found = MOCK_DB_DEALS.find((d) => d.slug === slug);
      return Promise.resolve(found || null);
    });
  });

  it('shows marketplace deal in collision check', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals/exists?slug=123mainstaustintx78701');
    const res = await getDealExists(req);
    const json = await res.json();

    expect(json.exists).toBe(true);
    expect(json.deal.slug).toBe('123mainstaustintx78701');
  });

  it('hides invitation_only deal from search collision for non-invited user', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals/exists?slug=555unlistedstsanantoniotx78205&userId=user_stranger');
    const res = await getDealExists(req);
    const json = await res.json();

    expect(json.exists).toBe(false);
    expect(json.deal).toBeNull();
  });

  it('shows invitation_only deal in search collision for invited user', async () => {
    const req = new NextRequest('http://localhost:3000/api/deals/exists?slug=555unlistedstsanantoniotx78205&userId=user_invited_vip');
    const res = await getDealExists(req);
    const json = await res.json();

    expect(json.exists).toBe(true);
    expect(json.deal.id).toBe('deal_unlisted_invitation');
  });
});
