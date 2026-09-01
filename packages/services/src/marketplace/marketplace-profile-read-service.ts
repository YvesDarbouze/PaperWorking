import type { AuthUser } from '@paperworking/authz';
import type { MarketplaceProfileReadRepository } from './marketplace-profile-read-repository.js';
import {
  serializeMarketplaceProfile,
  type MarketplaceProfileResult,
} from './serialize-marketplace-profile.js';

export type MarketplaceProfileReadServiceDeps = {
  repository: MarketplaceProfileReadRepository;
};

/**
 * Framework-neutral read use-case for GET /api/marketplace/profile.
 * Self-scoped: loads profile for authenticated AuthUser only (no cross-user access).
 */
export class MarketplaceProfileReadService {
  constructor(private readonly deps: MarketplaceProfileReadServiceDeps) {}

  async getMarketplaceProfile(user: AuthUser): Promise<MarketplaceProfileResult> {
    const row = await this.deps.repository.findUserByUid(user.uid);
    const canonicalId = row?.id || user.uid;
    const [following, followers] = await Promise.all([
      this.deps.repository.countFollowing(canonicalId),
      this.deps.repository.countFollowers(canonicalId),
    ]);
    return {
      success: true,
      profile: serializeMarketplaceProfile(user, row, following, followers),
    };
  }
}

export function createMarketplaceProfileReadService(
  deps: MarketplaceProfileReadServiceDeps,
): MarketplaceProfileReadService {
  return new MarketplaceProfileReadService(deps);
}
