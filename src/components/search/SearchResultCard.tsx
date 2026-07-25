'use client';

/* ═══════════════════════════════════════════════════════
   SearchResultCard — DM-7

   Renders the DealSearchResult discriminated union.
   Each mode produces a visually distinct card:
   • public_solicited → Non-financial property attributes
   • marketplace     → Existence only
   • cold_start      → ColdStartSurface (DM-D10)
   • not_found       → ColdStartSurface (fallback)
   ═══════════════════════════════════════════════════════ */

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Users, Eye, ArrowRight, Lock } from 'lucide-react';
import type { DealSearchResult, DealListingTeaser } from '@/types/listing';
import ColdStartSurface from './ColdStartSurface';

interface SearchResultCardProps {
  result: DealSearchResult;
  className?: string;
}

export default function SearchResultCard({ result, className = '' }: SearchResultCardProps) {
  switch (result.mode) {
    case 'public_solicited':
      return <PublicSolicitedCard teaser={result.teaser} className={className} />;
    case 'marketplace':
      return <MarketplaceExistsCard listingId={result.listingId} className={className} />;
    case 'cold_start':
      return <ColdStartSurface address={result.address} resolvedAddress={result.resolvedAddress} className={className} />;
    case 'not_found':
      return <ColdStartSurface address="" className={className} />;
    default:
      return null;
  }
}

// ── PUBLIC_SOLICITED: Non-financial attributes ──────────
function PublicSolicitedCard({
  teaser,
  className,
}: {
  teaser: DealListingTeaser;
  className: string;
}) {
  return (
    <div className={`glass-card rounded-2xl border border-pw-border overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Building2 className="w-4.5 h-4.5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-on-surface">
              {teaser.propertyName}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant/60">
              <MapPin className="w-3 h-3" />
              {teaser.neighborhood}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          ACTIVE DEAL
        </span>
      </div>

      {/* Attributes grid */}
      <div className="grid grid-cols-2 gap-2 p-4">
        <AttributeCell label="Asset Class" value={teaser.assetClass} />
        <AttributeCell label="Strategy" value={teaser.subStrategy} />
        <AttributeCell label="Lead Investor" value={teaser.leadInvestorName} />
        <AttributeCell label="Interest" value={`${teaser.followCount} following`} />
      </div>

      {/* Subscribe CTA */}
      <div className="px-4 pb-4">
        <Link
          href="/pricing"
          className="group flex items-center justify-center gap-2.5 w-full px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/15 transition-all duration-200"
        >
          Subscribe to see full details
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

// ── MARKETPLACE: Existence only ─────────────────────────
function MarketplaceExistsCard({
  listingId,
  className,
}: {
  listingId: string;
  className: string;
}) {
  return (
    <div className={`glass-card rounded-2xl border border-pw-border overflow-hidden ${className}`}>
      <div className="relative px-6 py-10 sm:px-10 sm:py-12 text-center">
        {/* Subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/6 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative">
          {/* Lock icon */}
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary/70" strokeWidth={1.5} />
          </div>

          <h3 className="text-lg font-bold text-on-surface tracking-tight mb-2">
            A deal exists at this address
          </h3>
          <p className="text-sm text-on-surface-variant/60 max-w-sm mx-auto mb-6 leading-relaxed">
            This property is listed on the PaperWorking marketplace.
            Subscribe to view the full deal analysis, terms, and lead investor details.
          </p>

          <Link
            href="/pricing"
            className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-primary text-on-primary font-semibold text-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
          >
            Subscribe to view
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Attribute Cell ──────────────────────────────────────
function AttributeCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container-low/60 rounded-xl px-4 py-3">
      <div className="font-jetbrains text-xs text-on-surface-variant/40 uppercase tracking-widest mb-1.5">
        {label}
      </div>
      <div className="text-[13px] font-semibold text-on-surface truncate">{value}</div>
    </div>
  );
}
