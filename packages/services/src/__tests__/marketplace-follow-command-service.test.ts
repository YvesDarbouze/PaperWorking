import { describe, expect, it, jest } from '@jest/globals';
import { AuthzForbiddenError } from '@paperworking/authz';
import {
  createMarketplaceFollowCommandService,
  type MarketplaceFollowCommandRepository,
} from '../marketplace/marketplace-follow-command-service.js';
import { MarketplaceFollowCommandValidationError } from '../marketplace/marketplace-follow-command-errors.js';

const follower = {
  uid: 'user-a',
  email: 'a@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeRepository(
  overrides: Partial<MarketplaceFollowCommandRepository> = {},
): MarketplaceFollowCommandRepository {
  return {
    upsertFollow: jest.fn(async () => ({
      id: 'f1',
      followerUid: 'user-a',
      targetUid: 'inv-1',
      createdAt: new Date(),
    })),
    deleteFollow: jest.fn(async () => true),
    findFollow: jest.fn(async () => null),
    ...overrides,
  };
}

describe('MarketplaceFollowCommandService', () => {
  it('follows investor using authenticated uid only', async () => {
    const repository = makeRepository();
    const service = createMarketplaceFollowCommandService({ repository });

    const result = await service.setInvestorFollow(follower, {
      targetUid: 'inv-1',
      follow: true,
    });

    expect(result.following).toBe(true);
    expect(repository.upsertFollow).toHaveBeenCalledWith('user-a', 'inv-1');
  });

  it('unfollows investor when follow is false', async () => {
    const repository = makeRepository();
    const service = createMarketplaceFollowCommandService({ repository });

    const result = await service.setInvestorFollow(follower, {
      targetUid: 'inv-1',
      follow: false,
    });

    expect(result.following).toBe(false);
    expect(repository.deleteFollow).toHaveBeenCalledWith('user-a', 'inv-1');
  });

  it('rejects self-follow', async () => {
    const service = createMarketplaceFollowCommandService({
      repository: makeRepository(),
    });

    await expect(
      service.setInvestorFollow(follower, { targetUid: 'user-a', follow: true }),
    ).rejects.toBeInstanceOf(MarketplaceFollowCommandValidationError);
  });

  it('requires target uid', async () => {
    const service = createMarketplaceFollowCommandService({
      repository: makeRepository(),
    });

    await expect(service.setInvestorFollow(follower, {})).rejects.toBeInstanceOf(
      MarketplaceFollowCommandValidationError,
    );
  });
});
