import type { AuthorizationService, AuthUser } from '@paperworking/authz';
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
    const trimmed = slugOrId?.trim();
    if (!trimmed) return { exists: false, deal: null };

    const deal = await this.deps.repository.findBySlugOrId(trimmed);
    if (!deal) return { exists: false, deal: null };

    if (deal.visibility === 'marketplace' && deal.status === 'published') {
      return { exists: true, deal };
    }

    return { exists: false, deal: null };
  }
}

export function createDealsReadService(deps: DealsReadServiceDeps): DealsReadService {
  return new DealsReadService(deps);
}
