import { describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  createMarketplaceProfileReadService,
  serializeMarketplaceProfile,
  type MarketplaceProfileReadRepository,
  type MarketplaceProfileUserRow,
} from '../marketplace/index.js';

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const vendor: AuthUser = {
  uid: 'vendor-1',
  email: 'vendor@example.com',
  accountType: 'vendor',
  isAdmin: false,
};

function userRow(overrides: Partial<MarketplaceProfileUserRow> = {}): MarketplaceProfileUserRow {
  return {
    id: 'user-1',
    email: 'investor@example.com',
    displayName: 'Investor One',
    name: 'Investor One',
    accountType: 'investor',
    companyName: 'Acme Capital',
    avatarUrl: 'https://example.com/a.png',
    ...overrides,
  };
}

describe('serializeMarketplaceProfile', () => {
  it('maps Postgres user row and follower counts to Nest-compatible profile', () => {
    const profile = serializeMarketplaceProfile(investor, userRow(), 3, 7);
    expect(profile).toEqual({
      id: 'user-1',
      uid: 'user-1',
      email: 'investor@example.com',
      displayName: 'Investor One',
      accountType: 'investor',
      companyName: 'Acme Capital',
      avatarUrl: 'https://example.com/a.png',
      following: 3,
      followers: 7,
      followerCount: 7,
    });
  });

  it('falls back to AuthUser when Postgres row is missing', () => {
    const profile = serializeMarketplaceProfile(investor, null, 0, 0);
    expect(profile.id).toBe('user-1');
    expect(profile.email).toBe('investor@example.com');
    expect(profile.accountType).toBe('investor');
    expect(profile.displayName).toBeUndefined();
    expect(profile.followerCount).toBe(0);
  });

  it('prefers Postgres accountType over spoofed AuthUser accountType', () => {
    const profile = serializeMarketplaceProfile(
      { ...investor, accountType: 'admin', isAdmin: false },
      userRow({ accountType: 'investor' }),
      0,
      0,
    );
    expect(profile.accountType).toBe('investor');
  });
});

describe('MarketplaceProfileReadService', () => {
  it('loads self profile for authenticated investor', async () => {
    const repository: MarketplaceProfileReadRepository = {
      findUserByUid: jest.fn(async () => userRow()),
      countFollowing: jest.fn(async () => 2),
      countFollowers: jest.fn(async () => 5),
    };
    const service = createMarketplaceProfileReadService({ repository });

    const result = await service.getMarketplaceProfile(investor);
    expect(result.success).toBe(true);
    expect(result.profile.displayName).toBe('Investor One');
    expect(result.profile.followerCount).toBe(5);
    expect(repository.findUserByUid).toHaveBeenCalledWith('user-1');
    expect(repository.countFollowing).toHaveBeenCalledWith('user-1');
    expect(repository.countFollowers).toHaveBeenCalledWith('user-1');
  });

  it('supports vendor accountType from Postgres row', async () => {
    const repository: MarketplaceProfileReadRepository = {
      findUserByUid: async () =>
        userRow({
          id: 'vendor-1',
          accountType: 'vendor',
          displayName: 'Vendor Co',
          companyName: 'Vendor LLC',
        }),
      countFollowing: async () => 0,
      countFollowers: async () => 1,
    };
    const service = createMarketplaceProfileReadService({ repository });

    const result = await service.getMarketplaceProfile(vendor);
    expect(result.profile.accountType).toBe('vendor');
    expect(result.profile.companyName).toBe('Vendor LLC');
  });

  it('scopes follower counts to canonical Postgres user id', async () => {
    const repository: MarketplaceProfileReadRepository = {
      findUserByUid: async () => userRow({ id: 'canonical-user-id' }),
      countFollowing: jest.fn(async () => 0),
      countFollowers: jest.fn(async () => 0),
    };
    const service = createMarketplaceProfileReadService({ repository });

    await service.getMarketplaceProfile(investor);
    expect(repository.countFollowing).toHaveBeenCalledWith('canonical-user-id');
    expect(repository.countFollowers).toHaveBeenCalledWith('canonical-user-id');
  });

  it('does not load another user profile when AuthUser uid differs', async () => {
    const findUserByUid = jest.fn(async () => userRow({ id: 'user-1' }));
    const service = createMarketplaceProfileReadService({
      repository: {
        findUserByUid,
        countFollowing: async () => 0,
        countFollowers: async () => 0,
      },
    });

    await service.getMarketplaceProfile(investor);
    expect(findUserByUid).toHaveBeenCalledWith('user-1');
    expect(findUserByUid).not.toHaveBeenCalledWith('other-user');
  });

  it('returns profile from AuthUser fallback when user row missing', async () => {
    const service = createMarketplaceProfileReadService({
      repository: {
        findUserByUid: async () => null,
        countFollowing: async () => 0,
        countFollowers: async () => 0,
      },
    });

    const result = await service.getMarketplaceProfile(investor);
    expect(result.profile.uid).toBe('user-1');
    expect(result.profile.email).toBe('investor@example.com');
  });
});
