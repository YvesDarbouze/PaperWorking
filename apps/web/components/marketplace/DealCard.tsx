'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Info,
  Tag,
  Folder,
  SealCheck,
  ArrowsLeftRight,
  Bookmark,
  BookmarkSimple,
  Buildings,
  Warehouse,
  Storefront,
  Lock,
  MapPin,
  Calculator,
  ArrowSquareOut,
  CheckCircle,
  UserPlus,
  Check,
  Gavel,
  ThumbsUp,
  Chats,
  ChatTeardropText,
  PaperPlaneTilt,
  ShareNetwork,
  Briefcase,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import {
  formatCurrencyCompact,
  formatPercent,
  formatMultiple,
  formatHoldPeriod,
} from '@/lib/format';
import { useCompare } from '@/context/CompareContext';
import { useSavedDeals } from '@/context/SavedDealsContext';
import { useOptionalAuth } from '@/context/AuthContext';
import { composeDealCardAriaLabel } from '@/lib/marketplace/deal-card-aria';
import { CountUpNumber } from '@/components/ui/CountUpNumber';
import { usePropertyImage } from '@/lib/maps/property-image';
import DealDiscussionModal from '@/components/marketplace/DealDiscussionModal';
import DealNegotiationModal from '@/components/marketplace/DealNegotiationModal';
import BroadcastDealModal from '@/components/marketing/deal-calculator/BroadcastDealModal';
import ShareDealModal from '@/components/marketplace/ShareDealModal';
import ExpressInterestModal from '@/components/marketplace/ExpressInterestModal';
import DealOfferServicesModal from '@/components/marketplace/DealOfferServicesModal';
import { extractStreetAddress } from '@/lib/marketplace/address-utils';

export { extractStreetAddress };

export interface DealCardData {
  id: string;
  slug: string;
  rehabCost?: number;
  arv?: number;
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
  strategy?: string;
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
  onOfferServices?: (deal: DealCardData) => void;
  isInterested?: boolean;
  isVendor?: boolean;
}

