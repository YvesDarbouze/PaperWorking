export type PublicInvestorRow = {
  id: string;
  name: string | null;
  displayName: string | null;
  companyName: string | null;
  avatarUrl: string | null;
  accountType: string | null;
  createdAt?: Date;
};

export type MarketplaceListingRow = {
  id: string;
  title: string | null;
  syntheticAgent: boolean;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MarketplaceInvestorsReadRepository = {
  listInvestors(q?: string): Promise<PublicInvestorRow[]>;
  findInvestorById(id: string): Promise<PublicInvestorRow | null>;
  countFollowers(targetUid: string): Promise<number>;
  listFollowingIds(followerUid: string): Promise<string[]>;
  isFollowing(followerUid: string, targetUid: string): Promise<boolean>;
  listListings(): Promise<MarketplaceListingRow[]>;
};
