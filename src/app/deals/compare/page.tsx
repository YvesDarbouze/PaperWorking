'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  MapPin,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyAmount, calculateFundingProgress } from '@/lib/deals/fundingUtils';

interface DealComparePayload {
  id: string;
  slug: string;
  address: string;
  propertyName: string;
  city: string;
  state: string;
  assetClass: string;
  subStrategy: string;
  purchasePrice: number;
  rehabCost: number;
  arv: number;
  holdingCosts: number;
  projectedRoi: number;
  capRate?: number;
  cashOnCash?: number;
  fundingTarget: number;
  committedAmount: number;
  investorCount: number;
}

export default function DealComparisonPage() {
  const searchParams = useSearchParams();
  const _router = useRouter();

  const idsParam = searchParams?.get('ids') || '';

  const [compareDeals, setCompareDeals] = useState<DealComparePayload[]>([]);

  useEffect(() => {
    async function loadCompareDeals() {
      const initialIds = idsParam.split(',').filter(Boolean);
      if (initialIds.length === 0) {
        setCompareDeals([]);
        return;
      }

      try {
        const res = await fetch('/api/deals', {
          headers: { authorization: 'Bearer mock_token' },
        });
        if (res.ok) {
          const data = await res.json();
          const allDeals: DealComparePayload[] = data.deals || [];
          const matched = allDeals.filter(
            (d) => initialIds.includes(d.id) || initialIds.includes(d.slug)
          );
          setCompareDeals(matched);
        } else {
          setCompareDeals([]);
        }
      } catch {
        setCompareDeals([]);
      }
    }

    loadCompareDeals();
  }, [idsParam]);

  const handleRemoveDeal = (dealId: string) => {
    setCompareDeals((prev) => prev.filter((d) => d.id !== dealId));
  };

  if (compareDeals.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-slate-100 p-8 flex flex-col items-center justify-center space-y-4 text-center">
        <SlidersHorizontal className="w-12 h-12 text-slate-500" />
        <h2 className="text-lg font-bold text-white">No deals selected for comparison</h2>
        <Link
          href="/dashboard/deals"
          className="px-5 py-2.5 rounded-[10px] bg-[#34d399] text-slate-950 font-extrabold text-xs uppercase"
        >
          Return to Discover Tab
        </Link>
      </div>
    );
  }

  // Calculate highest values for metric highlighting
  const maxRoi = Math.max(...compareDeals.map((d) => d.projectedRoi));
  const minPrice = Math.min(...compareDeals.map((d) => d.purchasePrice));
  const maxEquityMultiple = Math.max(
    ...compareDeals.map((d) => d.arv / (d.purchasePrice + d.rehabCost + d.holdingCosts))
  );

  const getGridColsClass = (count: number) => {
    if (count === 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 pb-28">
      {/* ── Glass Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <Link
            href="/dashboard/deals"
            className="text-xs font-bold text-[#34d399] hover:underline inline-flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Marketplace</span>
          </Link>
          <h1 data-testid="comparison-page-title" className="text-2xl font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-[#34d399]" />
            <span>Comparative Deal Analysis</span>
          </h1>
          <p className="text-xs text-slate-400">
            Side-by-side financial metrics, projected ROI, leverage ratios, and equity multiples.
          </p>
        </div>

        <span className="text-xs font-mono px-3 py-1.5 rounded-[8px] bg-white/5 border border-white/10 text-slate-300 self-start sm:self-auto">
          Comparing <strong className="text-[#34d399]">{compareDeals.length}</strong> Opportunities
        </span>
      </div>

      {/* ── Side-by-Side Glass Columns Grid ── */}
      <div data-testid="comparison-columns-grid" className={`grid gap-6 ${getGridColsClass(compareDeals.length)}`}>
        {compareDeals.map((deal) => {
          const totalBasis = deal.purchasePrice + deal.rehabCost + deal.holdingCosts;
          const equityMultiple = (deal.arv / totalBasis).toFixed(2);
          const isHighestRoi = deal.projectedRoi === maxRoi;
          const isLowestPrice = deal.purchasePrice === minPrice;
          const isHighestEquityMultiple = parseFloat(equityMultiple) === parseFloat(maxEquityMultiple.toFixed(2));
          const funding = calculateFundingProgress(deal.fundingTarget, deal.committedAmount);

          return (
            <div
              key={deal.id}
              data-testid={`compare-card-${deal.id}`}
              className="rounded-[14px] border border-white/10 bg-[#0a0a0f]/90 backdrop-blur-[14px] p-6 space-y-6 flex flex-col justify-between shadow-2xl relative"
            >
              {/* Header Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-extrabold uppercase bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
                      {deal.assetClass}
                    </span>
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-extrabold uppercase bg-white/5 text-slate-300 border border-white/10">
                      {deal.subStrategy}
                    </span>
                  </div>

                  <button
                    type="button"
                    data-testid={`remove-compare-${deal.id}`}
                    onClick={() => handleRemoveDeal(deal.id)}
                    className="p-1 rounded-[6px] hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Remove from comparison"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white line-clamp-1">{deal.propertyName}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#34d399]" />
                    <span>{deal.address}</span>
                  </p>
                </div>
              </div>

              {/* Aligned Metrics Section */}
              <div className="space-y-3 pt-4 border-t border-white/5 font-mono text-xs">
                {/* Purchase Price */}
                <div className={`p-2.5 rounded-[8px] flex items-center justify-between ${isLowestPrice ? 'border-l-2 border-[#34d399] bg-[#34d399]/[0.05]' : 'bg-white/[0.02]'}`}>
                  <span className="text-slate-400 font-sans text-[11px]">Purchase Price</span>
                  <span className="font-bold text-slate-100">{formatCurrencyAmount(deal.purchasePrice)}</span>
                </div>

                {/* Rehab Cost */}
                <div className="p-2.5 rounded-[8px] flex items-center justify-between bg-white/[0.02]">
                  <span className="text-slate-400 font-sans text-[11px]">Rehab Cost</span>
                  <span className="font-bold text-slate-100">{formatCurrencyAmount(deal.rehabCost)}</span>
                </div>

                {/* ARV */}
                <div className="p-2.5 rounded-[8px] flex items-center justify-between bg-white/[0.02]">
                  <span className="text-slate-400 font-sans text-[11px]">After Repair Value</span>
                  <span className="font-bold text-slate-100">{formatCurrencyAmount(deal.arv)}</span>
                </div>

                {/* Projected ROI */}
                <div
                  data-testid="roi-cell"
                  className={`p-2.5 rounded-[8px] flex items-center justify-between ${
                    isHighestRoi ? 'border-l-2 border-[#34d399] bg-[#34d399]/15 text-[#34d399]' : 'bg-white/[0.02]'
                  }`}
                >
                  <span className="text-slate-400 font-sans text-[11px]">Projected ROI</span>
                  <span className={`font-bold flex items-center gap-1 ${isHighestRoi ? 'text-[#34d399]' : 'text-slate-100'}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    {deal.projectedRoi}%
                  </span>
                </div>

                {/* Cap Rate */}
                <div className="p-2.5 rounded-[8px] flex items-center justify-between bg-white/[0.02]">
                  <span className="text-slate-400 font-sans text-[11px]">Cap Rate</span>
                  <span className="font-bold text-slate-100">{deal.capRate || 7.5}%</span>
                </div>

                {/* Cash-on-Cash */}
                <div className="p-2.5 rounded-[8px] flex items-center justify-between bg-white/[0.02]">
                  <span className="text-slate-400 font-sans text-[11px]">Cash-on-Cash Return</span>
                  <span className="font-bold text-slate-100">{deal.cashOnCash || 12.0}%</span>
                </div>

                {/* Equity Multiple */}
                <div className={`p-2.5 rounded-[8px] flex items-center justify-between ${isHighestEquityMultiple ? 'border-l-2 border-[#34d399] bg-[#34d399]/[0.05]' : 'bg-white/[0.02]'}`}>
                  <span className="text-slate-400 font-sans text-[11px]">Equity Multiple</span>
                  <span className="font-bold text-[#34d399]">{equityMultiple}x</span>
                </div>
              </div>

              {/* Funding Progress Bar */}
              <div className="space-y-1.5 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-sans">Crowdfund Progress</span>
                  <span className="font-bold text-[#34d399]">{funding.percentFunded}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#34d399] rounded-full" style={{ width: `${funding.percentFunded}%` }} />
                </div>
              </div>

              {/* Column Actions */}
              <div className="pt-4 border-t border-white/5 space-y-2">
                <Link
                  href={`/deals/${deal.slug}/detail`}
                  className="w-full py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md min-h-[44px]"
                >
                  <DollarSign className="w-4 h-4 text-slate-950" />
                  <span>Invest in this deal</span>
                </Link>

                <button
                  type="button"
                  onClick={() => handleRemoveDeal(deal.id)}
                  className="w-full py-2 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] font-bold text-xs uppercase transition-colors min-h-[36px]"
                >
                  Remove from comparison
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
