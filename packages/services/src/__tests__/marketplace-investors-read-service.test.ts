import { describe, expect, it, jest } from '@jest/globals';
import { AuthzNotFoundError } from '@paperworking/authz';
import {
  createMarketplaceInvestorsReadService,
  type MarketplaceInvestorsReadRepository,
} from '../marketplace/marketplace-investors-read-service.js';

const investorRow = {
  id: 'inv-1',
  name: 'Alice Investor',
  displayName: 'Alice',
  companyName: 'Alpha Capital',
  avatarUrl: null,
  accountType: 'investor',
  createdAt: new Date('2026-01-01'),
};

function makeRepository(
  overrides: Partial<MarketplaceInvestorsReadRepository> = {},
): MarketplaceInvestorsReadRepository {
  return {
    listInvestors: jest.fn(async () => [investorRow]),
    findInvestorById: jest.fn(async (id) => (id === 'inv-1' ? investorRow : null)),
    countFollowers: jest.fn(async () => 3),
    listFollowingIds: jest.fn(async () => ['inv-1']),
    isFollowing: jest.fn(async () => true),
    listListings: jest.fn(async () => [{ id: 'l1', title: 'Listing', syntheticAgent: false, userId: null, createdAt: new Date(), updatedAt: new Date() }]),
    ...overrides,
  };
}

describe('MarketplaceInvestorsReadService', () => {
  it('lists public investors without email and adds UI profiles alias', async () => {
    const service = createMarketplaceInvestorsReadService({
      repository: makeRepository(),
    });

    const result = await service.listInvestors(undefined, {
      uid: 'viewer-1',
      email: 'v@example.com',
      accountType: 'investor',
      isAdmin: false,
    });

    expect(result.investors[0]?.id).toBe('inv-1');
    expect(result.profiles[0]?.uid).toBe('inv-1');
    expect(result.following).toEqual(['inv-1']);
    expect(JSON.stringify(result.investors)).not.toContain('email');
  });

  it('returns investor detail with follower count and isFollowing', async () => {
    const service = createMarketplaceInvestorsReadService({
      repository: makeRepository(),
    });

    const result = await service.getInvestorById('inv-1', {
      uid: 'viewer-1',
      email: 'v@example.com',
      accountType: 'investor',
      isAdmin: false,
    });

    expect(result.profile.uid).toBe('inv-1');
    expect(result.profile.followerCount).toBe(3);
    expect(result.isFollowing).toBe(true);
  });

  it('returns not found for missing investor', async () => {
    const service = createMarketplaceInvestorsReadService({
      repository: makeRepository({ findInvestorById: async () => null }),
    });

    await expect(service.getInvestorById('missing')).rejects.toBeInstanceOf(AuthzNotFoundError);
  });

  it('lists marketplace listings with count', async () => {
    const service = createMarketplaceInvestorsReadService({
      repository: makeRepository(),
    });

    const result = await service.listListings();
    expect(result.count).toBe(1);
    expect(result.listings[0]?.id).toBe('l1');
  });
});
