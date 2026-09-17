'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  formatCurrencyCompact,
  formatPercent,
  formatMultiple,
  formatHoldPeriod,
} from '@/lib/format';
import { useCompare } from '@/context/CompareContext';
import { useSavedDeals } from '@/context/SavedDealsContext';
import { composeDealCardAriaLabel } from '@/lib/marketplace/deal-card-aria';
import { CountUpNumber } from '@/components/ui/CountUpNumber';
import { usePropertyImage } from '@/lib/maps/property-image';

export interface DealCardData {
  id: string;
  slug: string;
  propertyName?: string;
  name?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  assetClass?: string;
  subStrategy?: string;
  status: string;
  visibility?: 'marketplace' | 'invitation_only' | 'private' | string;
  projectedRoi?: number;
  roi?: number;
  targetIrr?: number;
  equityMultiple?: number;
  holdPeriod?: string;
  holdPeriodYears?: number;
  minInvestment?: number;
  dealType?: 'crowdfunding' | 'syndication';
  imageUrl?: string;
  isVerifiedOperator?: boolean;
  fundingTarget?: number;
  target?: number;
  purchasePrice?: number;
  price?: number;
  committedAmount?: number;
  committed?: number;
  investorCount?: number;
  creatorName?: string;
  creatorId?: string;
  projectId?: string | null;
  projectName?: string | null;
  createdAt?: string;
}

const SAVED_DEALS_KEY = 'paperworking_saved_deals';

