/* ═══════════════════════════════════════════════════════
   PaperWorking — Listing Assembler (AQ-27)

   Pure function that snapshots a Project + lead investor
   profile into a DealListing shape. Used by the
   createDraftListing server action.
   ═══════════════════════════════════════════════════════ */

import type { Project } from '@/types/schema';
import type { DealListing, ListingLeadInvestor } from '@/types/listing';

export class ListingAssemblyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ListingAssemblyError';
  }
}

/**
 * Assembles a listing snapshot from project data + lead investor profile.
 * Throws ListingAssemblyError if required fields are missing.
 *
 * Returns everything except id, timestamps, status, and counters
 * (those are set by the server action at write time).
 */
export function assembleListingFromProject(
  project: Project,
  leadInvestor: ListingLeadInvestor,
): Omit<DealListing, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'followCount' | 'viewCount'> {
  // ── Validation ──
  if (!project.address) {
    throw new ListingAssemblyError('Project must have an address to create a listing.');
  }

  if (project.financials?.capitalPlan !== 'raise interest') {
    throw new ListingAssemblyError(
      'Only projects with capital plan "raise interest" can be posted to the marketplace.'
    );
  }

  if (!project.financials?.equityTerms) {
    throw new ListingAssemblyError(
      'Equity terms must be configured before posting to the marketplace.'
    );
  }

  if (!leadInvestor.uid || !leadInvestor.displayName) {
    throw new ListingAssemblyError('Lead investor profile is incomplete.');
  }

  // ── Derive neighborhood ──
  const neighborhood = deriveNeighborhood(project);

  // ── Snapshot financial metrics ──
  const fin = project.financials;

  return {
    projectId: project.id,
    propertyId: project.propertyId,
    placeId: project.placeId,
    organizationId: project.organizationId,
    ownerUid: project.ownerUid,
    visibilityMode: 'PRIVATE' as const,
    transitionLog: [],

    // Property
    propertyName: project.propertyName,
    address: project.address,
    neighborhood,
    city: project.city || '',
    state: project.state || '',
    zipCode: project.zip || '',
    assetClass: project.assetClass || 'Residential',
    subStrategy: project.subStrategy || '',

    // Financial metrics
    askingPriceCents: project.askingPriceCents ?? fin.purchasePrice,
    capRate: fin.capRate,
    cashOnCash: fin.cashOnCashReturn,
    projectedROI: (fin as unknown as Record<string, unknown>).projectedROI as number | undefined,
    netOperatingIncome: fin.netOperatingIncome,

    // Equity terms
    equityTerms: fin.equityTerms
      ? {
          fundingTarget: fin.equityTerms.funding_target,
          equityOfferedPct: fin.equityTerms.equity_offered_pct,
          minTicket: fin.equityTerms.min_ticket,
          priceBasis: fin.equityTerms.price_basis,
        }
      : undefined,
    capitalPlan: fin.capitalPlan || 'raise interest',

    // Lead Investor
    leadInvestor: {
      uid: leadInvestor.uid,
      displayName: leadInvestor.displayName,
      bio: leadInvestor.bio,
      avatarUrl: leadInvestor.avatarUrl,
    },
  };
}

/**
 * Derives a neighborhood label from project fields.
 * Priority: submarket > city + state > "Undisclosed Location"
 */
function deriveNeighborhood(project: Project): string {
  if (project.submarket) {
    // If submarket includes state info, use as-is
    return project.submarket;
  }

  const parts: string[] = [];
  if (project.city) parts.push(project.city);
  if (project.state) parts.push(project.state);

  return parts.length > 0 ? parts.join(', ') : 'Undisclosed Location';
}
