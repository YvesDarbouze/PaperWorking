import {
  handleDealsExistsGet,
  handleDealsGet,
  handleMarketplaceInvestorsGet,
  handleMarketplaceListingsGet,
} from '@paperworking/api';
import { WEB_APP_STATUS } from '../index.js';
import {
  SEED_INVESTOR_PROFILES,
  SEED_MARKETPLACE_LISTINGS,
  SEED_RAW_DEALS,
  findSeedDealBySlug,
  listSeedFollowingIds,
  updateSeedFollowState,
} from '../../lib/marketplace/seed-data.js';

describe('phase 5g — web app status', () => {
  it('includes marketplace and deal routes', () => {
    expect(WEB_APP_STATUS.dashboardRoutes).toContain('/dashboard/marketplace');
    expect(WEB_APP_STATUS.dashboardRoutes).toContain('/dashboard/deals');
    expect(WEB_APP_STATUS.dealRoutes).toContain('/deals/1247elmst');
  });
});

describe('phase 5g — marketplace seed data', () => {
  it('includes public listings and syndication deals', () => {
    expect(SEED_MARKETPLACE_LISTINGS.length).toBeGreaterThanOrEqual(2);
    expect(SEED_RAW_DEALS.length).toBeGreaterThanOrEqual(3);
    expect(SEED_INVESTOR_PROFILES.filter((p) => p.data.publicProfile === true).length).toBe(2);
  });

  it('tracks follow state in memory', () => {
    const result = updateSeedFollowState('test-user', 'inv-2', true);
    expect(result.following).toBe(true);
    expect(listSeedFollowingIds('test-user')).toContain('inv-2');
  });
});

