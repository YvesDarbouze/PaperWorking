import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import { dealSlugLookupCandidates } from './deals-command-service.js';
import type { DealExistsPreview, DealRecord, DealsReadRepository } from './deals-read-repository.js';

export type DealsListResult = {
  success: true;
  total: number;
  deals: DealRecord[];
};

export type DealExistsResult = {
  exists: boolean;
  deal: DealExistsPreview | null;
};

export type DealsReadServiceDeps = {
  authz: AuthorizationService;
  repository: DealsReadRepository;
};

/**
 * Framework-neutral read use-cases for GET /api/deals and GET /api/deals/exists.
 */
export class DealsReadService {
  constructor(private readonly deps: DealsReadServiceDeps) {}

  async listDeals(
    user: AuthUser,
    input: { q?: string; tab?: string } = {},
  ): Promise<DealsListResult> {
    this.deps.authz.assertPermission(user, 'deals.read');

    const marketplaceVisible = {
      AND: [{ visibility: 'marketplace' as const }, { status: 'published' as const }],
    };

    const accessOr =
      input.tab === 'my_activity'
        ? [{ creatorId: user.uid }]
        : input.tab === 'discover'
          ? [marketplaceVisible]
          : [{ creatorId: user.uid }, marketplaceVisible];

    const deals = await this.deps.repository.listDeals({
      accessOr,
      q: input.q?.trim() || undefined,
    });

    return { success: true, total: deals.length, deals };
  }

  /**
   * Public slug/id probe — only confirms marketplace-published deals (no private leak).
   */
  async dealExists(slugOrId?: string): Promise<DealExistsResult> {
    const candidates = dealSlugLookupCandidates(slugOrId ?? '');
    if (candidates.length === 0) return { exists: false, deal: null };

    let deal: DealExistsPreview | null = null;
    for (const candidate of candidates) {
      deal = await this.deps.repository.findBySlugOrId(candidate);
      if (deal) break;
    }
    if (!deal) return { exists: false, deal: null };

    if (deal.visibility === 'marketplace' && deal.status === 'published') {
      return { exists: true, deal };
    }

    return { exists: false, deal: null };
  }

  /**
   * Authenticated slug probe — returns the caller's own deals plus marketplace-published deals.
   */
  async dealExistsForUser(user: AuthUser, slugOrId?: string): Promise<DealExistsResult> {
    this.deps.authz.assertPermission(user, 'deals.read');

    const candidates = dealSlugLookupCandidates(slugOrId ?? '');
    if (candidates.length === 0) return { exists: false, deal: null };

    let deal: DealRecord | null = null;
    for (const candidate of candidates) {
      deal = await this.deps.repository.findBySlug(candidate);
      if (deal) break;
    }
    if (!deal) return { exists: false, deal: null };

    const isOwner = deal.creatorId === user.uid;
    const isPublicMarketplace =
      deal.visibility === 'marketplace' && deal.status === 'published';

    if (!isOwner && !isPublicMarketplace) {
      return { exists: false, deal: null };
    }

    return {
      exists: true,
      deal: {
        id: deal.id,
        slug: deal.slug,
        status: deal.status,
        visibility: deal.visibility,
        address: deal.address,
      },
    };
  }

  /** Public marketplace feed — no auth required. */
  async listPublicMarketplaceDeals(q?: string): Promise<DealsListResult> {
    const deals = await this.deps.repository.listDeals({
      accessOr: [
        {
          AND: [{ visibility: 'marketplace' as const }, { status: 'published' as const }],
        },
      ],
      q: q?.trim() || undefined,
    });
    return { success: true, total: deals.length, deals };
  }
}

export function createDealsReadService(deps: DealsReadServiceDeps): DealsReadService {
  return new DealsReadService(deps);
}
