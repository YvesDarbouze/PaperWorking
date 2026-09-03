import type { AuthUser } from '@paperworking/authz';
import type { MarketplaceProfileUserRow } from './marketplace-profile-read-repository.js';

/** Profile block returned in GET /api/marketplace/profile. */
export type MarketplaceProfileRecord = {
  id: string;
  uid: string;
  email: string | null | undefined;
  displayName: string | null | undefined;
  accountType: string;
  companyName: string | null | undefined;
  avatarUrl: string | null | undefined;
  following: number;
  followers: number;
  followerCount: number;
};

export type MarketplaceProfileResult = {
  success: true;
  profile: MarketplaceProfileRecord;
};

/** Maps Postgres user row + follower counts to Nest MarketplaceService.profile shape. */
export function serializeMarketplaceProfile(
  user: AuthUser,
  row: MarketplaceProfileUserRow | null,
  following: number,
  followers: number,
): MarketplaceProfileRecord {
  const canonicalId = row?.id || user.uid;
  return {
    id: canonicalId,
    uid: canonicalId,
    email: row?.email || user.email,
    displayName: row?.displayName || row?.name,
    accountType: row?.accountType || user.accountType,
    companyName: row?.companyName,
    avatarUrl: row?.avatarUrl,
    following,
    followers,
    followerCount: followers,
  };
}
