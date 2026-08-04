/* ═══════════════════════════════════════════════════════
   PaperWorking — Deals Marketplace Slug & Duplicate Utils
   (PROMPT 2 — Address-First Search + Deal Creation)
   ═══════════════════════════════════════════════════════ */

export interface DealData {
  id?: string;
  placeId?: string;
  slug?: string;
  displayAddress: string;
  streetNumber?: string;
  route?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat?: number;
  lng?: number;
  ownerId?: string;
  price: number;
  rehabCost: number;
  arv: number;
  estimatedRent?: number;
  status: 'DRAFT' | 'LISTED' | 'UNDER_REVIEW' | 'FUNDED' | 'CLOSED';
  fundingTarget?: number;
  currency?: string;
  analyzerSnapshotId?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
}

/**
 * Generate canonical slug by removing spaces and non-alphanumeric characters, lowercased.
 * Example: "123 Main St, Austin, TX 78701" -> "123mainstaustintx78701"
 */
export function generateDealSlug(address: string): string {
  if (!address || typeof address !== 'string') return '';
  return address
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes address for clean human-readable display.
 */
export function normalizeAddress(address: string): string {
  if (!address || typeof address !== 'string') return '';
  return address
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/,\s*,/g, ',');
}

/**
 * Enforces ONE Deal per property based on placeId or normalized slug.
 */
export function checkDuplicateDeal<T extends { id?: string; placeId?: string; slug?: string; displayAddress?: string }>(
  targetPlaceId?: string | null,
  targetSlug?: string | null,
  existingDeals: T[] = []
): { isDuplicate: boolean; existingDeal?: T } {
  if (!existingDeals || existingDeals.length === 0) {
    return { isDuplicate: false };
  }

  const normTargetPlaceId = targetPlaceId ? targetPlaceId.trim() : null;
  const normTargetSlug = targetSlug ? targetSlug.trim().toLowerCase() : null;

  for (const deal of existingDeals) {
    // Check placeId match
    if (normTargetPlaceId && deal.placeId && deal.placeId.trim() === normTargetPlaceId) {
      return { isDuplicate: true, existingDeal: deal };
    }

    // Check slug match
    if (normTargetSlug && deal.slug && deal.slug.trim().toLowerCase() === normTargetSlug) {
      return { isDuplicate: true, existingDeal: deal };
    }

    // Check address derived slug match
    if (deal.displayAddress && normTargetSlug && generateDealSlug(deal.displayAddress) === normTargetSlug) {
      return { isDuplicate: true, existingDeal: deal };
    }
  }

  return { isDuplicate: false };
}

/**
 * Constructs handoff payload for Deal Analyzer module without duplicating logic.
 */
export function createAnalyzerHandoffPayload(deal: {
  id?: string;
  displayAddress: string;
  price: number;
  rehabCost: number;
  arv: number;
  estimatedRent?: number;
  fundingTarget?: number;
}) {
  const snapshotId = `snap_${deal.id || 'draft'}_${Date.now()}`;
  return {
    analyzerSnapshotId: snapshotId,
    dealId: deal.id || null,
    address: deal.displayAddress,
    purchasePrice: deal.price || 0,
    rehabBudget: deal.rehabCost || 0,
    afterRepairValue: deal.arv || 0,
    monthlyRent: deal.estimatedRent || 0,
    fundingTarget: deal.fundingTarget || 0,
    timestamp: new Date().toISOString(),
  };
}
