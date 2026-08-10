/* ═══════════════════════════════════════════════════════
   PaperWorking — Obfuscation Engine (AQ-27)

   Single config object + pure functions that transform
   a full DealListing into a public DealListingTeaser.
   This is the ONE place that controls what non-subscribers
   see. No full address, no exact terms, no documents.
   ═══════════════════════════════════════════════════════ */

import type { DealListing, DealListingTeaser, ObfuscationMap } from '@/types/listing';

// ── The Config Object ────────────────────────────────────
// One object governs all obfuscation. Change this to
// adjust what the public teaser reveals.
export const OBFUSCATION_MAP: ObfuscationMap = {
  address:             { strategy: 'neighborhood' },
  capRate:             { strategy: 'range', bandPct: 1 },
  cashOnCash:          { strategy: 'range', bandPct: 2 },
  projectedROI:        { strategy: 'range', bandPct: 5 },
  askingPriceCents:    { strategy: 'approximate' },
  fundingTarget:       { strategy: 'approximate' },
  minTicket:           { strategy: 'approximate' },
  equityOfferedPct:    { strategy: 'hidden' },
  documents:           { strategy: 'hidden' },
  leadInvestorContact: { strategy: 'hidden' },
  terms:               { strategy: 'summary' },
} as const;

// ── Pure Helpers ─────────────────────────────────────────

/**
 * Rounds a percentage to the nearest band and returns a range string.
 * Example: obfuscateRange(4.73, 1) → "4–5%"
 */
export function obfuscateRange(value: number | undefined, bandPct: number): string | undefined {
  if (value == null || isNaN(value)) return undefined;
  const low = Math.floor(value / bandPct) * bandPct;
  const high = low + bandPct;
  return `${low}–${high}%`;
}

/**
 * Rounds cents to a human-friendly approximate string.
 * Example: obfuscateApproximate(9750000) → "~$100K"
 *          obfuscateApproximate(125000000) → "~$1.3M"
 */
export function obfuscateApproximate(cents: number | undefined): string | undefined {
  if (cents == null || isNaN(cents)) return undefined;
  const dollars = cents / 100;

  if (dollars >= 1_000_000) {
    const millions = Math.round(dollars / 100_000) / 10; // one decimal
    return `~$${millions}M`;
  }
  if (dollars >= 1_000) {
    const thousands = Math.round(dollars / 1_000) * 1_000;
    if (thousands >= 1_000_000) {
      return `~$${(thousands / 1_000_000).toFixed(1)}M`;
    }
    return `~$${(thousands / 1_000).toFixed(0)}K`;
  }
  // Below $1K — just round to nearest $100
  const rounded = Math.round(dollars / 100) * 100;
  return `~$${rounded}`;
}

/**
 * Builds a DealListingTeaser from a full DealListing.
 * This is the ONLY function that should produce teaser data.
 * It strips all sensitive fields and applies the obfuscation map.
 */
export function buildTeaserFromListing(listing: DealListing): DealListingTeaser {
  const map = OBFUSCATION_MAP;

  // Single headline figure: asking price if available, otherwise funding target
  const headlinePrice = obfuscateApproximate(listing.askingPriceCents);
  const headlineFunding = listing.equityTerms?.fundingTarget
    ? `Seeking ${obfuscateApproximate(listing.equityTerms.fundingTarget)}`
    : undefined;

  return {
    id: listing.id,
    projectId: listing.projectId,
    propertyId: listing.propertyId,
    placeId: listing.placeId,
    status: listing.status,

    // Location — city and state (no full street address)
    propertyName: listing.propertyName,
    neighborhood: listing.neighborhood || `${listing.city}, ${listing.state}`,
    city: listing.city,
    state: listing.state,
    assetClass: listing.assetClass,
    subStrategy: listing.subStrategy,
    latitude: listing.latitude,
    longitude: listing.longitude,

    // ONE Headline Figure (Asking price or Raise target)
    askingPriceApprox: headlinePrice,
    fundingTargetApprox: !headlinePrice ? headlineFunding : undefined,

    // Gated fields — suppressed from public teaser payload
    capRateRange: undefined,
    cashOnCashRange: undefined,
    projectedROIRange: undefined,
    minTicketApprox: undefined,
    leadInvestorName: 'Lead Investor', // Generic label; lister identity gated behind auth

    // Counters
    followCount: listing.followCount,
    viewCount: listing.viewCount,

    // Timestamps
    publishedAt: listing.publishedAt,
    isCrowdfunding: listing.isCrowdfunding ?? false,
  };
}
