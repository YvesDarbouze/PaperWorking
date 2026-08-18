'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Bookmark, Share2, Eye, TrendingUp, Building2, Maximize2 } from 'lucide-react';
import { calculateFundingProgress, formatCurrencyAmount } from '@/lib/deals/fundingUtils';
import ExpandedModal from '@/components/deals/ExpandedModal';
import { PropertyStreetViewTile } from '@/components/project/PropertyStreetViewTile';

export interface DealCardProps {
  deal: {
    id: string;
    slug: string;
    address: string;
    propertyName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    assetClass?: string;
    subStrategy?: string;
    status?: string;
    purchasePrice: number | string;
    rehabCost?: number | string;
    arv?: number | string;
    projectedRoi: number | string;
    fundingTarget?: number;
    committedAmount?: number;
    investorCount?: number;
    bookmarkCount?: number;
    viewCount?: number;
    imageUrl?: string;
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
  isCompareMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (dealId: string) => void;
  className?: string;
}

export function formatDealTitle(rawAddressOrSlug: string, fallbackName?: string): string {
  if (fallbackName && !fallbackName.startsWith('The') && fallbackName.trim() !== '') {
    return fallbackName;
  }
  if (!rawAddressOrSlug) return 'Investment Deal Opportunity';

  if (rawAddressOrSlug.includes(',')) {
    return rawAddressOrSlug.split(',')[0].trim();
  }

  return rawAddressOrSlug
    .replace(/([0-9]+)([a-zA-Z]+)/, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

export default function DealCard({
  deal,
  isCompareMode = false,
  isSelected = false,
  onToggleSelect,
  className = '',
}: DealCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState(deal.bookmarkCount || 12);
  const [isExpandedModalOpen, setIsExpandedModalOpen] = useState(false);

  const displayTitle = formatDealTitle(deal.address || deal.slug, deal.propertyName);
  const displayLocation = deal.city && deal.state ? `${deal.city}, ${deal.state}` : deal.address || 'Austin, TX';

  const priceNum = typeof deal.purchasePrice === 'number' ? deal.purchasePrice : parseFloat(deal.purchasePrice) || 350000;
  const roiNum = typeof deal.projectedRoi === 'number' ? deal.projectedRoi : parseFloat(deal.projectedRoi) || 18.5;

  const target = deal.fundingTarget || 200000;
  const committed = deal.committedAmount || 130000;
  const funding = calculateFundingProgress(target, committed);

  const getProgressBarColor = (pct: number) => {
    if (pct < 50) return 'bg-blue-500';
    if (pct < 90) return 'bg-amber-400';
    return 'bg-[#34d399]';
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBookmarked) {
      setIsBookmarked(false);
      setBookmarks((prev) => prev - 1);
    } else {
      setIsBookmarked(true);
      setBookmarks((prev) => prev + 1);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}/deals/${deal.slug || deal.id}`;
      navigator.clipboard.writeText(url);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpandedModalOpen(true);
  };

  return (
    <>
      <Link
        href={`/deals/${deal.slug || deal.id}`}
        data-testid="marketplace-deal-card"
        className={`group relative block rounded-[14px] border border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-[8px] overflow-hidden transition-all duration-300 hover:border-[#34d399]/30 hover:-translate-y-[1px] hover:shadow-2xl ${
          isSelected ? 'ring-2 ring-[#34d399] border-[#34d399]' : ''
        } ${className}`}
      >
        {/* ── Image Area ── */}
        <div className="relative h-44 w-full bg-gradient-to-br from-slate-900 via-[#0a0a0f] to-slate-950 overflow-hidden flex items-center justify-center border-b border-white/[0.04]">
          {deal.imageUrl ? (
            <Image
              src={deal.imageUrl}
              alt={displayTitle}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <PropertyStreetViewTile
              address={deal.address || deal.propertyName || displayTitle}
              lat={deal.lat ?? deal.latitude}
              lng={deal.lng ?? deal.longitude}
              aspectRatio="video"
              className="w-full h-full border-none rounded-none"
            />
          )}

          {/* Top-Left Glass Badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 flex-wrap">
            <span className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30 backdrop-blur-md shadow-sm">
              {deal.assetClass || 'Residential'}
            </span>
            <span className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/80 text-slate-300 border border-slate-700/50 backdrop-blur-md shadow-sm">
              {deal.subStrategy || 'FLIP'}
            </span>
          </div>

          {/* Top-Right 32x32px Glass Expand Button (Hover Revealed) */}
          <button
            type="button"
            data-testid="expand-card-btn"
            onClick={handleExpandClick}
            className="absolute top-3 right-3 z-20 w-8 h-8 rounded-[8px] bg-black/60 backdrop-blur-md border border-white/20 text-slate-300 hover:text-white hover:bg-[#34d399]/30 hover:border-[#34d399]/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer shadow-md"
            title="Expand deal analysis"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Compare Checkbox or Status Badge */}
          {isCompareMode ? (
            <div
              className="absolute top-3 right-12 z-20 cursor-pointer p-1 rounded-[6px] bg-black/60 backdrop-blur-md border border-white/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onToggleSelect) onToggleSelect(deal.id);
              }}
            >
              <input
                type="checkbox"
                data-testid={`compare-checkbox-${deal.id}`}
                checked={isSelected}
                onChange={() => {}}
                className="w-5 h-5 accent-[#34d399] rounded cursor-pointer"
              />
            </div>
          ) : null}
        </div>

        {/* ── Content Body ── */}
        <div className="p-5 space-y-4">
          <div>
            <h3
              data-testid="deal-card-title"
              className="text-[15px] font-medium text-white group-hover:text-[#34d399] transition-colors line-clamp-1"
            >
              {displayTitle}
            </h3>

            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-sans">
              <MapPin className="w-3.5 h-3.5 text-[#34d399] shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </p>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/[0.06] font-mono">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-sans">
                Purchase Price
              </span>
              <span className="text-sm font-bold text-slate-100">
                {formatCurrencyAmount(priceNum)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-sans">
                Projected ROI
              </span>
              <span className="text-sm font-bold text-[#34d399] flex items-center justify-end gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#34d399]" />
                {roiNum}%
              </span>
            </div>
          </div>

          {/* Crowdfunding Progress Bar */}
          <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 font-sans font-medium">Funding Progress</span>
              <span className="font-bold text-[#34d399]">{funding.percentFunded}%</span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(funding.percentFunded)}`}
                style={{ width: `${funding.percentFunded}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{funding.formattedCommitted} committed</span>
              <span>{funding.formattedTarget} target</span>
            </div>
          </div>

          {/* Card Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 hover:text-slate-200 transition-colors">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>{deal.viewCount || 142}</span>
              </span>

              <button
                type="button"
                onClick={handleBookmark}
                className={`flex items-center gap-1 transition-colors ${
                  isBookmarked ? 'text-[#34d399]' : 'hover:text-slate-200'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-[#34d399]' : ''}`} />
                <span>{bookmarks}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-[6px] hover:bg-white/5 hover:text-slate-200 transition-colors"
              title="Share deal"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Link>

      {/* Expanded Modal */}
      <ExpandedModal
        isOpen={isExpandedModalOpen}
        onClose={() => setIsExpandedModalOpen(false)}
        deal={deal}
        source="card"
      />
    </>
  );
}
