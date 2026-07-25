/* ═══════════════════════════════════════════════════════
   PaperWorking — Deal Listing Types (AQ-27)

   Type definitions for the Marketplace Posting feature.
   One listing, two renderings: full (subscriber) vs
   obfuscated teaser (public).
   ═══════════════════════════════════════════════════════ */

import type { EquityTerms } from './schema';

// ── Lifecycle ────────────────────────────────────────────
export type ListingStatus = 'draft' | 'published' | 'paused' | 'closed' | 'withdrawn' | 'takedown_review';
export type ClosedReason = 'manual' | 'auto_phase_advance' | 'project_archived';

// ── Visibility (DM-6 / DM-D1) ───────────────────────────
// PRIVATE:           Only the owner and explicitly invited investors can see this deal.
// MARKETPLACE:       Visible to all platform subscribers (obfuscated teaser to non-subscribers).
// PUBLIC_SOLICITED:  Visible to anyone — IRREVERSIBLE once set. Gated by DM-D1.
export type VisibilityMode = 'PRIVATE' | 'MARKETPLACE' | 'PUBLIC_SOLICITED';

export interface DealTransitionEntry {
  from: ListingStatus;
  to: ListingStatus;
  performedBy: string;        // UID of actor
  performedAt: string;        // ISO-8601 timestamp
  reason?: string;            // Human-readable reason
  visibilityBefore?: VisibilityMode;
  visibilityAfter?: VisibilityMode;
  publicSolicitationAcknowledgment?: string; // Logged typed acknowledgment for general solicitation
}

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
  propertyId?: string;
  placeId?: string;
  organizationId: string;
  ownerUid: string;

  // Lifecycle
  status: ListingStatus;
  closedReason?: ClosedReason;
  visibilityMode: VisibilityMode;
  publicSolicitationAcknowledgment?: string;
  publicSolicitationAcknowledgedAt?: string;

  // Withdrawal tracking (DM-6)
  withdrawnAt?: string;
  withdrawnBy?: string;         // UID of who withdrew

  // Audit trail (DM-6)
  transitionLog: DealTransitionEntry[];
  exposedDocumentIds?: string[];

  // Versioning (DM-23)
  version?: number;
  versions?: any[];

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

  // Disclosure and gate tracking
  disclosureAcknowledgedForMode?: VisibilityMode | null;
  controlStatus?: 'owned' | 'under-contract' | 'option' | 'exclusive_right' | 'none' | null;
  publishGateResult?: PublishGateResult | null;

  // Timestamps
  createdAt: string;
  publishedAt?: string;
  pausedAt?: string;
  closedAt?: string;
  updatedAt: string;
  isCrowdfunding?: boolean;
}

// ── Obfuscated Teaser ────────────────────────────────────
// This is the shape of data returned to non-subscribers.
// No full address, no exact terms, no contact info.
export interface DealListingTeaser {
  id: string;
  projectId: string;
  propertyId?: string;
  placeId?: string;
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
  isCrowdfunding?: boolean;
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

// ── Deal Search Result (DM-7) ────────────────────────────
// Discriminated union for address search results.
// Visibility governs what an anonymous principal receives.
export interface ResolvedAddress {
  placeId: string;
  formattedAddress: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
}

export type DealSearchResult =
  | { mode: 'public_solicited'; teaser: DealListingTeaser }
  | { mode: 'marketplace'; listingId: string; exists: true }
  | { mode: 'not_found' }
  | { mode: 'cold_start'; address: string; resolvedAddress?: ResolvedAddress };

import type { Project } from './schema';
import type { ActiveProjectMetrics } from '@/lib/metrics';

export interface SubscriberDealMatch {
  listing: DealListing;
  metrics: ActiveProjectMetrics;
  project: Project;
}

export interface SubscriberPropertyResult {
  propertyId?: string;
  placeId?: string;
  canonicalAddress: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: { lat: number; lng: number };
  deals: SubscriberDealMatch[];
}

export interface SubscriberSearchResult {
  mode: 'results' | 'cold_start';
  results?: SubscriberPropertyResult[];
  address?: string;
  resolvedAddress?: ResolvedAddress;
}

export type DealSortOption = 'relevance' | 'freshness' | 'yield' | 'activity' | 'price_asc' | 'price_desc';

export interface PublishGateCriterion {
  key: string;
  label: string;
  status: boolean;
  isRed: boolean;
  detail?: string;
}

export interface PublishGateResult {
  passed: boolean;
  evaluatedAt: string;
  overrideReason?: string;
  criteria: PublishGateCriterion[];
}
