'use client';

import React from 'react';
import type { DealListing } from '@/types/listing';
import ListingStatusBadge from './ListingStatusBadge';
import FollowDealButton from './FollowDealButton';
import FollowInvestorButton from './FollowInvestorButton';
import RespondToTermsButton from './RespondToTermsButton';

/* ═══════════════════════════════════════════════════════
   DealFullView (AQ-27)
   
   Full subscriber rendering of a deal listing.
   Shows: address, exact metrics, equity terms table,
   lead investor profile, action bar.
   
   Only rendered for authenticated Investor/Team accounts
   with an active subscription. Vendors never see this.
   ═══════════════════════════════════════════════════════ */

interface DealFullViewProps {
  listing: DealListing;
  followStatus: { followingDeal: boolean; followingInvestor: boolean };
  onFollowChange?: () => void;
}

export default function DealFullView({ listing, followStatus, onFollowChange }: DealFullViewProps) {
  const formatCents = (cents: number | undefined) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const formatPct = (pct: number | undefined) => {
    if (pct == null) return '—';
    return `${pct.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <ListingStatusBadge status={listing.status} />
              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] px-2 py-0.5 rounded-full border border-pw-border">
                {listing.assetClass}
              </span>
              {listing.subStrategy && (
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5">
                  {listing.subStrategy}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
              {listing.propertyName}
            </h1>
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <span className="material-symbols-outlined text-base">location_on</span>
              {listing.address}
            </div>
          </div>

          {/* Asking Price */}
          {listing.askingPriceCents && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
                Asking Price
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
                {formatCents(listing.askingPriceCents)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Key Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Cap Rate', value: formatPct(listing.capRate), icon: 'trending_up' },
          { label: 'Cash-on-Cash', value: formatPct(listing.cashOnCash), icon: 'account_balance' },
          { label: 'Projected ROI', value: formatPct(listing.projectedROI), icon: 'insights' },
          { label: 'NOI', value: formatCents(listing.netOperatingIncome), icon: 'payments' },
        ].map((metric) => (
          <div
            key={metric.label}
            className="glass-card rounded-xl border border-pw-border p-4 space-y-1"
          >
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[var(--color-muted)]">
                {metric.icon}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)]">
                {metric.label}
              </p>
            </div>
            <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Equity Terms ── */}
      {listing.equityTerms && (
        <div className="glass-card rounded-2xl border border-pw-border p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">receipt_long</span>
            Equity Terms
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
                Funding Target
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
                {formatCents(listing.equityTerms.fundingTarget)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
                Equity Offered
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
                {listing.equityTerms.equityOfferedPct.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
                Min. Ticket
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
                {formatCents(listing.equityTerms.minTicket)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
                Price Basis
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
                {formatCents(listing.equityTerms.priceBasis)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Lead Investor Profile ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-6">
        <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">person</span>
          Lead Investor
        </h2>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center flex-shrink-0">
            {listing.leadInvestor.avatarUrl ? (
              <img
                src={listing.leadInvestor.avatarUrl}
                alt={listing.leadInvestor.displayName}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-2xl text-[var(--color-primary)]">
                person
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[var(--color-on-surface)]">
              {listing.leadInvestor.displayName}
            </p>
            {listing.leadInvestor.bio && (
              <p className="text-sm text-[var(--color-muted)] mt-1 line-clamp-3">
                {listing.leadInvestor.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FollowDealButton
            listingId={listing.id}
            projectId={listing.projectId}
            isFollowing={followStatus.followingDeal}
            onFollowChange={() => onFollowChange?.()}
          />
          <FollowInvestorButton
            investorUid={listing.leadInvestor.uid}
            investorName={listing.leadInvestor.displayName}
            isFollowing={followStatus.followingInvestor}
            onFollowChange={() => onFollowChange?.()}
          />
          <RespondToTermsButton
            listingId={listing.id}
            projectId={listing.projectId}
            minTicketCents={listing.equityTerms?.minTicket}
            fundingTargetCents={listing.equityTerms?.fundingTarget}
            equityOfferedPct={listing.equityTerms?.equityOfferedPct}
          />

          {/* Follow / View counters */}
          <div className="ml-auto flex items-center gap-4 text-xs text-[var(--color-muted)]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">bookmark</span>
              {listing.followCount} followers
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">visibility</span>
              {listing.viewCount} views
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
