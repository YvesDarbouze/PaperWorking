import { AuthzNotFoundError } from '@paperworking/authz';
import type { AuthUser } from '@paperworking/authz';
import type { MarketplaceInvestorsReadRepository } from './marketplace-investors-read-repository.js';
import {
  serializeInvestorProfileCard,
  serializePublicInvestor,
} from './serialize-public-investor.js';

export type MarketplaceInvestorsListResult = {
  success: true;
  investors: ReturnType<typeof serializePublicInvestor>[];
  /** UI compat alias for directory panels expecting legacy handler shape. */
  profiles: ReturnType<typeof serializeInvestorProfileCard>[];
  following: string[];
};

export type MarketplaceInvestorDetailResult = {
  success: true;
  investor: ReturnType<typeof serializePublicInvestor> & {
    followers: number;
    createdAt?: Date;
  };
  profile: {
    uid: string;
    displayName: string;
    followerCount: number;
    dealCount: number;
  };
  deals: Array<{ id: string; propertyName?: string; address?: string }>;
  activity: Array<{ id: string; text: string; at?: string }>;
  isFollowing: boolean;
};

export type MarketplaceListingsResult = {
  success: true;
  listings: Awaited<ReturnType<MarketplaceInvestorsReadRepository['listListings']>>;
  count: number;
};

export type MarketplaceInvestorsReadServiceDeps = {
  repository: MarketplaceInvestorsReadRepository;
};

/**
 * Public marketplace investor directory + listings reads (Neon/Postgres).
 */
export class MarketplaceInvestorsReadService {
  constructor(private readonly deps: MarketplaceInvestorsReadServiceDeps) {}

  async listInvestors(
    q?: string,
    viewer?: AuthUser | null,
  ): Promise<MarketplaceInvestorsListResult> {
    const rows = await this.deps.repository.listInvestors(q?.trim() || undefined);
    const investors = rows.map(serializePublicInvestor);
    const profiles = rows.map(serializeInvestorProfileCard);
    const following =
      viewer?.uid != null
        ? await this.deps.repository.listFollowingIds(viewer.uid)
        : [];

    return { success: true, investors, profiles, following };
  }

  async getInvestorById(
    id: string,
    viewer?: AuthUser | null,
  ): Promise<MarketplaceInvestorDetailResult> {
    const trimmed = id?.trim();
    if (!trimmed) {
      throw new AuthzNotFoundError({ error: 'Investor not found' });
    }

    const investor = await this.deps.repository.findInvestorById(trimmed);
    if (!investor) {
      throw new AuthzNotFoundError({ error: 'Investor not found' });
    }

    const followers = await this.deps.repository.countFollowers(investor.id);
    const isFollowing =
      viewer?.uid != null
        ? await this.deps.repository.isFollowing(viewer.uid, investor.id)
        : false;

    const publicInvestor = serializePublicInvestor(investor);

    return {
      success: true,
      investor: { ...publicInvestor, followers, createdAt: investor.createdAt },
      profile: {
        uid: investor.id,
        displayName: investor.displayName || investor.name || 'Investor',
        followerCount: followers,
        dealCount: 0,
      },
      deals: [],
      activity: [],
      isFollowing,
    };
  }

  async listListings(): Promise<MarketplaceListingsResult> {
    const listings = await this.deps.repository.listListings();
    return { success: true, listings, count: listings.length };
  }
}

export function createMarketplaceInvestorsReadService(
  deps: MarketplaceInvestorsReadServiceDeps,
): MarketplaceInvestorsReadService {
  return new MarketplaceInvestorsReadService(deps);
}
