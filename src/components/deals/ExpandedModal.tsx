'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  TrendingUp,
  Building2,
  Share2,
  Mail,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Lock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrencyAmount, calculateFundingProgress } from '@/lib/deals/fundingUtils';
import InvestmentPanel from '@/components/deals/InvestmentPanel';
import UnifiedMessageThread from '@/components/deals/UnifiedMessageThread';
import InviteModal from '@/components/deals/InviteModal';
import ShareDeal from '@/components/deals/ShareDeal';

export interface ExpandedModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal: {
    id: string;
    slug: string;
    address: string;
    propertyName?: string;
    city?: string;
    state?: string;
    assetClass?: string;
    subStrategy?: string;
    status?: string;
    purchasePrice: number | string;
    rehabCost?: number | string;
    arv?: number | string;
    holdingCosts?: number | string;
    projectedRoi: number | string;
    fundingTarget?: number;
    committedAmount?: number;
    investorCount?: number;
    description?: string;
    imageUrl?: string;
  };
  source?: 'card' | 'detail';
  isSubscribed?: boolean;
}

export default function ExpandedModal({
  isOpen,
  onClose,
  deal,
  source = 'detail',
  isSubscribed = true,
}: ExpandedModalProps) {
  const openTimeRef = useRef<number>(0);
  const [isMobileAnalyzerOpen, setIsMobileAnalyzerOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleClose = useCallback(() => {
    if (openTimeRef.current > 0) {
      const duration = Math.round((Date.now() - openTimeRef.current) / 1000);
      console.log(`[Analytics] Event: deal_expanded_modal_close`, {
        dealId: deal.id,
        durationSeconds: duration,
      });
    }

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('expanded');
      window.history.pushState({}, '', url.toString());
    }

    onClose();
  }, [deal.id, onClose]);

  // Synchronize URL query parameter ?expanded=true (shallow update)
  useEffect(() => {
    if (!isOpen) return;

    openTimeRef.current = Date.now();
    console.log(`[Analytics] Event: deal_expanded_modal_open`, {
      dealId: deal.id,
      source,
      timestamp: new Date().toISOString(),
    });

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('expanded', 'true');
      window.history.pushState({}, '', url.toString());
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, deal.id, source, handleClose]);

  if (!isOpen) return null;

  const priceNum = typeof deal.purchasePrice === 'number' ? deal.purchasePrice : parseFloat(deal.purchasePrice) || 350000;
  const rehabNum = typeof deal.rehabCost === 'number' ? deal.rehabCost : parseFloat(String(deal.rehabCost || 50000)) || 50000;
  const arvNum = typeof deal.arv === 'number' ? deal.arv : parseFloat(String(deal.arv || 480000)) || 480000;
  const roiNum = typeof deal.projectedRoi === 'number' ? deal.projectedRoi : parseFloat(deal.projectedRoi) || 18.5;

  const target = deal.fundingTarget || 200000;
  const committed = deal.committedAmount || 130000;
  const funding = calculateFundingProgress(target, committed);

  return (
    <div
      data-testid="expanded-deal-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 bg-black/85 backdrop-blur-[24px] overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative w-full h-full md:h-auto md:min-w-[90vw] md:min-h-[90vh] md:max-w-7xl rounded-none md:rounded-[16px] border border-white/[0.08] bg-[#0a0a0f]/95 backdrop-blur-[24px] shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* ── Fixed Top Close Button ── */}
        <button
          type="button"
          data-testid="close-expanded-modal"
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all cursor-pointer shadow-lg"
          title="Close expanded view (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Header Surface ── */}
        <div className="p-6 border-b border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-[12px] flex items-center justify-between shrink-0 pr-16">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-[6px] text-[10px] font-extrabold uppercase bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
                {deal.assetClass || 'Multi-family'}
              </span>
              <span className="px-2.5 py-0.5 rounded-[6px] text-[10px] font-extrabold uppercase bg-white/5 text-slate-300 border border-white/10">
                {deal.subStrategy || 'FLIP'}
              </span>
              <span className="px-2.5 py-0.5 rounded-[6px] text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {deal.status || 'published'}
              </span>
            </div>
            <h2 data-testid="expanded-modal-address" className="text-xl font-bold text-white">
              {deal.address}
            </h2>
          </div>
        </div>

        {/* ── Modal Content Body: Left / Right Split Grid ── */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
          {/* ── Left Panel (60% width on Desktop: md:col-span-7) ── */}
          <div data-testid="expanded-modal-left-panel" className="md:col-span-7 p-6 space-y-6 overflow-y-auto">
            {/* Gallery Placeholder */}
            <div className="relative h-64 w-full rounded-[14px] bg-gradient-to-br from-slate-900 via-[#0a0a0f] to-slate-950 border border-white/10 overflow-hidden flex items-center justify-center">
              {deal.imageUrl ? (
                <Image src={deal.imageUrl} alt={deal.address} fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 opacity-40">
                  <Building2 className="w-12 h-12 text-[#34d399]" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    High-Resolution Property Media
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Executive Overview</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {deal.description ||
                  'Prime real estate investment opportunity with strong projected ROI. Underwritten using verified market data, RentCast AVM estimates, and comprehensive rehab pro-forma calculations.'}
              </p>
            </div>

            {/* Unified Message Thread */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#34d399]" />
                <span>Investor Communication & Inbound Thread</span>
              </h3>
              <div data-testid="expanded-message-thread" className="min-h-[300px]">
                <UnifiedMessageThread dealId={deal.id} />
              </div>
            </div>
          </div>

          {/* ── Right Panel (40% width on Desktop: md:col-span-5) ── */}
          <div data-testid="expanded-modal-right-panel" className="md:col-span-5 p-6 space-y-6 overflow-y-auto bg-white/[0.01]">
            {/* Financial Paywall Overlay for Unsubscribed Users */}
            {!isSubscribed ? (
              <div data-testid="expanded-paywall-overlay" className="p-6 rounded-[14px] border border-white/10 bg-[#0a0a0f]/90 backdrop-blur-[14px] text-center space-y-3">
                <Lock className="w-8 h-8 text-[#34d399] mx-auto" />
                <h4 className="text-sm font-bold text-white">Financials Paywalled</h4>
                <p className="text-xs text-slate-400">
                  Subscribe to PaperWorking to unlock full financial metrics and investment commitments.
                </p>
                <Link
                  href="/dashboard/settings/billing?paywall=deals"
                  className="inline-block px-4 py-2 rounded-[10px] bg-[#34d399] text-slate-950 font-black text-xs uppercase"
                >
                  Unlock Subscription
                </Link>
              </div>
            ) : (
              <>
                {/* Glass Metric Cards (2x2 Grid) */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="p-3.5 rounded-[12px] border border-white/10 bg-[#0a0a0f]/80 backdrop-blur-[8px]">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block font-sans">Purchase Price</span>
                    <span className="text-sm font-bold text-slate-100">{formatCurrencyAmount(priceNum)}</span>
                  </div>
                  <div className="p-3.5 rounded-[12px] border border-white/10 bg-[#0a0a0f]/80 backdrop-blur-[8px]">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block font-sans">Rehab Cost</span>
                    <span className="text-sm font-bold text-slate-100">{formatCurrencyAmount(rehabNum)}</span>
                  </div>
                  <div className="p-3.5 rounded-[12px] border border-white/10 bg-[#0a0a0f]/80 backdrop-blur-[8px]">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block font-sans">ARV</span>
                    <span className="text-sm font-bold text-slate-100">{formatCurrencyAmount(arvNum)}</span>
                  </div>
                  <div className="p-3.5 rounded-[12px] border border-white/10 bg-[#0a0a0f]/80 backdrop-blur-[8px]">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block font-sans">Projected ROI</span>
                    <span className="text-sm font-bold text-[#34d399] flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {roiNum}%
                    </span>
                  </div>
                </div>

                {/* Desktop / Mobile Collapsible Deal Analyzer Embed */}
                <div data-testid="expanded-deal-analyzer" className="rounded-[14px] border border-white/10 p-4 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-[#34d399]" />
                      <span>Interactive Deal Underwriting Engine</span>
                    </span>
                    <button
                      type="button"
                      data-testid="mobile-analyzer-accordion"
                      onClick={() => setIsMobileAnalyzerOpen(!isMobileAnalyzerOpen)}
                      className="md:hidden text-slate-400 hover:text-white"
                    >
                      {isMobileAnalyzerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className={`space-y-2 text-xs font-mono ${isMobileAnalyzerOpen ? 'block' : 'hidden md:block'}`}>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Basis:</span>
                      <span className="text-white font-bold">{formatCurrencyAmount(priceNum + rehabNum)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Estimated Profit:</span>
                      <span className="text-[#34d399] font-bold">{formatCurrencyAmount(arvNum - (priceNum + rehabNum))}</span>
                    </div>
                  </div>
                </div>

                {/* Crowdfund Progress Bar (8px height) */}
                <div className="rounded-[12px] border border-white/10 p-4 bg-[#0a0a0f]/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400 font-sans">Crowdfund Progress</span>
                    <span className="font-bold text-[#34d399]">{funding.percentFunded}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-[#34d399] rounded-full" style={{ width: `${funding.percentFunded}%` }} />
                  </div>
                </div>

                {/* Investment Commitment Panel */}
                <InvestmentPanel
                  dealId={deal.id}
                  fundingTarget={target}
                  committedAmount={committed}
                />

                {/* Action Buttons (Stacked Vertically on Mobile) */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="w-full py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-md min-h-[44px]"
                  >
                    <Mail className="w-4 h-4 text-slate-950" />
                    <span>Invite Investors</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="w-full py-2 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] font-bold text-xs uppercase flex items-center justify-center gap-1.5 min-h-[40px]"
                  >
                    <Share2 className="w-4 h-4 text-[#34d399]" />
                    <span>Share Analysis</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        dealId={deal.id}
        dealAddress={deal.address || '123 Main St'}
      />

      {isShareModalOpen && (
        <ShareDeal
          address={deal.address || '123 Main St'}
          slug={deal.slug || deal.id}
          percentFunded={funding.percentFunded}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}
