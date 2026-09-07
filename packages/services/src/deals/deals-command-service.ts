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
  projectedMonthlyRent?: number;
  status?: 'draft' | 'published' | 'funding' | 'closed' | 'archived';
  visibility?: 'marketplace' | 'invitation_only' | 'private';
  projectId?: string;
  id?: string;
};

export type UpdateDealInput = {
  purchasePrice?: number;
  rehabCost?: number;
  arv?: number;
  holdingCosts?: number;
  projectedRoi?: number;
  projectedMonthlyRent?: number;
  status?: CreateDealInput['status'];
  visibility?: CreateDealInput['visibility'];
  projectId?: string;
};

export type DealUpdateResult = {
  success: true;
  deal: DealRecord;
};

export type DealCreateResult = {
  success: true;
  deal: DealRecord;
};

export type DealGetResult = {
  success: true;
  deal: DealRecord & { projectId?: string | null };
};

export type DealsCommandServiceDeps = {
  authz: AuthorizationService;
  repository: DealsCommandRepository;
};

/** URL-safe deal slug: letters and digits only (no commas, spaces, or punctuation). */
export function slugifyDealSlug(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 48);
  return base || `deal${Date.now().toString(36)}`;
}

/** Undo one or more rounds of encodeURIComponent on a route/query slug. */
export function decodeDealSlugParam(slug: string): string {
  let current = slug.trim();
  for (let i = 0; i < 3; i += 1) {
    try {
      const next = decodeURIComponent(current);
      if (next === current) break;
      current = next;
    } catch {
      break;
    }
  }
  return current;
}

/**
 * Lookup candidates for a client-supplied slug.
 * Create persists slugifyDealSlug(); clients often PATCH/GET with the original
 * hyphenated (or punctuated) value — try exact decoded form first, then slugified.
 */
export function dealSlugLookupCandidates(slug: string): string[] {
  const trimmed = decodeDealSlugParam(slug ?? '');
  if (!trimmed) return [];
  const slugified = slugifyDealSlug(trimmed);
  return [...new Set([trimmed, slugified].filter(Boolean))];
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

    let slug = slugifyDealSlug(input.slug?.trim() || address);
    const existingSlug = await this.deps.repository.findBySlug(slug);
    if (existingSlug) {
      // Keep alphanumeric-only; do not reintroduce hyphens after slugify.
      slug = `${slug}${Date.now().toString(36).slice(-4)}`;
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
      projectedMonthlyRent: input.projectedMonthlyRent,
      status: input.status ?? 'draft',
      visibility: input.visibility ?? 'private',
      creatorId: user.uid,
      projectId: input.projectId,
    });

    return { success: true, deal };
  }

  private async resolveDealBySlugParam(
    slug: string,
  ): Promise<{ deal: DealRecord; storedSlug: string } | null> {
    for (const candidate of dealSlugLookupCandidates(slug)) {
      const deal = await this.deps.repository.getBySlug(candidate);
      if (deal) {
        return { deal, storedSlug: deal.slug || candidate };
      }
    }
    return null;
  }

  async updateDealBySlug(user: AuthUser, slug: string, input: UpdateDealInput): Promise<DealUpdateResult> {
    if (dealSlugLookupCandidates(slug).length === 0) {
      throw new DealsCommandValidationError('slug is required');
    }

    const resolved = await this.resolveDealBySlugParam(slug);
    if (!resolved) {
      throw new DealsCommandValidationError('Deal not found');
    }

    await this.deps.authz.assertDealAccess(user, resolved.deal.id, 'deals.update');

    if (input.projectId) {
      await this.deps.authz.assertProjectAccess(user, input.projectId, 'projects.update');
    }

    const deal = await this.deps.repository.updateBySlug(resolved.storedSlug, input);
    return { success: true, deal };
  }

  async getDealBySlug(user: AuthUser, slug: string): Promise<DealGetResult> {
    if (dealSlugLookupCandidates(slug).length === 0) {
      throw new DealsCommandValidationError('slug is required');
    }

    const resolved = await this.resolveDealBySlugParam(slug);
    if (!resolved) {
      throw new DealsCommandValidationError('Deal not found');
    }

    await this.deps.authz.assertDealAccess(user, resolved.deal.id, 'deals.read');
    return { success: true, deal: resolved.deal };
  }
}

export function createDealsCommandService(deps: DealsCommandServiceDeps): DealsCommandService {
  return new DealsCommandService(deps);
}