export default function DealCard({
  deal,
  compact = false,
  className = '',
  tabIndex,
  onKeyDown,
}: {
  deal: DealCardData;
  compact?: boolean;
  className?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
}) {
  const { imageUrl: resolvedImgUrl, handleImageError } = usePropertyImage({
    id: deal.id || deal.slug,
    imageUrl: deal.imageUrl,
    address: deal.address,
    lat: deal.lat,
    lng: deal.lng,
  });
  const [imgLoaded, setImgLoaded] = useState(false);
  const { addToCompare, removeFromCompare, isComparing } = useCompare();
  const { isSaved: checkIsSaved, toggleSave } = useSavedDeals();
  const isSaved = checkIsSaved(deal.id) || checkIsSaved(deal.slug);

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleSave(deal.slug || deal.id);
  };

  // Derive underwriting metrics
  const name = deal.propertyName || deal.name || deal.address.split(',')[0] || 'Commercial Deal';
  const target = deal.fundingTarget ?? deal.target ?? ((deal.purchasePrice ?? 500_000) + 100_000);
  const committed = deal.committedAmount ?? deal.committed ?? 0;
  const progressPercent = target > 0 ? Math.min(100, Math.round((committed / target) * 100)) : 0;
  const targetIrr = deal.targetIrr ?? deal.projectedRoi ?? deal.roi ?? 16.5;
  const equityMultiple = deal.equityMultiple ?? 1.75;
  const holdPeriod = deal.holdPeriod ?? '3–5 Years';
  const minInvestment = deal.minInvestment ?? 25_000;
  const operatorName = deal.creatorName || 'Apex Capital Partners';
  const isVerified = deal.isVerifiedOperator ?? true;
  const assetClass = deal.assetClass || 'Multifamily';
  const strategy = deal.subStrategy || 'VALUE_ADD';
  const investors = deal.investorCount ?? (committed > 0 ? Math.max(1, Math.round(committed / minInvestment)) : 0);

  // Status mapping
  const normStatus = (deal.status || 'published').toLowerCase();
  const isFunded = normStatus === 'funded' || progressPercent >= 100;
  const isClosingSoon = normStatus === 'closing_soon' || progressPercent >= 85;
  const statusLabel = isFunded
    ? 'Fully Funded'
    : isClosingSoon
      ? 'Closing Soon'
      : normStatus === 'funding'
        ? 'Live Funding'
        : 'Open';

  const statusBadgeStyle = isFunded
    ? 'border-white/10 bg-white/5 text-[#9E9DA0]'
    : isClosingSoon
      ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
      : 'border-[var(--status-live)]/40 bg-[var(--accent-subtle)] text-[var(--status-live)]';

  const detailUrl = `/marketplace/${deal.slug || deal.id}`;
  const cardAriaLabel = composeDealCardAriaLabel(deal);

  // Asset Class Icon
  const getAssetIcon = (ac: string) => {
    switch (ac.toLowerCase()) {
      case 'multifamily':
      case 'multi-family':
        return 'apartment';
      case 'industrial':
        return 'warehouse';
      case 'office':
        return 'domain';
      case 'retail':
        return 'storefront';
      case 'hospitality':
        return 'hotel';
      case 'mixed_use':
      case 'mixed-use':
        return 'corporate_fare';
      default:
        return 'business';
    }
  };

  if (compact) {
    return (
      <article className={`rounded-xl border border-white/10 bg-[#121014] p-4 ${className}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">
              {assetClass} · {strategy}
            </p>
            <h4 className="mt-1 text-sm font-bold text-[#fdfffc] line-clamp-1">{name}</h4>
            <p className="text-xs text-[#9E9DA0]">{deal.address}</p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeStyle}`}>
            {statusLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-xs">
          <div>
            <p className="text-[#9E9DA0] text-[10px]">Target IRR</p>
            <p className="font-mono font-bold text-[var(--accent)]">{formatPercent(targetIrr)}</p>
          </div>
          <div>
            <p className="text-[#9E9DA0] text-[10px]">Min Investment</p>
            <p className="font-mono font-bold text-[#fdfffc]">{formatCurrencyCompact(minInvestment)}</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid={`deal-card-${deal.slug || deal.id}`}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#121014] card-hover-lift hover:border-white/20 hover:bg-[#161318] ${className}`}
    >
      {/* Whole Card Clickable Link with Full Natural-Speech Screen Reader Announcement */}
      <Link
        href={detailUrl}
        className="absolute inset-0 z-0 focus-ring rounded-2xl"
        aria-label={cardAriaLabel}
        data-roving-item
        tabIndex={tabIndex}
        onKeyDown={onKeyDown}
      />

      <div>
        {/* 1. 16:9 Media Banner with Fallback */}
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-white/[0.04]">
          {resolvedImgUrl ? (
            <img
              src={resolvedImgUrl}
              alt=""
              aria-hidden="true"
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                setImgLoaded(false);
                handleImageError();
              }}
              className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] image-fade-in ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : (
            // Final fallback: gradient + asset icon
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
              <span className="material-symbols-outlined text-4xl text-[#9E9DA0]/40">
                {getAssetIcon(assetClass)}
              </span>
              <span className="mt-1 text-[11px] font-semibold text-[#9E9DA0]/60">
                {deal.city || 'PaperWorking Property'}
              </span>
            </div>
          )}

          {/* Bottom scrim gradient for contrast */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#121014] via-transparent to-black/40" />

          {/* Top-Left Badges: Asset Class + Status */}
          <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md border border-white/15 bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
              {assetClass} · {strategy}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${statusBadgeStyle}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {statusLabel}
            </span>
          </div>

          {/* Top-Right: Compare + Bookmark / Save Toggle */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
            <Button
              roleVariant="toggle"
              variant="secondary"
              size="sm"
              isIconOnly
              isPressed={isComparing(deal.id)}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isComparing(deal.id)) {
                  removeFromCompare(deal.id);
                } else {
                  addToCompare(deal);
                }
              }}
              aria-label={isComparing(deal.id) ? `Remove ${name} from compare` : `Add ${name} to compare`}
              className="!h-8 !w-8 !rounded-full border-white/20 bg-black/60 text-white backdrop-blur-md hover:bg-black/80 hover:text-[var(--accent)]"
            >
              <span className={`material-symbols-outlined text-[16px] ${isComparing(deal.id) ? 'text-[var(--accent)]' : 'text-white/80'}`}>
                compare_arrows
              </span>
            </Button>

            <Button
              roleVariant="toggle"
              variant="secondary"
              size="sm"
              isIconOnly
              isPressed={isSaved}
              onClick={handleToggleSave}
              aria-label={isSaved ? `Unsave ${name}` : `Save ${name}`}
              className="!h-8 !w-8 !rounded-full border-white/20 bg-black/60 text-white backdrop-blur-md hover:bg-black/80 hover:text-[var(--accent)]"
            >
              <span className={`material-symbols-outlined text-[16px] ${isSaved ? 'text-[var(--accent)]' : 'text-white/80'}`}>
                {isSaved ? 'bookmark' : 'bookmark_border'}
              </span>
            </Button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5">
          {/* 2. Title & Address */}
          <div>
            <h3 className="text-[16px] font-bold text-[#fdfffc] line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
              {name}
            </h3>
            <p className="mt-1 text-[13px] text-[#9E9DA0] truncate flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#9E9DA0]">location_on</span>
              <span>{deal.address}</span>
            </p>
          </div>

          {/* 3. Operator Provenance Row */}
          <div className="mt-3.5 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-[#fdfffc]">
                {operatorName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-[#fdfffc]/90 truncate max-w-[150px]">
                {operatorName}
              </span>
            </div>
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-subtle)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Verified Operator
              </span>
            )}
          </div>

          {/* 4. 4-Metric Underwriting Grid (The 5-Second Test) */}
          <div className="my-4 border-y border-white/10 py-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">
                  Target IRR
                </p>
                <p className="mt-1 font-mono text-[14px] font-bold text-[var(--accent)]">
                  <CountUpNumber value={targetIrr} formatter={formatPercent} />
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">
                  Eq Multiple
                </p>
                <p className="mt-1 font-mono text-[14px] font-bold text-[#fdfffc]">
                  <CountUpNumber value={equityMultiple} formatter={formatMultiple} />
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">
                  Hold Period
                </p>
                <p className="mt-1 font-mono text-[13px] font-bold text-[#fdfffc]">
                  {formatHoldPeriod(holdPeriod)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9DA0]">
                  Min Invest
                </p>
                <p className="mt-1 font-mono text-[14px] font-bold text-[#fdfffc]">
                  {formatCurrencyCompact(minInvestment)}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Funding Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[#9E9DA0]">
                <strong className="text-white font-mono">{formatCurrencyCompact(committed)}</strong>
                {' / '}
                {formatCurrencyCompact(target)}
              </span>
              <span className="font-mono font-bold text-[var(--accent)]">
                <CountUpNumber value={progressPercent} formatter={(v) => `${Math.round(v)}% Funded`} />
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#9E9DA0]">
              <span>{`${investors} Investor${investors === 1 ? '' : 's'}`}</span>
              <span className="capitalize">{deal.dealType || 'Syndication'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Action: Single Full-Width Secondary Canonical Button */}
      <div className="relative z-10 px-5 pb-5 pt-1">
        <Button
          href={detailUrl}
          variant="secondary"
          size="md"
          className="w-full !justify-center group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition"
        >
          View Deal Underwriting →
        </Button>
      </div>
    </article>
  );
}
