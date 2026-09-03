import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MarketplaceProfileReadService,
  MarketplaceInvestorsReadService,
  MarketplaceFollowCommandService,
  MarketplaceFollowCommandValidationError,
  type SetInvestorFollowInput,
} from '@paperworking/services';
import type { AuthUser } from '../auth/auth.types.js';
import { AuthzNotFoundError } from '@paperworking/authz';
import { createMarketplaceFollowCommandRepository } from '@paperworking/database';

function mapInvestorNotFound(error: unknown): never {
  if (error instanceof AuthzNotFoundError) {
    throw new NotFoundException(error.payload);
  }
  throw error;
}

function mapFollowCommandError(error: unknown): never {
  if (error instanceof MarketplaceFollowCommandValidationError) {
    throw new BadRequestException({ error: error.message });
  }
  throw error;
}

@Injectable()
export class MarketplaceService {
  private readonly followRepository;

  constructor(
    private readonly marketplaceProfileRead: MarketplaceProfileReadService,
    private readonly marketplaceInvestorsRead: MarketplaceInvestorsReadService,
    private readonly marketplaceFollowCommand: MarketplaceFollowCommandService,
  ) {
    this.followRepository = createMarketplaceFollowCommandRepository();
  }

  async listings() {
    return this.marketplaceInvestorsRead.listListings();
  }

  async profile(user: AuthUser) {
    return this.marketplaceProfileRead.getMarketplaceProfile(user);
  }

  async investors(q?: string, viewer?: AuthUser | null) {
    return this.marketplaceInvestorsRead.listInvestors(q, viewer);
  }

  async investorById(id: string, viewer?: AuthUser | null) {
    try {
      return await this.marketplaceInvestorsRead.getInvestorById(id, viewer);
    } catch (error) {
      mapInvestorNotFound(error);
    }
  }

  async follow(user: AuthUser, body: Record<string, unknown>) {
    try {
      return await this.marketplaceFollowCommand.setInvestorFollow(
        user,
        body as SetInvestorFollowInput,
      );
    } catch (error) {
      mapFollowCommandError(error);
    }
  }

  async listFollowers(user: AuthUser) {
    const following = await this.followRepository.listFollowing(user.uid);
    const followers = await this.followRepository.listFollowers(user.uid);
    return { success: true, following, followers };
  }

  async createFollower(user: AuthUser, body: Record<string, unknown>) {
    return this.follow(user, body);
  }
}