export default function DealCard({
  deal,
  compact = false,
  className = '',
  tabIndex,
  onKeyDown,
  onViewCalculatorModal,
  onExpressInterest,
  onOfferServices,
  isInterested: externalIsInterested,
  isVendor: propIsVendor,
}: DealCardProps) {
  const auth = useOptionalAuth();
  const isVendor = propIsVendor ?? ((auth?.profile?.accountType || '').toLowerCase() === 'vendor');
  const [isOfferServicesModalOpen, setIsOfferServicesModalOpen] = useState(false);
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
    ? 'border-neutral-800 bg-neutral-900 text-neutral-500'
    : isClosingSoon
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
      : 'border-neutral-700 bg-neutral-800 text-neutral-100';

  const detailUrl = `/marketplace/${deal.slug || deal.id}`;
  const cardAriaLabel = composeDealCardAriaLabel(deal);

  const renderAssetIcon = (ac: string) => {
    switch (ac.toLowerCase()) {
      case 'industrial':
        return <Warehouse className="h-10 w-10 text-neutral-500" />;
      case 'retail':
        return <Storefront className="h-10 w-10 text-neutral-500" />;
      default:
        return <Buildings className="h-10 w-10 text-neutral-500" />;
    }
  };

  if (compact) {
    return (
      <article className={`rounded-none border border-neutral-800 bg-neutral-950 p-4 ${className}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="relative group/compact-title max-w-[240px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              {assetClass} · {strategy}
            </p>
            <h4
              className="mt-1 text-sm font-semibold text-neutral-100 line-clamp-1 cursor-pointer flex items-center gap-1"
              title={fullDealName}
            >
              <span>{streetAddress}</span>
              <Info className="h-3 w-3 text-neutral-500 group-hover/compact-title:text-neutral-300" />
            </h4>
            {/* Floating hover tooltip for compact mode */}
            <div
              role="tooltip"
              className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover/compact-title:flex z-30 w-max max-w-xs flex-col rounded-none border border-neutral-800 bg-neutral-900 p-2 text-[10px] shadow-xl backdrop-blur-md animate-in fade-in duration-150"
            >
              <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono font-medium flex items-center gap-1">
                <Tag className="h-2.5 w-2.5 text-neutral-400" />
                <span>Deal Name · Serial Number</span>
              </span>
              <span className="mt-0.5 font-mono text-neutral-100 font-medium break-words">
                {fullDealName}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono truncate mt-0.5">
              <span className="group-hover/compact-title:hidden">Hover for full address</span>
              <span className="hidden group-hover/compact-title:inline text-neutral-200 font-medium">{fullDealName}</span>
            </p>
          </div>
          <span className={`rounded-none border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeStyle}`}>
            {statusLabel}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-800 pt-2 text-xs">
          <div>
            <p className="text-neutral-400 text-[10px]">Target IRR</p>
            <p className="font-mono font-medium text-neutral-100">{formatPercent(targetIrr)}</p>
          </div>
          <div>
            <p className="text-neutral-400 text-[10px]">Min Investment</p>
            <p className="font-mono font-medium text-neutral-100">{formatCurrencyCompact(minInvestment)}</p>
          </div>
        </div>

        {originatingProjectName && (
          <div className="mt-2 border-t border-neutral-800 pt-1.5 text-[10px] text-neutral-400">
            {(deal.projectId || deal.projects?.[0]?.id) ? (
              <Link
                href={`/project/${deal.projectId || deal.projects?.[0]?.id}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                data-testid="deal-overarching-project-link"
                className="inline-flex items-center gap-1 text-neutral-300 hover:text-white font-medium hover:underline transition truncate max-w-full"
                title={`View Overarching Project: ${originatingProjectName}`}
              >
                <Folder className="h-2.5 w-2.5 text-neutral-400" />
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
        className={`group relative flex flex-col justify-between overflow-hidden rounded-none border border-neutral-800 bg-neutral-950 hover:border-neutral-700 hover:bg-neutral-900/40 transition-all duration-200 ${className}`}
      >
        <div>
          {/* 1. Professional Social Post Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800 bg-neutral-900/30">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-neutral-700 bg-neutral-800 text-xs font-semibold text-neutral-100">
                {operatorName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-neutral-100 truncate max-w-[160px]">
                    {operatorName}
                  </span>
                  {isVerified && (
                    <span
                      title="Verified Operator on PaperWorking"
                      className="inline-flex items-center gap-1 rounded-none border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-neutral-300"
                    >
                      <SealCheck className="h-3 w-3 text-neutral-300" />
                      <span>Verified Operator</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5 flex-wrap">
                  {originatingProjectName && (
                    (deal.projectId || deal.projects?.[0]?.id) ? (
                      <Link
                        href={`/project/${deal.projectId || deal.projects?.[0]?.id}`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        data-testid="deal-overarching-project-link"
                        className="inline-flex items-center gap-1 text-neutral-300 hover:text-white font-medium hover:underline transition"
                        title={`View Overarching Project: ${originatingProjectName}`}
                      >
                        <Folder className="h-3 w-3 text-neutral-400" />
                        <span>Project: {originatingProjectName}</span>
                      </Link>
                    ) : (
                      <span className="text-neutral-400 font-medium">
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
                className="!h-9 !w-9 !rounded-none border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white min-h-[44px]"
              >
                <ArrowsLeftRight className="h-4 w-4" />
              </Button>

              <Button
                roleVariant="toggle"
                variant="secondary"
                size="sm"
                isIconOnly
                isPressed={isSaved}
                onClick={handleToggleSave}
                aria-label={isSaved ? `Unsave ${name}` : `Save ${name}`}
                className="!h-9 !w-9 !rounded-none border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white min-h-[44px]"
              >
                {isSaved ? (
                  <Bookmark className="h-4 w-4 text-neutral-100" weight="fill" />
                ) : (
                  <BookmarkSimple className="h-4 w-4 text-neutral-400" />
                )}
              </Button>
            </div>
          </div>

          {/* 2. Media Banner with Overlay Badges */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900/50">
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
              <div className="flex h-full w-full flex-col items-center justify-center bg-neutral-900/30">
                {renderAssetIcon(assetClass)}
                <span className="mt-1 text-[11px] font-semibold text-neutral-400">
                  {deal.city || 'PaperWorking Property'}
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#121014] via-transparent to-black/30" />

            {/* Top-Left Badges: Asset Class + Status */}
            <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1.5">
              <span className="rounded-none border border-neutral-700 bg-neutral-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-200 backdrop-blur-md">
                {assetClass} · {strategy}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-none border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md ${statusBadgeStyle}`}
              >
                <span className="h-1.5 w-1.5 rounded-none bg-current" />
                {statusLabel}
              </span>
              {(visibility === 'private' || deal.visibility === 'private') && (
                <span
                  data-testid={`private-badge-${deal.slug || deal.id}`}
                  className="inline-flex items-center gap-1 rounded-none border border-amber-500/30 bg-amber-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300 backdrop-blur-md"
                >
                  <Lock className="h-2.5 w-2.5" />
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
                  className="text-base font-semibold text-neutral-100 line-clamp-1 leading-snug cursor-pointer flex items-center gap-1.5"
                >
                  <span>{streetAddress}</span>
                  <span title="Hover to view full address / serial number" aria-hidden="true" className="inline-flex items-center">
                    <Info
                      className="h-3.5 w-3.5 text-neutral-500 group-hover/deal-title:text-neutral-300 transition-colors"
                    />
                  </span>
                </h3>
              </Link>

              {/* Accessible Floating Hover Tooltip: Full Deal Name (Serial Number) */}
              <div
                role="tooltip"
                className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover/deal-title:flex z-30 w-max max-w-xs sm:max-w-sm flex-col rounded-none border border-neutral-800 bg-neutral-900 p-2.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-150"
              >
                <span className="text-[9.5px] uppercase tracking-wider text-neutral-400 font-mono font-medium flex items-center gap-1">
                  <Tag className="h-3 w-3 text-neutral-400" />
                  <span>Deal Name · Serial Number</span>
                </span>
                <span className="mt-1 font-mono text-xs text-neutral-100 font-medium break-words">
                  {fullDealName}
                </span>
              </div>
            </div>

            {/* Hover-revealed Serial Number indicator (hidden without hover) */}
            <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400 font-mono truncate">
              <MapPin className="h-3 w-3 text-neutral-500" />
              <span className="truncate">
                <span className="group-hover/deal-title:hidden">Hover for full address serial</span>
                <span className="hidden group-hover/deal-title:inline text-neutral-200 font-medium">
                  {fullDealName}
                </span>
              </span>
            </div>

            {/* Investment Thesis Snippet */}
            <p className="mt-2.5 text-xs text-neutral-300 line-clamp-2 leading-relaxed bg-neutral-900/30 p-2.5 rounded-none border border-neutral-800">
              {deal.pitch ||
                `Underwritten via PaperWorking Deal Calculator. Projected ${formatPercent(
                  targetIrr,
                )} IRR with structured capital stack.`}
            </p>

            {/* 4. 4-Metric Underwriting Grid */}
            <div className="my-3.5 border-y border-neutral-800 py-3">
              <div className="grid grid-cols-4 gap-1 text-center">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Target IRR
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-neutral-100">
                    <CountUpNumber value={targetIrr} formatter={formatPercent} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Eq Multiple
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-neutral-100">
                    <CountUpNumber value={equityMultiple} formatter={formatMultiple} />
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Hold Period
                  </p>
                  <p className="mt-1 font-mono text-xs font-semibold text-neutral-100">
                    {formatHoldPeriod(holdPeriod)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Min Invest
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-neutral-100">
                    {formatCurrencyCompact(minInvestment)}
                  </p>
                </div>
              </div>
            </div>

            {/* Deal Calculator Baseline Strip */}
            <div
              data-testid="deal-calculator-strip"
              className="my-3 rounded-none border border-neutral-800 bg-neutral-900/30 p-2.5 text-[11px] font-mono text-neutral-300"
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5 font-medium">
                <span className="flex items-center gap-1">
                  <Calculator className="h-3.5 w-3.5 text-neutral-400" />
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
                    className="text-neutral-300 hover:text-white underline text-[10px] min-h-[44px] flex items-center gap-0.5"
                  >
                    <span>Inspect</span>
                    <ArrowSquareOut className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center border-t border-neutral-800 pt-1.5">
                <div>
                  <span className="text-[9px] text-neutral-400 uppercase block">Basis</span>
                  <span className="text-neutral-100 font-semibold">{formatCurrencyCompact(purchasePrice)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-400 uppercase block">Cash Req</span>
                  <span className="text-neutral-100 font-semibold">{formatCurrencyCompact(cashRequired)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-neutral-400 uppercase block">NOI / yr</span>
                  <span className="text-neutral-100 font-semibold">{formatCurrencyCompact(noi)}</span>
                </div>
              </div>
            </div>

            {/* 5. Funding Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-neutral-400">
                  <strong className="text-neutral-100 font-mono">{formatCurrencyCompact(committed)}</strong>
                  {' / '}
                  {formatCurrencyCompact(target)}
                </span>
                <span className="font-mono font-semibold text-neutral-100">
                  <CountUpNumber value={progressPercent} formatter={(v) => `${Math.round(v)}% Funded`} />
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-none bg-neutral-800">
                <div
                  className="h-full rounded-none bg-neutral-100 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-neutral-400 font-mono pt-0.5">
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
                  className="flex-1 !justify-center transition rounded-none min-h-[44px]"
                >
                  View Deal Underwriting →
                </Button>

                <button
                  type="button"
                  data-testid={isVendor ? `card-offer-services-btn-${deal.id}` : `card-express-interest-btn-${deal.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isVendor) {
                      if (onOfferServices) {
                        onOfferServices(deal);
                      } else {
                        setIsOfferServicesModalOpen(true);
                      }
                    } else {
                      if (onExpressInterest) {
                        onExpressInterest(deal);
                      } else {
                        setIsInterestModalOpen(true);
                      }
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-none text-xs font-semibold min-h-[44px] transition-colors ${
                    isVendor
                      ? 'bg-neutral-100 text-neutral-950 hover:bg-white'
                      : isInterested
                        ? 'bg-neutral-800 text-white border border-neutral-600'
                        : 'bg-neutral-100 text-neutral-950 hover:bg-white'
                  }`}
                  title={
                    isVendor
                      ? 'Offer professional or trade services on this project'
                      : isInterested
                        ? 'Investment interest registered with operator'
                        : 'Choose to be interested in investing into the Project'
                  }
                >
                  {isVendor ? (
                    <>
                      <Briefcase className="h-4 w-4" />
                      <span>Offer Services</span>
                    </>
                  ) : isInterested ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span>Interest Registered</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Interested in Investing</span>
                    </>
                  )}
                </button>
              </div>

              {!isVendor && (
                <button
                  type="button"
                  data-testid={`card-investor-offer-services-btn-${deal.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onOfferServices) {
                      onOfferServices(deal);
                    } else {
                      setIsOfferServicesModalOpen(true);
                    }
                  }}
                  className="flex items-center justify-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition py-1"
                  title="Offer trade or professional services to this deal operator"
                >
                  <Briefcase className="h-3.5 w-3.5 text-neutral-400" />
                  <span>Offer Services as Trade Provider</span>
                </button>
              )}

              {isInterested && (
                <div
                  data-testid="interest-registered-badge"
                  className="flex items-center justify-center gap-1.5 rounded-none border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Interest Registered: You expressed interest in this project</span>
                </div>
              )}
            </div>

            {/* 7. Off-Platform Closing Policy Notice */}
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-neutral-800 pt-2 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1">
                <Gavel className="h-3.5 w-3.5 text-neutral-400" />
                <span>Negotiate in Messages · Closing off-platform</span>
              </span>
              <Link href={detailUrl} className="hover:text-white underline transition">
                Details &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* 7. Interactive Professional Social Post Toolbar */}
        <div className="border-t border-neutral-800 bg-neutral-900/40 p-2.5 flex items-center justify-between gap-1 flex-wrap">
          {/* Endorse / Vouch */}
          <button
            type="button"
            data-testid={`endorse-deal-btn-${deal.slug || deal.id}`}
            onClick={handleToggleEndorse}
            title={isEndorsed ? 'Remove Endorsement' : 'Endorse Deal Thesis'}
            className={`flex items-center gap-1.5 rounded-none px-2.5 py-1.5 text-xs font-semibold transition min-h-[44px] ${
              isEndorsed
                ? 'bg-neutral-800 text-white border border-neutral-700'
                : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            {isEndorsed ? (
              <ThumbsUp className="h-4 w-4 text-neutral-100" weight="fill" />
            ) : (
              <ThumbsUp className="h-4 w-4 text-neutral-400" />
            )}
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
            className="flex items-center gap-1.5 rounded-none px-2.5 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white transition min-h-[44px]"
          >
            <Chats className="h-4 w-4" />
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
            className="flex items-center gap-1 rounded-none px-2.5 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition min-h-[44px]"
          >
            <ChatTeardropText className="h-4 w-4" />
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
            className="flex items-center gap-1 rounded-none px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 hover:text-white transition min-h-[44px]"
          >
            <PaperPlaneTilt className="h-4 w-4" />
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
            className="flex items-center gap-1 rounded-none px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 hover:text-white transition min-h-[44px]"
          >
            <ShareNetwork className="h-4 w-4" />
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
              className="flex items-center gap-1 rounded-none px-2 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white transition min-h-[44px]"
            >
              <Calculator className="h-4 w-4" />
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

      {/* Offer Services on Deal Modal */}
      {isOfferServicesModalOpen && (
        <DealOfferServicesModal
          deal={{
            id: deal.id,
            slug: deal.slug,
            name: deal.name,
            propertyName: deal.propertyName,
            address: deal.address,
            city: deal.city,
            state: deal.state,
            assetClass: deal.assetClass,
            creatorName: deal.creatorName,
          }}
          isOpen={isOfferServicesModalOpen}
          onClose={() => setIsOfferServicesModalOpen(false)}
        />
      )}
    </>
  );
}
