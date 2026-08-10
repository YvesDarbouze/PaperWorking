import path from 'path';
import dotenv from 'dotenv';
import { NextRequest } from 'next/server';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { GET as getMarketplaceListings } from '@/app/api/marketplace/listings/route';
import { adminDb } from '@/lib/firebase/admin';
import { prisma } from '@/lib/prisma';

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

    const syntheticPublicListings = json.listings.filter((l: any) => l.syntheticAgent === true);
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

    const syntheticListings = json.listings.filter((l: any) => l.syntheticAgent === true);
    expect(syntheticListings).toHaveLength(15);
  });
});
