'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Building2, Calculator, ArrowRight, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { calculateFundingProgress, mapDealCardMetrics, formatCurrencyAmount } from '@/lib/deals/fundingUtils';
import { generateDealSlug } from '@/lib/deals/slugUtils';

export interface MarketplaceDealCardData {
  id: string;
  slug?: string;
  displayAddress: string;
  propertyName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  assetClass?: string;
  subStrategy?: string;
  status: 'DRAFT' | 'LISTED' | 'UNDER_REVIEW' | 'FUNDED' | 'CLOSED' | string;
  price: number;
  rehabCost: number;
  arv: number;
  fundingTarget: number;
  committedAmount?: number;
  investorCount?: number;
  currency?: string;
  imageUrl?: string;
  capRate?: number;
  cashOnCash?: number;
  projectedROI?: number;
  estimatedRent?: number;
  leadInvestor?: {
    displayName: string;
    avatarUrl?: string;
  };
}

interface MarketplaceDealCardProps {
  deal: MarketplaceDealCardData;
  className?: string;
}

export default function MarketplaceDealCard({ deal, className = '' }: MarketplaceDealCardProps) {
  const router = useRouter();

  const slug = deal.slug || generateDealSlug(deal.displayAddress);
  const metrics = mapDealCardMetrics(deal);
  const funding = calculateFundingProgress(
    deal.fundingTarget || 200000,
    deal.committedAmount || 130000,
    deal.investorCount || 5,
    deal.currency || 'USD'
  );

  const getStatusBadgeStyle = (statusStr: string) => {
    const s = statusStr.toUpperCase();
    if (s === 'LISTED' || s === 'PUBLISHED') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (s === 'FUNDED') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (s === 'UNDER_REVIEW') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (s === 'CLOSED') return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
  };

  const handleOpenAnalyzer = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const queryParams = new URLSearchParams({
      address: deal.displayAddress,
      purchasePrice: metrics.purchasePrice.toString(),
      rehabCost: metrics.rehabCost.toString(),
      arv: metrics.arv.toString(),
      rent: metrics.monthlyRent.toString(),
    });
    router.push(`/dashboard/deal-analyzer?${queryParams.toString()}`);
  };

  return (
    <div
      onClick={() => router.push(`/dashboard/deals/${slug}`)}
      className={`
        glass-card rounded-2xl border border-pw-border
        flex flex-col justify-between
        overflow-hidden cursor-pointer
        transition-all duration-200
        hover:border-slate-700/40 hover:shadow-xl hover:shadow-slate-900/5
        group
        ${className}
      `}
      data-testid="marketplace-deal-card"
    >
      {/* Thumbnail Header */}
      <div className="relative h-40 w-full overflow-hidden bg-slate-900">
        {deal.imageUrl ? (
          <img
            src={deal.imageUrl}
            alt={deal.displayAddress}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950/40 p-4 flex flex-col justify-between relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-800/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/10">
                {deal.assetClass || 'Residential'}
              </span>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${getStatusBadgeStyle(deal.status)}`}>
                {deal.status}
              </span>
            </div>
            <div className="flex items-center gap-2 z-10">
              <Building2 className="w-5 h-5 text-slate-300" />
              <span className="text-xs font-bold text-slate-300 font-mono tracking-tight">
                {slug}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Body Content */}
      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Address & Neighborhood */}
          <div className="space-y-1 mb-3">
            <h3 className="text-base font-bold text-slate-100 group-hover:text-slate-300 transition-colors line-clamp-1">
              {deal.propertyName || deal.displayAddress}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span className="truncate">{deal.displayAddress}</span>
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-white/[0.03] border border-pw-border/50 mb-4 text-center">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Purchase</span>
              <span className="text-xs font-extrabold font-mono text-slate-200">
                {formatCurrencyAmount(metrics.purchasePrice)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rehab</span>
              <span className="text-xs font-extrabold font-mono text-slate-200">
                {formatCurrencyAmount(metrics.rehabCost)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">ARV</span>
              <span className="text-xs font-extrabold font-mono text-slate-300">
                {formatCurrencyAmount(metrics.arv)}
              </span>
            </div>
          </div>

          {/* Headline Underwriting Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-slate-800/5 border border-slate-700/15 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Cash-on-Cash</span>
              <span className="text-sm font-extrabold font-mono text-slate-300">{metrics.cashOnCash}%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/5 border border-slate-700/15 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Cap Rate</span>
              <span className="text-sm font-extrabold font-mono text-slate-300">{metrics.capRate}%</span>
            </div>
          </div>

          {/* Funding Progress Bar (% of target committed) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-300" />
                <span>Funding Progress</span>
              </span>
              <span className="text-emerald-400 font-mono">{funding.percentFunded}% Committed</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden border border-pw-border">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${funding.percentFunded}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{funding.formattedCommitted}</span>
              <span>Target: {funding.formattedTarget}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-pw-border/50 flex items-center justify-between gap-2 mt-2">
          <button
            onClick={handleOpenAnalyzer}
            type="button"
            className="px-3 py-2 rounded-lg border border-pw-border text-[11px] font-bold text-slate-300 hover:bg-white/5 hover:border-slate-700/30 transition-all flex items-center gap-1.5 min-h-[36px]"
          >
            <Calculator className="w-3.5 h-3.5 text-slate-300" />
            <span>Analyzer</span>
          </button>

          <Link
            href={`/dashboard/deals/${slug}`}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-xs hover:bg-emerald-500 hover:text-slate-950 transition-all flex items-center gap-1 min-h-[36px]"
          >
            <span>View Deal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
