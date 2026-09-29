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
import DealDiscussionModal from '@/components/marketplace/DealDiscussionModal';
import DealNegotiationModal from '@/components/marketplace/DealNegotiationModal';
import BroadcastDealModal from '@/components/marketing/deal-calculator/BroadcastDealModal';
import ShareDealModal from '@/components/marketplace/ShareDealModal';
import ExpressInterestModal from '@/components/marketplace/ExpressInterestModal';
import { extractStreetAddress } from '@/lib/marketplace/address-utils';

export { extractStreetAddress };

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
  pitch?: string;
  endorsementsCount?: number;
  commentsCount?: number;
  isEndorsedByViewer?: boolean;
  calculatorResults?: {
    purchasePrice?: number;
    rehabBudget?: number;
    arv?: number;
    targetIrr?: number;
    projectedRoi?: number;
    equityMultiple?: number;
    cashRequired?: number;
    capRateOnCost?: number;
    cashOnCashReturnPct?: number;
    monthlyDebtService?: number;
    grossMonthlyRent?: number;
    netOperatingIncome?: number;
    maximumAllowableOffer70Pct?: number;
    strategy?: string;
    holdPeriod?: string;
  };
  projects?: Array<{
    id?: string;
    name?: string;
    city?: string;
    state?: string;
    zip?: string;
    stage?: string;
    progress?: number;
    completionPct?: number;
    propertyType?: string;
    subStrategy?: string;
  }>;
}

export interface DealCardProps {
  deal: DealCardData;
  compact?: boolean;
  className?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  onViewCalculatorModal?: (deal: DealCardData) => void;
  onExpressInterest?: (deal: DealCardData) => void;
  isInterested?: boolean;
}

