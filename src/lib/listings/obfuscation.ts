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

  return {
    id: listing.id,
    projectId: listing.projectId,
    status: listing.status,

    // Location — neighborhood only (never full address)
    propertyName: listing.propertyName,
    neighborhood: listing.neighborhood,
    city: listing.city,
    state: listing.state,
    assetClass: listing.assetClass,
    subStrategy: listing.subStrategy,
    latitude: listing.latitude,
    longitude: listing.longitude,

    // Obfuscated metrics
    capRateRange: obfuscateRange(listing.capRate, map.capRate.bandPct ?? 1),
    cashOnCashRange: obfuscateRange(listing.cashOnCash, map.cashOnCash.bandPct ?? 2),
    projectedROIRange: obfuscateRange(listing.projectedROI, map.projectedROI.bandPct ?? 5),
    askingPriceApprox: obfuscateApproximate(listing.askingPriceCents),

    // Obfuscated terms
    fundingTargetApprox: listing.equityTerms
      ? `Seeking ${obfuscateApproximate(listing.equityTerms.fundingTarget)}`
      : undefined,
    minTicketApprox: listing.equityTerms
      ? `${obfuscateApproximate(listing.equityTerms.minTicket)} minimum`
      : undefined,

    // Lead Investor — name only
    leadInvestorName: listing.leadInvestor.displayName,

    // Counters
    followCount: listing.followCount,
    viewCount: listing.viewCount,

    // Timestamps
    publishedAt: listing.publishedAt,
  };
}
