import { mapRawDealToPayload } from './map-deal.js';
import type { DealPreview, RawDealRecord } from './types.js';

export function normalizeDealSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function mapRawDealToPreview(dbDeal: RawDealRecord): DealPreview {
  const payload = mapRawDealToPayload(dbDeal);
  const project = dbDeal.projects?.[0];

  return {
    id: payload.id,
    slug: payload.slug,
    name: project?.name || project?.title || dbDeal.address,
    address: payload.address,
    price: payload.purchasePrice,
    roi: payload.projectedRoi,
    status: dbDeal.status as DealPreview['status'],
    visibility: payload.visibility,
    creatorName: dbDeal.creator?.name || 'Deal Creator',
    creatorId: payload.creatorId,
    invitedUsers: payload.invitedUsers,
    committed: payload.committedAmount,
    target: payload.fundingTarget,
    assetClass: payload.assetClass,
    subStrategy: payload.subStrategy,
  };
}

export function evaluateDealVisibility(
  deal: DealPreview,
  userId: string,
): { exists: boolean; deal: DealPreview | null } {
  const visibility = deal.visibility || 'marketplace';
  const isCreator = deal.creatorId === userId;
  const isInvited = deal.invitedUsers?.includes(userId);

  if (visibility === 'invitation_only' && !isInvited && !isCreator) {
    return { exists: false, deal: null };
  }

  if (visibility === 'private' && !isCreator) {
    return { exists: false, deal: null };
  }

  return { exists: true, deal };
}
