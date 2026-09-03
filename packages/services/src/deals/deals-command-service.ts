import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import { DealsCommandValidationError } from './deals-command-errors.js';
import type { DealRecord } from './deals-read-repository.js';
import type { DealsCommandRepository } from './deals-command-repository.js';

export type CreateDealInput = {
  address: string;
  slug?: string;
  purchasePrice?: number;
  rehabCost?: number;
  arv?: number;
  holdingCosts?: number;
  projectedRoi?: number;
  status?: 'draft' | 'published' | 'funding' | 'closed' | 'archived';
  visibility?: 'marketplace' | 'invitation_only' | 'private';
  projectId?: string;
  id?: string;
};

export type DealCreateResult = {
  success: true;
  deal: DealRecord;
};

export type DealsCommandServiceDeps = {
  authz: AuthorizationService;
  repository: DealsCommandRepository;
};

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);
  return base || `deal${Date.now().toString(36)}`;
}

/**
 * Framework-neutral mutation use-case for POST /api/deals.
 * DB-only — no email/broadcast side effects.
 */
export class DealsCommandService {
  constructor(private readonly deps: DealsCommandServiceDeps) {}

  async createDeal(user: AuthUser, input: CreateDealInput): Promise<DealCreateResult> {
    this.deps.authz.assertPermission(user, 'deals.create');

    const address = input.address?.trim();
    if (!address) {
      throw new DealsCommandValidationError('address is required');
    }

    if (input.projectId) {
      await this.deps.authz.assertProjectAccess(user, input.projectId, 'projects.update');
    }

    let slug = (input.slug?.trim() || slugify(address)).toLowerCase();
    const existingSlug = await this.deps.repository.findBySlug(slug);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    if (input.id) {
      const existingId = await this.deps.repository.findById(input.id);
      if (existingId) {
        throw new DealsCommandValidationError('Deal id already exists');
      }
    }

    const deal = await this.deps.repository.create({
      ...(input.id ? { id: input.id } : {}),
      slug,
      address,
      purchasePrice: input.purchasePrice ?? 0,
      rehabCost: input.rehabCost ?? 0,
      arv: input.arv ?? 0,
      holdingCosts: input.holdingCosts ?? 0,
      projectedRoi: input.projectedRoi ?? 0,
      status: input.status ?? 'draft',
      visibility: input.visibility ?? 'private',
      creatorId: user.uid,
      projectId: input.projectId,
    });

    return { success: true, deal };
  }
}

export function createDealsCommandService(deps: DealsCommandServiceDeps): DealsCommandService {
  return new DealsCommandService(deps);
}
