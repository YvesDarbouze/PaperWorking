'use client';

import React from 'react';
import Link from 'next/link';
import type { DealListingTeaser } from '@/types/listing';

/* ═══════════════════════════════════════════════════════
   ListingCard (AQ-27)
   
   Card for the deal discovery browse grid.
   Shows obfuscated teaser data with a link to the
   full listing page at /deals/[listingId].
   ═══════════════════════════════════════════════════════ */

interface ListingCardProps {
  teaser: DealListingTeaser;
  className?: string;
}

export default function ListingCard({ teaser, className = '' }: ListingCardProps) {
  return (
    <Link
      href={`/deals/${teaser.id}`}
      className={`
        glass-card rounded-xl border border-pw-border
        flex flex-col gap-4 p-5
        transition-all duration-200
        hover:border-[var(--color-primary)]/30
        hover:shadow-lg hover:shadow-[var(--color-primary)]/5
        group
        ${className}
      `}
    >
      {/* Top row: badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] px-2 py-0.5 rounded-full border border-pw-border">
          {teaser.assetClass}
        </span>
        {teaser.subStrategy && (
          <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5">
            {teaser.subStrategy}
          </span>
        )}
      </div>

      {/* Property info */}
      <div className="space-y-1">
        <h3 className="text-base font-bold text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors line-clamp-1">
          {teaser.propertyName}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span className="material-symbols-outlined text-sm">location_on</span>
          {teaser.neighborhood}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-3">
        {teaser.capRateRange && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              Cap Rate
            </p>
            <p className="text-sm font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
              {teaser.capRateRange}
            </p>
          </div>
        )}
        {teaser.askingPriceApprox && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              Price
            </p>
            <p className="text-sm font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
              {teaser.askingPriceApprox}
            </p>
          </div>
        )}
        {teaser.cashOnCashRange && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              Cash-on-Cash
            </p>
            <p className="text-sm font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
              {teaser.cashOnCashRange}
            </p>
          </div>
        )}
        {teaser.fundingTargetApprox && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
              Seeking
            </p>
            <p className="text-sm font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
              {teaser.fundingTargetApprox}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-pw-border">
        <div className="flex items-center gap-3 text-[10px] text-[var(--color-muted)]">
          <span className="flex items-center gap-0.5">
            <span className="material-symbols-outlined text-xs">bookmark</span>
            {teaser.followCount}
          </span>
          <span className="flex items-center gap-0.5">
            <span className="material-symbols-outlined text-xs">visibility</span>
            {teaser.viewCount}
          </span>
        </div>
        <span className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          View Deal
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </span>
      </div>
    </Link>
  );
}
