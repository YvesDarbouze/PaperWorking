/* ═══════════════════════════════════════════════════════
   PaperWorking — Deal Listing Types (AQ-27)

   Type definitions for the Marketplace Posting feature.
   One listing, two renderings: full (subscriber) vs
   obfuscated teaser (public).
   ═══════════════════════════════════════════════════════ */

import type { EquityTerms } from './schema';

// ── Lifecycle ────────────────────────────────────────────
export type ListingStatus = 'draft' | 'published' | 'paused' | 'closed';
export type ClosedReason = 'manual' | 'auto_phase_advance' | 'project_archived';

// ── Lead Investor (public-safe subset) ───────────────────
export interface ListingLeadInvestor {
  uid: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}

// ── Core Listing Document ────────────────────────────────
export interface DealListing {
  id: string;
  projectId: string;
  organizationId: string;
  ownerUid: string;

  // Lifecycle
  status: ListingStatus;
  closedReason?: ClosedReason;

  // Property snapshot (captured at publish, refreshable)
  propertyName: string;
  address: string;              // full — only served to subscribers
  neighborhood: string;         // derived from city/submarket
  city: string;
  state: string;
  zipCode: string;
  assetClass: string;           // Residential | Multi-Family | Commercial | Land
  subStrategy: string;          // FLIP | BRRRR | etc.
  latitude?: number;
  longitude?: number;

  // Financial metrics snapshot
  askingPriceCents?: number;
  capRate?: number;
  cashOnCash?: number;
  projectedROI?: number;
  netOperatingIncome?: number;

  // Terms snapshot (from EquityTerms)
  equityTerms?: {
    fundingTarget: number;      // cents
    equityOfferedPct: number;
    minTicket: number;          // cents
    priceBasis: number;         // cents
  };
  capitalPlan: string;

  // Lead Investor (public-safe subset)
  leadInvestor: ListingLeadInvestor;

  // Counters
  followCount: number;
  viewCount: number;

  // Timestamps
  createdAt: string;
  publishedAt?: string;
  pausedAt?: string;
  closedAt?: string;
  updatedAt: string;
}

// ── Obfuscated Teaser ────────────────────────────────────
// This is the shape of data returned to non-subscribers.
// No full address, no exact terms, no contact info.
export interface DealListingTeaser {
  id: string;
  projectId: string;
  status: ListingStatus;

  // Location (neighborhood only)
  propertyName: string;
  neighborhood: string;          // e.g. "Brooklyn, NY"
  city: string;
  state: string;
  assetClass: string;
  subStrategy: string;
  latitude?: number;
  longitude?: number;

  // Obfuscated metrics (ranges / approximations)
  capRateRange?: string;         // e.g. "4–5%"
  cashOnCashRange?: string;      // e.g. "8–10%"
  projectedROIRange?: string;    // e.g. "20–25%"
  askingPriceApprox?: string;    // e.g. "~$100K"

  // Obfuscated terms
  fundingTargetApprox?: string;  // e.g. "Seeking ~$100K"
  minTicketApprox?: string;      // e.g. "~$25K minimum"

  // Lead Investor (name only, no contact)
  leadInvestorName: string;

  // Counters
  followCount: number;
  viewCount: number;

  // Timestamps
  publishedAt?: string;
}

// ── Obfuscation Config ───────────────────────────────────
export type ObfuscationStrategy = 'neighborhood' | 'range' | 'approximate' | 'hidden' | 'summary';

export interface ObfuscationRule {
  strategy: ObfuscationStrategy;
  /** For 'range' strategy: percentage band width (e.g. 1 → ±0.5%) */
  bandPct?: number;
}

export type ObfuscationMap = Record<string, ObfuscationRule>;

// ── Investor Follow Edge ─────────────────────────────────
export interface InvestorFollowEdge {
  id: string;                    // `{investorUid}_{followerUid}`
  investorUid: string;
  followerUid: string;
  followerName: string;
  followerEmail: string;
  emailConsent: boolean;
  inAppConsent: boolean;
  followedAt: string;
}

// ── Commitment Expression (Respond to Terms) ─────────────
export interface CommitmentExpression {
  id: string;
  listingId: string;
  projectId: string;
  investorUid: string;
  investorName: string;
  investorEmail: string;
  amountCents: number;           // expressed interest amount
  message?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}
