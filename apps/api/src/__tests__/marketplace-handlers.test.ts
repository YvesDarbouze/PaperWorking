import { describe, expect, it } from '@jest/globals';
import { handleMarketplaceListingsGet } from '../routes/marketplace/listings/handler.js';
import { handleMarketplaceProfileGet } from '../routes/marketplace/profile/handler.js';
import { handleMarketplaceInvestorsGet } from '../routes/marketplace/investors/handler.js';
import { handleMarketplaceInvestorByIdGet } from '../routes/marketplace/investors/get-by-id/handler.js';
import { handleMarketplaceInvestorsFollowPost } from '../routes/marketplace/investors/follow/handler.js';
import { handleDealsGet } from '../routes/deals/list/handler.js';
import { handleDealsExistsGet } from '../routes/deals/exists/handler.js';
import { handleDealsBroadcastPost } from '../routes/deals/broadcast/handler.js';

const adminAuth = { uid: 'user-1' };

describe('marketplace route handlers', () => {
  it('GET /api/marketplace/listings returns filtered listings', async () => {
    const result = await handleMarketplaceListingsGet({
      listListings: async () => [
        { id: '1', visibility: 'PUBLIC', createdAt: '2026-01-01' },
        { id: '2', visibility: 'PRIVATE', createdAt: '2026-02-01' },
      ],
    });

    expect(result.status).toBe(200);
    const body = result.body as { count: number; isAuthenticated: boolean };
    expect(body.count).toBe(1);
    expect(body.isAuthenticated).toBe(false);
  });

  it('GET /api/marketplace/profile requires auth', async () => {
    const result = await handleMarketplaceProfileGet({
      requireAuth: async () => adminAuth,
      getUserDoc: async () => ({ displayName: 'Alice', publicProfile: true }),
    });

    expect(result.status).toBe(200);
    const body = result.body as { profile: { uid: string; displayName: string } };
    expect(body.profile.uid).toBe('user-1');
    expect(body.profile.displayName).toBe('Alice');
  });

  it('GET /api/marketplace/investors returns directory', async () => {
    const result = await handleMarketplaceInvestorsGet({
      listPublicProfiles: async () => [
        { uid: 'inv-1', data: { displayName: 'Bob', publicProfile: true } },
      ],
      tryAuthenticate: async () => adminAuth,
      listFollowingIds: async () => ['inv-1'],
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      profiles: [
        expect.objectContaining({ uid: 'inv-1', displayName: 'Bob', publicProfile: true }),
      ],
      following: ['inv-1'],
    });
  });

  it('GET /api/marketplace/investors/[id] returns 404 for private profile', async () => {
    const result = await handleMarketplaceInvestorByIdGet(
      { id: 'hidden' },
      {
        getInvestor: async () => ({ uid: 'hidden', data: { publicProfile: false } }),
      },
    );

    expect(result.status).toBe(404);
  });

  it('POST /api/marketplace/investors/follow delegates to updateFollow', async () => {
    const result = await handleMarketplaceInvestorsFollowPost(
      { targetUid: 'target-1', follow: true },
      {
        requireAuth: async () => adminAuth,
        updateFollow: async () => ({ following: true, changed: true }),
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ following: true, changed: true });
  });
});

describe('deals route handlers', () => {
  it('GET /api/deals returns filtered deals', async () => {
    const result = await handleDealsGet(
      { tab: 'discover' },
      {
        requireAuth: async () => adminAuth,
        listDeals: async () => [
          {
            id: 'd1',
            slug: 'deal1',
            address: '123 Main',
            status: 'published',
            visibility: 'marketplace',
            purchasePrice: 500_000,
            rehabCost: 0,
            arv: 600_000,
            holdingCosts: 0,
            projectedRoi: 15,
            creatorId: 'c1',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as { success: boolean; total: number };
    expect(body.success).toBe(true);
    expect(body.total).toBe(1);
  });

  it('GET /api/deals/exists returns false for empty slug', async () => {
    const result = await handleDealsExistsGet({ slug: '' });
    expect(result.body).toEqual({ exists: false, deal: null });
  });

  it('POST /api/deals/broadcast validates payload', async () => {
    const bad = await handleDealsBroadcastPost({});
    expect(bad.status).toBe(400);

    const ok = await handleDealsBroadcastPost({
      dealId: 'deal-1',
      recipientEmails: ['a@example.com'],
    });
    expect(ok.status).toBe(200);
    const body = ok.body as { success: boolean; dispatchedCount: number };
    expect(body.success).toBe(true);
    expect(body.dispatchedCount).toBe(1);
  });
});