describe('phase 5g — marketplace handlers', () => {
  it('returns filtered marketplace listings', async () => {
    const result = await handleMarketplaceListingsGet({
      listListings: async () => SEED_MARKETPLACE_LISTINGS,
    });
    expect(result.status).toBe(200);
    const body = result.body as { count: number };
    expect(body.count).toBe(2);
  });

  it('returns investor directory with following ids', async () => {
    const result = await handleMarketplaceInvestorsGet({
      listPublicProfiles: async () =>
        SEED_INVESTOR_PROFILES.filter((profile) => profile.data.publicProfile === true),
      tryAuthenticate: async () => ({ uid: 'dev-user-1' }),
      listFollowingIds: async () => listSeedFollowingIds('dev-user-1'),
    });
    expect(result.status).toBe(200);
    const body = result.body as { profiles: unknown[]; following: string[] };
    expect(body.profiles.length).toBe(2);
    expect(body.following).toContain('inv-1');
  });

  it('lists discover deals for authenticated user', async () => {
    const result = await handleDealsGet(
      { tab: 'discover' },
      {
        requireAuth: async () => ({ uid: 'dev-user-1' }),
        listDeals: async () => SEED_RAW_DEALS,
      },
    );
    expect(result.status).toBe(200);
    const body = result.body as { total: number; deals: Array<{ slug: string }> };
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.deals.map((deal) => deal.slug)).toEqual(
      expect.arrayContaining(['1247elmst', 'melroseduplex']),
    );
  });

  it('resolves deal preview by slug with visibility rules', async () => {
    const result = await handleDealsExistsGet(
      { slug: 'riversideinvite', userId: 'dev-user-1' },
      { findBySlug: async (slug) => findSeedDealBySlug(slug) },
    );
    expect(result.status).toBe(200);
    const body = result.body as { exists: boolean; deal: { slug: string } | null };
    expect(body.exists).toBe(true);
    expect(body.deal?.slug).toBe('riversideinvite');
  });

  it('Bug_06 Regression: POST /api/marketplace/investors/follow toggles follow state, updates followerCount, and persists across GET /api/marketplace/investors and GET /api/marketplace/investors/[id]', async () => {
    const { GET: getInvestors } = await import('../../app/api/marketplace/investors/route.js');
    const { POST: postFollow } = await import('../../app/api/marketplace/investors/follow/route.js');
    const { GET: getInvestorById } = await import('../../app/api/marketplace/investors/[id]/route.js');

    // Ensure clean state for inv-2 with dev-user-1
    updateSeedFollowState('dev-user-1', 'inv-2', false);

    // 1. Check initial GET /api/marketplace/investors
    const initialListRes = await getInvestors();
    expect(initialListRes.status).toBe(200);
    const initialListBody = (await initialListRes.json()) as {
      profiles: Array<{ uid: string; followerCount: number }>;
      following: string[];
    };
    const initialInv2 = initialListBody.profiles.find((p) => p.uid === 'inv-2');
    expect(initialInv2).toBeDefined();
    const baseFollowerCount = initialInv2!.followerCount;
    expect(initialListBody.following).not.toContain('inv-2');

    // 2. Follow inv-2 via POST /api/marketplace/investors/follow
    const followReq = new Request('http://localhost/api/marketplace/investors/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'inv-2', follow: true }),
    });
    const followRes = await postFollow(followReq);
    expect(followRes.status).toBe(200);
    const followBody = (await followRes.json()) as { following: boolean; changed: boolean };
    expect(followBody).toEqual({ following: true, changed: true });

    // 3. Verify GET /api/marketplace/investors reflects updated following list and incremented followerCount
    const afterFollowListRes = await getInvestors();
    const afterFollowListBody = (await afterFollowListRes.json()) as {
      profiles: Array<{ uid: string; followerCount: number }>;
      following: string[];
    };
    expect(afterFollowListBody.following).toContain('inv-2');
    const updatedInv2 = afterFollowListBody.profiles.find((p) => p.uid === 'inv-2');
    expect(updatedInv2?.followerCount).toBe(baseFollowerCount + 1);

    // 4. Verify GET /api/marketplace/investors/[id] reflects isFollowing: true and updated followerCount
    const detailRes = await getInvestorById(new Request('http://localhost/api/marketplace/investors/inv-2'), {
      params: Promise.resolve({ id: 'inv-2' }),
    });
    expect(detailRes.status).toBe(200);
    const detailBody = (await detailRes.json()) as {
      isFollowing: boolean;
      profile: { uid: string; followerCount: number };
    };
    expect(detailBody.isFollowing).toBe(true);
    expect(detailBody.profile.followerCount).toBe(baseFollowerCount + 1);

    // 5. Unfollow inv-2 via POST /api/marketplace/investors/follow
    const unfollowReq = new Request('http://localhost/api/marketplace/investors/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'inv-2', follow: false }),
    });
    const unfollowRes = await postFollow(unfollowReq);
    expect(unfollowRes.status).toBe(200);
    const unfollowBody = (await unfollowRes.json()) as { following: boolean; changed: boolean };
    expect(unfollowBody).toEqual({ following: false, changed: true });

    // 6. Verify followerCount decrements back to baseFollowerCount
    const finalListRes = await getInvestors();
    const finalListBody = (await finalListRes.json()) as {
      profiles: Array<{ uid: string; followerCount: number }>;
      following: string[];
    };
    expect(finalListBody.following).not.toContain('inv-2');
    expect(finalListBody.profiles.find((p) => p.uid === 'inv-2')?.followerCount).toBe(baseFollowerCount);
  });

  it('Bug_50 Regression: every investor card in GET /api/marketplace/investors (including QA Test User, QA Test Investor, and saved profiles) resolves 200 OK on GET /api/marketplace/investors/[id]', async () => {
    const { GET: getInvestors } = await import('../../app/api/marketplace/investors/route.js');
    const { GET: getInvestorById } = await import(
      '../../app/api/marketplace/investors/[id]/route.js'
    );
    const { PUT: putMarketplaceProfile } = await import(
      '../../app/api/marketplace/profile/route.js'
    );
    const { upsertInvestorProfileInStore } = await import(
      '../../lib/marketplace/investor-store.js'
    );

    // 1. Register dynamic profiles for QA Test User and QA Test Investor
    upsertInvestorProfileInStore('qa-test-user-uid', {
      displayName: 'QA Test User',
      publicProfile: true,
      profileType: 'individual',
      publicBio: 'Active residential and multifamily investor.',
      location: 'Austin, TX',
      strategies: ['flip', 'brrrr'],
      followerCount: 15,
    });

    process.env.TEST_AUTH_UID = 'qa-test-investor-uid';
    const saveProfileReq = new Request('http://localhost/api/marketplace/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'QA Test Investor',
        businessName: 'QA Test Investor Capital',
        publicBio: 'Value-add syndicator across Sunbelt markets.',
        location: 'Dallas, TX',
        publicProfile: true,
        strategies: ['buy_and_hold', 'multifamily'],
      }),
    });
    const saveRes = await putMarketplaceProfile(saveProfileReq as any);
    expect(saveRes.status).toBe(200);

    // 2. List all public profiles in the Investor Directory
    const listRes = await getInvestors();
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as {
      profiles: Array<{ uid: string; displayName: string }>;
    };
    expect(listBody.profiles.some((p) => p.displayName === 'QA Test User')).toBe(true);
    expect(listBody.profiles.some((p) => p.displayName === 'QA Test Investor')).toBe(true);

    // 3. Click View Profile (GET /api/marketplace/investors/[id]) for EVERY profile in the directory
    for (const card of listBody.profiles) {
      const detailRes = await getInvestorById(
        new Request(`http://localhost/api/marketplace/investors/${encodeURIComponent(card.uid)}`),
        { params: Promise.resolve({ id: card.uid }) },
      );
      expect(detailRes.status).toBe(200);
      const detailBody = (await detailRes.json()) as {
        profile?: { uid: string; displayName: string };
      };
      expect(detailBody.profile).toBeDefined();
      expect(detailBody.profile?.displayName).toBe(card.displayName);
    }

    // 4. Also verify lookup by displayName or URL-encoded ID resolves 200 OK
    const byNameRes = await getInvestorById(
      new Request('http://localhost/api/marketplace/investors/QA%20Test%20User'),
      { params: Promise.resolve({ id: 'QA%20Test%20User' }) },
    );
    expect(byNameRes.status).toBe(200);
    const byNameBody = (await byNameRes.json()) as {
      profile?: { displayName: string };
    };
    expect(byNameBody.profile?.displayName).toBe('QA Test User');
  });
});

