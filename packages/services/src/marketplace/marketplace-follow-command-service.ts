import type { AuthUser } from '@paperworking/authz';
import { MarketplaceFollowCommandValidationError } from './marketplace-follow-command-errors.js';
import type { MarketplaceFollowCommandRepository } from './marketplace-follow-command-repository.js';

export type SetInvestorFollowInput = {
  targetUid?: string;
  investorId?: string;
  id?: string;
  follow?: boolean;
};

export type InvestorFollowResult =
  | { success: true; follow: Awaited<ReturnType<MarketplaceFollowCommandRepository['upsertFollow']>>; following: true; changed: boolean }
  | { success: true; following: false; changed: boolean };

export type MarketplaceFollowCommandServiceDeps = {
  repository: MarketplaceFollowCommandRepository;
};

function resolveTargetUid(input: SetInvestorFollowInput): string {
  const targetUid = String(input.targetUid || input.investorId || input.id || '').trim();
  if (!targetUid) {
    throw new MarketplaceFollowCommandValidationError('targetUid required');
  }
  return targetUid;
}

/**
 * Investor follow/unfollow mutations — follower identity from AuthUser only.
 */
export class MarketplaceFollowCommandService {
  constructor(private readonly deps: MarketplaceFollowCommandServiceDeps) {}

  async setInvestorFollow(user: AuthUser, input: SetInvestorFollowInput): Promise<InvestorFollowResult> {
    const targetUid = resolveTargetUid(input);
    const follow = input.follow !== false;

    if (targetUid === user.uid) {
      throw new MarketplaceFollowCommandValidationError('You cannot follow yourself.');
    }

    if (!follow) {
      const changed = await this.deps.repository.deleteFollow(user.uid, targetUid);
      return { success: true, following: false, changed };
    }

    const existing = await this.deps.repository.findFollow(user.uid, targetUid);
    const row = await this.deps.repository.upsertFollow(user.uid, targetUid);
    return { success: true, follow: row, following: true, changed: !existing };
  }
}

export function createMarketplaceFollowCommandService(
  deps: MarketplaceFollowCommandServiceDeps,
): MarketplaceFollowCommandService {
  return new MarketplaceFollowCommandService(deps);
}
