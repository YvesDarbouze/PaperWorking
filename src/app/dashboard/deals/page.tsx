'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPublishedListings } from '@/actions/listings';
import type { DealListingTeaser } from '@/types/listing';
import ListingCard from '@/components/listings/ListingCard';
import posthog from 'posthog-js';

/* ═══════════════════════════════════════════════════════════════
   Deal Discovery — AQ-27
   Browse published deal listings from lead investors.
   ═══════════════════════════════════════════════════════════════ */

const ASSET_CLASSES = ['All', 'Residential', 'Multi-Family', 'Commercial', 'Land'] as const;
const STRATEGIES   = ['All', 'FLIP', 'BRRRR', 'BUY AND HOLD', 'WHOLESALE'] as const;

type AssetClassFilter = (typeof ASSET_CLASSES)[number];
type StrategyFilter   = (typeof STRATEGIES)[number];

// ── Skeleton loader ──────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="glass-card rounded-xl border border-pw-border p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-16 rounded-full bg-[var(--color-muted)]/15" />
        <div className="h-4 w-12 rounded-full bg-[var(--color-muted)]/10" />
      </div>
      <div className="h-5 w-3/4 rounded bg-[var(--color-muted)]/15 mb-2" />
      <div className="h-4 w-1/2 rounded bg-[var(--color-muted)]/10 mb-4" />
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="h-10 rounded-lg bg-[var(--color-muted)]/10" />
        <div className="h-10 rounded-lg bg-[var(--color-muted)]/10" />
      </div>
      <div className="flex items-center gap-2 mt-auto">
        <div className="h-6 w-6 rounded-full bg-[var(--color-muted)]/15" />
        <div className="h-3 w-24 rounded bg-[var(--color-muted)]/10" />
      </div>
    </div>
  );
}

export default function DealsPage() {
  const { user, profile } = useAuth();

  const [assetClass, setAssetClass] = useState<AssetClassFilter>('All');
  const [strategy, setStrategy]     = useState<StrategyFilter>('All');
  const [teasers, setTeasers]       = useState<DealListingTeaser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const isVendor = profile?.accountType === 'vendor' || profile?.role === 'Vendor' || profile?.subscriptionPlan === 'Vendor Network';

  // ── Fetch listings ──────────────────────────────────────
  const fetchListings = useCallback(async () => {
    if (isVendor) {
      setTeasers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filters: { assetClass?: string; subStrategy?: string } = {};
      if (assetClass !== 'All') filters.assetClass = assetClass;
      if (strategy !== 'All')   filters.subStrategy = strategy;

      const data = await getPublishedListings(filters);
      setTeasers(data);
    } catch (err) {
      console.error('Failed to fetch deals:', err);
      setError('Unable to load deal listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [assetClass, strategy, isVendor]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // ── Telemetry ────────────────────────────────────────────
  useEffect(() => {
    const filters: Record<string, string> = {};
    if (assetClass !== 'All') filters.assetClass = assetClass;
    if (strategy !== 'All')   filters.subStrategy = strategy;

    posthog.capture('deal_discovery_viewed', { filters });
  }, [assetClass, strategy]);

  // ── Chip helper ──────────────────────────────────────────
  function Chip<T extends string>({
    label,
    value,
    active,
    onClick,
  }: {
    label: string;
    value: T;
    active: boolean;
    onClick: (v: T) => void;
  }) {
    return (
      <button
        onClick={() => onClick(value)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-[0.05em] transition-all border ${
          active
            ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/30'
            : 'text-[var(--color-muted)] border-pw-border hover:border-[var(--color-primary)]/20'
        }`}
      >
        {label}
      </button>
    );
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
          Discover Deals
        </h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">
          Browse active deal listings from lead investors across the platform.
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-2">
        {/* Asset Class */}
        <div className="flex flex-wrap gap-2">
          {ASSET_CLASSES.map((ac) => (
            <Chip
              key={ac}
              label={ac}
              value={ac}
              active={assetClass === ac}
              onClick={setAssetClass}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 self-center bg-pw-border" />

        {/* Strategy */}
        <div className="flex flex-wrap gap-2">
          {STRATEGIES.map((s) => (
            <Chip
              key={s}
              label={s}
              value={s}
              active={strategy === s}
              onClick={setStrategy}
            />
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="glass-card rounded-2xl border border-red-500/30 p-6 text-center">
          <span className="material-symbols-outlined text-3xl text-red-400 block mb-2">
            error
          </span>
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={fetchListings}
            className="mt-3 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-[0.05em] bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/25 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Listing grid */}
      {!error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : isVendor ? (
            /* Vendor Blocked State */
            <div className="col-span-full glass-card rounded-2xl border border-pw-border p-12 text-center" id="vendor-blocked-state">
              <span className="material-symbols-outlined text-4xl text-[var(--color-muted)] block mb-4">
                block
              </span>
              <h3 className="text-lg font-bold text-[var(--color-on-surface)] mb-2">
                Access Restricted
              </h3>
              <p className="text-sm text-[var(--color-muted)]">
                Deal listings are not available for vendor accounts.
              </p>
            </div>
          ) : teasers.length > 0 ? (
            teasers.map((t) => <ListingCard key={t.id} teaser={t} />)
          ) : (
            /* Empty state */
            <div className="col-span-full glass-card rounded-2xl border border-pw-border p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-[var(--color-muted)] block mb-4">
                storefront
              </span>
              <h3 className="text-lg font-bold text-[var(--color-on-surface)] mb-2">
                No Deals Found
              </h3>
              <p className="text-sm text-[var(--color-muted)]">
                No listings match your current filters. Try broadening your search.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
