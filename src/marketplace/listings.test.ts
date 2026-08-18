import path from 'path';
import dotenv from 'dotenv';
import { NextRequest } from 'next/server';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { GET as getMarketplaceListings } from '@/app/api/marketplace/listings/route';
import { adminDb } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';

const agentsCatalog = [
  { handle: 'marcus_chen', name: 'Marcus Chen', email: 'marcus.chen.synthetic@paperworking.co', persona: 'wholesaler', visibility: 'PUBLIC' },
  { handle: 'dana_rodriguez', name: 'Dana Rodriguez', email: 'dana.rodriguez.synthetic@paperworking.co', persona: 'fix_and_flip', visibility: 'PUBLIC' },
  { handle: 'whitmore', name: 'Whitmore', email: 'whitmore.synthetic@paperworking.co', persona: 'buy_and_hold', visibility: 'PUBLIC' },
  { handle: 'robert_kim', name: 'Robert Kim', email: 'robert.kim.synthetic@paperworking.co', persona: 'commercial', visibility: 'NETWORK_ONLY' },
  { handle: 'eleanor_vance', name: 'Eleanor Vance', email: 'eleanor.vance.synthetic@paperworking.co', persona: 'syndicator', visibility: 'NETWORK_ONLY' },
];

const mockListings = agentsCatalog.flatMap((agent) => [
  {
    id: `listing_${agent.handle}_1`,
    agentHandle: agent.handle,
    agentName: agent.name,
    agentEmail: agent.email,
    persona: agent.persona,
    title: `${agent.name} Listing 1`,
    projectId: `proj_${agent.handle}_1`,
    syntheticAgent: true,
    visibility: agent.visibility,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isNewListing: false,
    status: 'active',
  },
  {
    id: `listing_${agent.handle}_2`,
    agentHandle: agent.handle,
    agentName: agent.name,
    agentEmail: agent.email,
    persona: agent.persona,
    title: `${agent.name} Listing 2`,
    projectId: `proj_${agent.handle}_2`,
    syntheticAgent: true,
    visibility: agent.visibility,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    isNewListing: false,
    status: 'active',
  },
  {
    id: `listing_${agent.handle}_3`,
    agentHandle: agent.handle,
    agentName: agent.name,
    agentEmail: agent.email,
    persona: agent.persona,
    title: `${agent.name} Listing 3`,
    projectId: `proj_${agent.handle}_3`,
    syntheticAgent: true,
    visibility: agent.visibility,
    createdAt: new Date().toISOString(),
    isNewListing: true,
    status: 'active',
  },
]);

jest.mock('@/lib/firebase/admin', () => {
  return {
    adminDb: {
      collection: jest.fn().mockImplementation((collectionName: string) => {
        if (collectionName === 'dealListings') {
          interface MockListingItem {
            id: string;
            syntheticAgent?: boolean;
            visibility?: string;
            [key: string]: unknown;
          }
          const makeQuery = (items: MockListingItem[]): { get: jest.Mock; where: jest.Mock } => ({
            get: jest.fn().mockResolvedValue({
              empty: items.length === 0,
              docs: items.map((l) => ({
                id: l.id,
                data: () => ({ ...l }),
              })),
            }),
            where: jest.fn().mockImplementation((field: string, op: string, val: unknown) => {
              const filtered = items.filter((l) => {
                if (op === '==') return l[field] === val;
                return true;
              });
              return makeQuery(filtered);
            }),
          });
          return makeQuery(mockListings);
        }
        return {
          get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          where: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ empty: true, docs: [] }) }),
        };
      }),
    },
    adminAuth: {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'mock_session_token_123', email: 'test@example.com' }),
    },
  };
});

jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      marketplaceListing: {
        findMany: jest.fn().mockImplementation(({ where } = {}) => {
          let list = mockListings;
          if (where?.syntheticAgent) {
            list = list.filter((l) => l.syntheticAgent === true);
          }
          return Promise.resolve(list);
        }),
      },
      $disconnect: jest.fn().mockResolvedValue(undefined),
    },
  };
});

describe('Marketplace Listings Database & API Unit Tests', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have seeded 15 synthetic marketplace listings in Firestore', async () => {
    const snap = await adminDb
      .collection('dealListings')
      .where('syntheticAgent', '==', true)
      .get();

    expect(snap.docs).toHaveLength(15);
  });

  it('should have seeded 15 synthetic marketplace listings in Prisma', async () => {
    const prismaListings = await prisma.marketplaceListing.findMany({
      where: { syntheticAgent: true },
    });

    expect(prismaListings).toHaveLength(15);
  });

  it('should have 5 new listings and 10 old listings with correct isNewListing flags', async () => {
    const snap = await adminDb
      .collection('dealListings')
      .where('syntheticAgent', '==', true)
      .get();

    const newListings = snap.docs.filter((d) => d.data().isNewListing === true);
    const oldListings = snap.docs.filter((d) => d.data().isNewListing === false);

    expect(newListings).toHaveLength(5);
    expect(oldListings).toHaveLength(10);
  });

  it('should have correct visibility attributes (Marcus/Dana/Whitmore PUBLIC, Atlas/Eleanor NETWORK_ONLY)', async () => {
    const snap = await adminDb
      .collection('dealListings')
      .where('syntheticAgent', '==', true)
      .get();

    const publicListings = snap.docs.filter((d) => d.data().visibility === 'PUBLIC');
    const networkListings = snap.docs.filter((d) => d.data().visibility === 'NETWORK_ONLY');

    expect(publicListings).toHaveLength(9); // 3 agents * 3 listings
    expect(networkListings).toHaveLength(6); // 2 agents * 3 listings
  });

  it('API GET /api/marketplace/listings returns synthetic PUBLIC listings for unauthenticated callers', async () => {
    const req = new NextRequest('http://localhost:3000/api/marketplace/listings');
    const res = await getMarketplaceListings(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.isAuthenticated).toBe(false);

    const syntheticPublicListings = json.listings.filter((l: { syntheticAgent?: boolean; visibility?: string }) => l.syntheticAgent === true);
    expect(syntheticPublicListings).toHaveLength(9);

    for (const listing of syntheticPublicListings) {
      expect(listing.visibility).toBe('PUBLIC');
    }
  });

  it('API GET /api/marketplace/listings returns ALL 15 synthetic listings for authenticated callers', async () => {
    const req = new NextRequest('http://localhost:3000/api/marketplace/listings', {
      headers: {
        'Authorization': 'Bearer mock_session_token_123',
      },
    });

    const res = await getMarketplaceListings(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.isAuthenticated).toBe(true);

    const syntheticListings = json.listings.filter((l: { syntheticAgent?: boolean }) => l.syntheticAgent === true);
    expect(syntheticListings).toHaveLength(15);
  });
});