export default function DealCard({
  deal,
  compact = false,
  className = '',
  tabIndex,
  onKeyDown,
  onViewCalculatorModal,
  onExpressInterest,
  isInterested: externalIsInterested,
}: DealCardProps) {
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

  // Social Post State
  const [endorsements, setEndorsements] = useState(deal.endorsementsCount ?? 4);
  const [isEndorsed, setIsEndorsed] = useState(deal.isEndorsedByViewer ?? false);
  const [commentsCount, setCommentsCount] = useState(deal.commentsCount ?? 2);
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isInterestModalOpen, setIsInterestModalOpen] = useState(false);
  const [localInterested, setLocalInterested] = useState(externalIsInterested ?? false);
  const isInterested = localInterested;
  const [visibility, setVisibility] = useState<'marketplace' | 'private' | string>(
    deal.visibility || 'marketplace'
  );

  useEffect(() => {
    if (typeof externalIsInterested === 'boolean') {
      setLocalInterested(externalIsInterested);
    }
  }, [externalIsInterested]);

  useEffect(() => {
    let cancelled = false;
    async function loadSocial() {
      try {
        const res = await fetch(`/api/deals/${deal.id || deal.slug}/social`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setEndorsements(data.endorsementsCount ?? 4);
            setIsEndorsed(data.isEndorsedByViewer ?? false);
            setCommentsCount(data.commentsCount ?? 2);
          }
        }
      } catch {
        // fallback to default counts
      }
    }
    loadSocial();
    return () => {
      cancelled = true;
    };
  }, [deal.id, deal.slug]);

  const handleToggleEndorse = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const nextEndorsed = !isEndorsed;
    setIsEndorsed(nextEndorsed);
    setEndorsements((prev) => (nextEndorsed ? prev + 1 : Math.max(0, prev - 1)));

    try {
      const res = await fetch(`/api/deals/${deal.id || deal.slug}/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'endorse' }),
      });
      if (res.ok) {
        const data = await res.json();
        setEndorsements(data.count);
        setIsEndorsed(data.endorsed);
      }
    } catch {
      // rollback on error
      setIsEndorsed(!nextEndorsed);
      setEndorsements((prev) => (!nextEndorsed ? prev + 1 : Math.max(0, prev - 1)));
    }
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleSave(deal.slug || deal.id);
  };

  // Derive underwriting metrics & Serial Number address identification
  // The "Deal" name is the full address of a Project (serial number). The card shows only street address, full name on hover.
  const fullDealName = deal.address || deal.name || deal.propertyName || 'Commercial Property';
  const streetAddress = extractStreetAddress(deal.address || deal.name || deal.propertyName || '');
  const name = streetAddress;
  const target = deal.fundingTarget ?? deal.target ?? ((deal.purchasePrice ?? 500_000) + 100_000);
  const committed = deal.committedAmount ?? deal.committed ?? 0;
  const progressPercent = target > 0 ? Math.min(100, Math.round((committed / target) * 100)) : 0;
  const targetIrr = deal.targetIrr ?? deal.projectedRoi ?? deal.roi ?? 16.5;
  const equityMultiple = deal.equityMultiple ?? 1.75;
  const holdPeriod = deal.holdPeriod ?? '3–5 Years';
  const minInvestment = deal.minInvestment ?? 25_000;
  const operatorName = deal.creatorName || (deal as any).creator?.name || 'PaperWorking Capital Partner';
  const isVerified = deal.isVerifiedOperator ?? true;
  const assetClass = deal.assetClass || 'Multifamily';
  const strategy = deal.subStrategy || 'VALUE_ADD';
  const investors = deal.investorCount ?? (committed > 0 ? Math.max(1, Math.round(committed / minInvestment)) : 0);

  // Original Deal Calculator Baseline Outputs
  const calcResults = deal.calculatorResults;
  const purchasePrice = calcResults?.purchasePrice ?? deal.purchasePrice ?? deal.price ?? 485_000;
  const rehabBudget = calcResults?.rehabBudget ?? (deal as any).rehabCost ?? 0;
  const cashRequired = calcResults?.cashRequired ?? Math.round(purchasePrice * 0.25 + rehabBudget);
  const noi = calcResults?.netOperatingIncome ?? Math.round(purchasePrice * 0.008 * 12 * 0.65);

  // Originating Project
  const originatingProjectName =
    deal.projectName ||
    deal.projects?.[0]?.name ||
    (deal.projectId ? `Project #${deal.projectId.slice(-6)}` : null);

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
    ? 'border-white/10 bg-white/5 text-white/50'
    : isClosingSoon
      ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
      : 'border-white/20 bg-white/10 text-white';

  const detailUrl = `/marketplace/${deal.slug || deal.id}`;
  const cardAriaLabel = composeDealCardAriaLabel(deal);

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
          <div className="relative group/compact-title max-w-[240px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">
              {assetClass} · {strategy}
            </p>
            <h4
              className="mt-1 text-sm font-bold text-white line-clamp-1 cursor-pointer flex items-center gap-1"
              title={fullDealName}
            >
              <span>{streetAddress}</span>
              <span className="material-symbols-outlined text-[12px] text-white/30 group-hover/compact-title:text-white/60">
                info
              </span>
            </h4>
            {/* Floating hover tooltip for compact mode */}
            <div
              role="tooltip"
              className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover/compact-title:flex z-30 w-max max-w-xs flex-col rounded-lg border border-white/20 bg-[#161318] p-2 text-[10px] shadow-xl backdrop-blur-md animate-in fade-in duration-150"
            >
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-mono font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px] text-white/40">tag</span>
                <span>Deal Name · Serial Number</span>
              </span>
              <span className="mt-0.5 font-mono text-white font-semibold break-words">
                {fullDealName}
              </span>
            </div>
            <p className="text-[11px] text-white/40 font-mono truncate mt-0.5">
              <span className="group-hover/compact-title:hidden">Hover for full address</span>
              <span className="hidden group-hover/compact-title:inline text-white/80 font-medium">{fullDealName}</span>
            </p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadgeStyle}`}>
            {statusLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-2 text-xs">
          <div>
            <p className="text-white/50 text-[10px]">Target IRR</p>
            <p className="font-mono font-bold text-white">{formatPercent(targetIrr)}</p>
          </div>
          <div>
            <p className="text-white/50 text-[10px]">Min Investment</p>
            <p className="font-mono font-bold text-white">{formatCurrencyCompact(minInvestment)}</p>
          </div>
        </div>

        {originatingProjectName && (
          <div className="mt-2 border-t border-white/5 pt-1.5 text-[10px] text-white/50">
            {(deal.projectId || deal.projects?.[0]?.id) ? (
              <Link
                href={`/project/${deal.projectId || deal.projects?.[0]?.id}`}
                onClick={(e) => e.stopPropagation()}
                data-testid="deal-overarching-project-link"
                className="inline-flex items-center gap-1 text-white/70 hover:text-white font-medium hover:underline transition truncate max-w-full"
                title={`View Overarching Project: ${originatingProjectName}`}
              >
                <span className="material-symbols-outlined text-[11px] text-neutral-400">folder</span>
                <span className="truncate">Project: {originatingProjectName}</span>
              </Link>
            ) : (
              <span className="truncate">Project: {originatingProjectName}</span>
            )}
          </div>
        )}
      </article>
    );
  }

  return (
    <>
      <article
        data-testid={`deal-card-${deal.slug || deal.id}`}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#121014] hover:border-white/20 hover:bg-[#161318] transition-all duration-200 ${className}`}
      >
        <div>
          {/* 1. Professional Social Post Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-bold text-white">
                {operatorName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-white truncate max-w-[160px]">
                    {operatorName}
                  </span>
                  {isVerified && (
                    <span
                      title="Verified Operator on PaperWorking"
                      className="inline-flex items-center gap-0.5 rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white"
                    >
                      <span className="material-symbols-outlined text-[11px]">verified</span>
                      <span>Verified Operator</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-white/45 mt-0.5 flex-wrap">
                  {originatingProjectName && (
                    (deal.projectId || deal.projects?.[0]?.id) ? (
                      <Link
                        href={`/project/${deal.projectId || deal.projects?.[0]?.id}`}
                        onClick={(e) => e.stopPropagation()}
                        data-testid="deal-overarching-project-link"
                        className="inline-flex items-center gap-1 text-white/80 hover:text-white font-medium hover:underline transition"
                        title={`View Overarching Project: ${originatingProjectName}`}
                      >
                        <span className="material-symbols-outlined text-[12px] text-neutral-400">folder</span>
                        <span>Project: {originatingProjectName}</span>
                      </Link>
                    ) : (
                      <span className="text-white/70 font-medium">
                        Project: {originatingProjectName}
                      </span>
                    )
                  )}
                  <span>·</span>
                  <span>Social Post</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
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
                className="!h-8 !w-8 !rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[15px]">compare_arrows</span>
              </Button>

              <Button
                roleVariant="toggle"
                variant="secondary"
                size="sm"
                isIconOnly
                isPressed={isSaved}
                onClick={handleToggleSave}
                aria-label={isSaved ? `Unsave ${name}` : `Save ${name}`}
                className="!h-8 !w-8 !rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {isSaved ? 'bookmark' : 'bookmark_border'}
                </span>
              </Button>
            </div>
          </div>

          {/* 2. Media Banner with Overlay Badges */}
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
                className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] ${
                  imgLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center bg-white/[0.02]">
                <span className="material-symbols-outlined text-4xl text-white/30">
                  {getAssetIcon(assetClass)}
                </span>
                <span className="mt-1 text-[11px] font-semibold text-white/50">
                  {deal.city || 'PaperWorking Property'}
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#121014] via-transparent to-black/30" />

            {/* Top-Left Badges: Asset Class + Status */}
            <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-white/15 bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                {assetClass} · {strategy}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${statusBadgeStyle}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {statusLabel}
              </span>
              {(visibility === 'private' || deal.visibility === 'private') && (
                <span
                  data-testid={`private-badge-${deal.slug || deal.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-950/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md"
                >
                  <span className="material-symbols-outlined text-[11px]">lock</span>
                  Private
                </span>
              )}
            </div>
          </div>

          {/* 3. Post Body: Title (Street Address only, Full Name / Serial No on hover), & Investment Thesis */}
          <div className="p-4 sm:p-5">
            <div className="relative group/deal-title inline-block max-w-full">
              <Link
                href={detailUrl}
                title={fullDealName}
                aria-label={`Deal: ${streetAddress}. Full address serial number: ${fullDealName}`}
                className="group-hover:text-white transition-colors block"
              >
                <h3
                  data-testid={`deal-card-title-${deal.slug || deal.id}`}
                  className="text-base font-bold text-white line-clamp-1 leading-snug cursor-pointer flex items-center gap-1.5"
                >
                  <span>{streetAddress}</span>
                  <span
                    className="material-symbols-outlined text-[14px] text-white/30 group-hover/deal-title:text-white/70 transition-colors"
                    title="Hover to view full address / serial number"
                    aria-hidden="true"
                  >
                    info
                  </span>
                </h3>
              </Link>

              {/* Accessible Floating Hover Tooltip: Full Deal Name (Serial Number) */}
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover/deal-title:flex z-30 w-max max-w-xs sm:max-w-sm flex-col rounded-lg border border-white/20 bg-[#161318] p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-150"
              >
                <span className="text-[9.5px] uppercase tracking-wider text-white/50 font-mono font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px] text-white/40">tag</span>
                  <span>Deal Name · Serial Number</span>
                </span>
                <span className="mt-1 font-mono text-xs text-white font-semibold break-words">
                  {fullDealName}
                </span>
              </div>
            </div>

            {/* Hover-revealed Serial Number indicator (hidden without hover) */}
            <div className="mt-1 flex items-center gap-1 text-[11px] text-white/40 font-mono truncate">
              <span className="material-symbols-outlined text-[13px] text-white/30">pin</span>
              <span className="truncate">
                <span className="group-hover/deal-title:hidden">Hover for full address serial</span>
                <span className="hidden group-hover/deal-title:inline text-white/80 font-medium">
                  {fullDealName}
                </span>
              </span>
            </div>

            {/* Investment Thesis Snippet */}
            <p className="mt-2.5 text-xs text-white/75 line-clamp-2 leading-relaxed bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
              {deal.pitch ||
                `Underwritten via PaperWorking Deal Calculator. Projected ${formatPercent(
                  targetIrr,
                )} IRR with structured capital stack.`}
            </p>

            {/* 4. 4-Metric Underwriting Grid */}
            <div className="my-3.5 border-y border-white/10 py-3">
              <div className="grid grid-cols-4 gap-1 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                    Target IRR
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-white">
                    <CountUpNumber value={targetIrr} formatter={formatPercent} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                    Eq Multiple
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-white">
                    <CountUpNumber value={equityMultiple} formatter={formatMultiple} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                    Hold Period
                  </p>
                  <p className="mt-1 font-mono text-xs font-bold text-white">
                    {formatHoldPeriod(holdPeriod)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                    Min Invest
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-white">
                    {formatCurrencyCompact(minInvestment)}
                  </p>
                </div>
              </div>
            </div>

            {/* Deal Calculator Baseline Strip */}
            <div
              data-testid="deal-calculator-strip"
              className="my-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-[11px] font-mono text-white/80"
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50 mb-1.5 font-bold">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-white/50">calculate</span>
                  <span>Deal Calculator Baseline</span>
                </span>
                {onViewCalculatorModal && (
                  <button
                    type="button"
                    data-testid={`card-inspect-calculator-btn-${deal.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onViewCalculatorModal(deal);
                    }}
                    className="text-white/80 hover:text-white underline text-[10px] min-h-[44px] flex items-center gap-0.5"
                  >
                    <span>Inspect</span>
                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center border-t border-white/5 pt-1.5">
                <div>
                  <span className="text-[9px] text-white/40 uppercase block">Basis</span>
                  <span className="text-white font-semibold">{formatCurrencyCompact(purchasePrice)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 uppercase block">Cash Req</span>
                  <span className="text-white font-semibold">{formatCurrencyCompact(cashRequired)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 uppercase block">NOI / yr</span>
                  <span className="text-white font-semibold">{formatCurrencyCompact(noi)}</span>
                </div>
              </div>
            </div>

            {/* 5. Funding Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-white/50">
                  <strong className="text-white font-mono">{formatCurrencyCompact(committed)}</strong>
                  {' / '}
                  {formatCurrencyCompact(target)}
                </span>
                <span className="font-mono font-bold text-white">
                  <CountUpNumber value={progressPercent} formatter={(v) => `${Math.round(v)}% Funded`} />
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-white/50 font-mono pt-0.5">
                <span>{`${investors} Investor${investors === 1 ? '' : 's'}`}</span>
                <span className="capitalize">{deal.dealType || 'Syndication'}</span>
              </div>
            </div>

            {/* 6. Action: Canonical Secondary Button & Choose to be Interested in Investing */}
            <div className="mt-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <Button
                  href={detailUrl}
                  variant="secondary"
                  size="md"
                  className="flex-1 !justify-center transition"
                >
                  View Deal Underwriting →
                </Button>

                <button
                  type="button"
                  data-testid={`card-express-interest-btn-${deal.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onExpressInterest) {
                      onExpressInterest(deal);
                    } else {
                      setIsInterestModalOpen(true);
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold min-h-[44px] transition-colors ${
                    isInterested
                      ? 'bg-neutral-800 text-white border border-neutral-600'
                      : 'bg-white text-neutral-950 hover:bg-neutral-200'
                  }`}
                  title={isInterested ? 'Investment interest registered with operator' : 'Choose to be interested in investing into the Project'}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isInterested ? 'check_circle' : 'how_to_reg'}
                  </span>
                  <span>{isInterested ? 'Interest Registered' : 'Interested in Investing'}</span>
                </button>
              </div>

              {isInterested && (
                <div
                  data-testid="interest-registered-badge"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300"
                >
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  <span>Interest Registered: You expressed interest in this project</span>
                </div>
              )}
            </div>

            {/* 7. Off-Platform Closing Policy Notice */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/5 pt-2 text-[10px] text-white/45">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-white/40">gavel</span>
                <span>Negotiate in Messages · Closing off-platform</span>
              </span>
              <Link href={detailUrl} className="hover:text-white underline transition">
                Details &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 7. Interactive Professional Social Post Toolbar */}
        <div className="border-t border-white/10 bg-white/[0.02] p-2.5 flex items-center justify-between gap-1 flex-wrap">
          {/* Endorse / Vouch */}
          <button
            type="button"
            data-testid={`endorse-deal-btn-${deal.slug || deal.id}`}
            onClick={handleToggleEndorse}
            title={isEndorsed ? 'Remove Endorsement' : 'Endorse Deal Thesis'}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition min-h-[38px] ${
              isEndorsed
                ? 'bg-white/15 text-white border border-white/20'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className={`material-symbols-outlined text-[16px] ${isEndorsed ? 'text-white' : ''}`}>
              {isEndorsed ? 'thumb_up' : 'thumb_up_off_alt'}
            </span>
            <span>{endorsements}</span>
          </button>

          {/* Comments / Discussion */}
          <button
            type="button"
            data-testid={`discuss-deal-btn-${deal.slug || deal.id}`}
            onClick={(e) => {
              e.preventDefault();
              setShowDiscussionModal(true);
            }}
            title="Open Professional Discussion"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white transition min-h-[38px]"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            <span>{commentsCount}</span>
          </button>

          {/* Negotiate in Messages */}
          <button
            type="button"
            data-testid={`negotiate-deal-btn-${deal.slug || deal.id}`}
            onClick={(e) => {
              e.preventDefault();
              setShowNegotiationModal(true);
            }}
            title="Start Negotiation in Messages"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition min-h-[38px]"
          >
            <span className="material-symbols-outlined text-[15px]">forum</span>
            <span>Negotiate</span>
          </button>

          {/* Crowdfund / Email Broadcast */}
          <button
            type="button"
            data-testid={`broadcast-deal-btn-${deal.slug || deal.id}`}
            onClick={(e) => {
              e.preventDefault();
              setShowBroadcastModal(true);
            }}
            title="Crowdfund via Email Promotion"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition min-h-[38px]"
          >
            <span className="material-symbols-outlined text-[15px]">forward_to_inbox</span>
            <span>Crowdfund</span>
          </button>

          {/* Share Privately / Marketplace Visibility Toggle */}
          <button
            type="button"
            data-testid={`share-deal-btn-${deal.slug || deal.id}`}
            onClick={(e) => {
              e.preventDefault();
              setShowShareModal(true);
            }}
            title="Share Privately or Configure Marketplace Placement"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition min-h-[38px]"
          >
            <span className="material-symbols-outlined text-[15px]">share</span>
            <span>Share</span>
          </button>

          {/* Calculator Breakdown Modal */}
          {onViewCalculatorModal && (
            <button
              type="button"
              data-testid={`view-calc-modal-${deal.slug || deal.id}`}
              onClick={(e) => {
                e.preventDefault();
                onViewCalculatorModal(deal);
              }}
              title="Inspect Deal Calculator Pro-Forma"
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white transition min-h-[38px]"
            >
              <span className="material-symbols-outlined text-[15px]">calculate</span>
            </button>
          )}
        </div>
      </article>

      {/* Discussion Modal */}
      <DealDiscussionModal
        isOpen={showDiscussionModal}
        onClose={() => setShowDiscussionModal(false)}
        dealId={deal.id || deal.slug}
        dealTitle={streetAddress}
        dealAddress={fullDealName}
        targetIrr={targetIrr}
        fundingTarget={target}
        initialCommentsCount={commentsCount}
        onCommentsCountChange={(newCount) => setCommentsCount(newCount)}
      />

      {/* Negotiation Modal */}
      <DealNegotiationModal
        isOpen={showNegotiationModal}
        onClose={() => setShowNegotiationModal(false)}
        dealId={deal.id || deal.slug}
        dealTitle={streetAddress}
        dealAddress={fullDealName}
        operatorName={operatorName}
        targetIrr={targetIrr}
        minInvestment={minInvestment}
      />

      {/* Email Crowdfund Broadcast Modal */}
      <BroadcastDealModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        dealId={deal.id || deal.slug}
        projectId={deal.projectId || undefined}
        address={deal.address}
        purchasePrice={deal.purchasePrice || 500000}
        calculations={{
          projectedIrrPct: targetIrr,
          netOperatingIncome: Math.round((deal.purchasePrice || 500000) * 0.08),
        } as any}
        onSuccess={() => {
          setShowBroadcastModal(false);
        }}
      />

      {/* Share & Privacy Control Modal */}
      <ShareDealModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        dealId={deal.id || deal.slug}
        dealSlug={deal.slug}
        dealTitle={streetAddress}
        dealAddress={fullDealName}
        currentVisibility={visibility}
        targetIrr={targetIrr}
        purchasePrice={deal.purchasePrice || 500000}
        calculatorResults={(deal as any).calculatorResults}
        onVisibilityChange={(newVis) => {
          setVisibility(newVis);
        }}
      />

      {/* Express Interest in Project Modal */}
      {isInterestModalOpen && (
        <ExpressInterestModal
          deal={deal as any}
          isOpen={isInterestModalOpen}
          onClose={() => setIsInterestModalOpen(false)}
          onSuccessToast={() => setLocalInterested(true)}
        />
      )}
    </>
  );
}
