/** User fields loaded for GET /api/marketplace/profile. */
export type MarketplaceProfileUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  name: string | null;
  accountType: string | null;
  companyName: string | null;
  avatarUrl: string | null;
};

/** Self-scoped user and follower counts from Neon/Postgres. */
export interface MarketplaceProfileReadRepository {
  findUserByUid(uid: string): Promise<MarketplaceProfileUserRow | null>;
  countFollowing(userId: string): Promise<number>;
  countFollowers(userId: string): Promise<number>;
}
