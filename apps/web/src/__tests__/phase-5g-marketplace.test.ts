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
    expect(body.total).toBe(2);
    expect(body.deals.map((deal) => deal.slug)).toEqual(['1247elmst', 'melroseduplex']);
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
});
