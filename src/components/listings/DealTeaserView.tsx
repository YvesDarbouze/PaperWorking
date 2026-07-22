'use client';

import React from 'react';
import type { DealListingTeaser } from '@/types/listing';
import ListingStatusBadge from './ListingStatusBadge';
import SubscribeCTA from './SubscribeCTA';

/* ═══════════════════════════════════════════════════════
   DealTeaserView (AQ-27)
   
   Obfuscated public rendering of a deal listing.
   Shows: neighborhood (no street address), property type,
   rounded/range metrics, no documents, no contact, one
   CTA to subscribe.
   
   Rendered for unauthenticated users and non-subscribers.
   ═══════════════════════════════════════════════════════ */

interface DealTeaserViewProps {
  teaser: DealListingTeaser;
}

export default function DealTeaserView({ teaser }: DealTeaserViewProps) {
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <ListingStatusBadge status={teaser.status} />
              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] px-2 py-0.5 rounded-full border border-pw-border">
                {teaser.assetClass}
              </span>
              {teaser.subStrategy && (
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-primary)] px-2 py-0.5 rounded-full border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5">
                  {teaser.subStrategy}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
              {teaser.propertyName}
            </h1>
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <span className="material-symbols-outlined text-base">location_on</span>
              {teaser.neighborhood}
              {/* No street address — neighborhood only */}
            </div>
          </div>

          {/* Approximate asking price */}
          {teaser.askingPriceApprox && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
                Asking Price
              </p>
              <p className="text-2xl font-bold font-mono tabular-nums text-[var(--color-on-surface)]">
                {teaser.askingPriceApprox}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Obfuscated Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Cap Rate', value: teaser.capRateRange, icon: 'trending_up' },
          { label: 'Cash-on-Cash', value: teaser.cashOnCashRange, icon: 'account_balance' },
          { label: 'Projected ROI', value: teaser.projectedROIRange, icon: 'insights' },
        ]
          .filter((m) => m.value)
          .map((metric) => (
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

      {/* ── Obfuscated Terms Summary ── */}
      {(teaser.fundingTargetApprox || teaser.minTicketApprox) && (
        <div className="glass-card rounded-2xl border border-pw-border p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">receipt_long</span>
            Deal Highlights
          </h2>
          <div className="flex flex-wrap gap-4">
            {teaser.fundingTargetApprox && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-pw-border bg-[var(--color-surface)]/50">
                <span className="material-symbols-outlined text-base text-[var(--color-primary)]">
                  savings
                </span>
                <span className="text-sm font-medium text-[var(--color-on-surface)]">
                  {teaser.fundingTargetApprox}
                </span>
              </div>
            )}
            {teaser.minTicketApprox && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-pw-border bg-[var(--color-surface)]/50">
                <span className="material-symbols-outlined text-base text-[var(--color-primary)]">
                  confirmation_number
                </span>
                <span className="text-sm font-medium text-[var(--color-on-surface)]">
                  {teaser.minTicketApprox}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Blurred/Locked Sections ── */}
      <div className="space-y-4">
        {/* Blurred terms */}
        <div className="glass-card rounded-2xl border border-pw-border p-6 relative overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-md bg-[var(--color-surface)]/60 z-10 flex items-center justify-center">
            <div className="text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-[var(--color-muted)]">
                lock
              </span>
              <p className="text-sm font-medium text-[var(--color-muted)]">
                Full terms available to subscribers
              </p>
            </div>
          </div>
          {/* Placeholder content behind blur */}
          <div className="opacity-30">
            <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-4">
              Equity Terms
            </h2>
            <div className="grid grid-cols-4 gap-6">
              {['Funding Target', 'Equity Offered', 'Min. Ticket', 'Price Basis'].map((l) => (
                <div key={l}>
                  <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--color-muted)] mb-1">
                    {l}
                  </p>
                  <div className="h-6 bg-[var(--color-muted)]/20 rounded w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Blurred investor profile */}
        <div className="glass-card rounded-2xl border border-pw-border p-6 relative overflow-hidden">
          <div className="absolute inset-0 backdrop-blur-md bg-[var(--color-surface)]/60 z-10 flex items-center justify-center">
            <div className="text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-[var(--color-muted)]">
                person_off
              </span>
              <p className="text-sm font-medium text-[var(--color-muted)]">
                Investor profile available to subscribers
              </p>
            </div>
          </div>
          <div className="opacity-30">
            <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-[var(--color-muted)] mb-4">
              Lead Investor
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[var(--color-muted)]/10" />
              <div className="space-y-2 flex-1">
                <p className="text-base font-bold text-[var(--color-on-surface)]">
                  {teaser.leadInvestorName}
                </p>
                <div className="h-4 bg-[var(--color-muted)]/20 rounded w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Subscribe CTA ── */}
      <SubscribeCTA />

      {/* ── Footer Counters ── */}
      <div className="flex items-center justify-center gap-6 text-xs text-[var(--color-muted)]">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">bookmark</span>
          {teaser.followCount} followers
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">visibility</span>
          {teaser.viewCount} views
        </span>
      </div>
    </div>
  );
}
