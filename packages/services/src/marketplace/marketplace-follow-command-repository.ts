export type InvestorFollowerRow = {
  id: string;
  followerUid: string;
  targetUid: string;
  createdAt: Date;
};

export type MarketplaceFollowCommandRepository = {
  upsertFollow(followerUid: string, targetUid: string): Promise<InvestorFollowerRow>;
  deleteFollow(followerUid: string, targetUid: string): Promise<boolean>;
  findFollow(followerUid: string, targetUid: string): Promise<InvestorFollowerRow | null>;
};
