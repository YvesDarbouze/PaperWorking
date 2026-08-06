'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Building2,
  MapPin,
  Calculator,
  ArrowLeft,
  Share2,
  Bookmark,
  Users,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Mail,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { calculateFundingProgress, mapDealCardMetrics, formatCurrencyAmount } from '@/lib/deals/fundingUtils';
import DealEngagementModule from '@/components/deals/DealEngagementModule';
import toast from 'react-hot-toast';

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();

  const slugParam = (params?.slug as string) || '';

  // Auth / Role Guard
  const isVendor = profile?.accountType === 'vendor' || profile?.role === 'Vendor';
  useEffect(() => {
    document.title = `PaperWorking — Deal Detail ${slugParam ? `(${slugParam})` : ''}`;
    if (isVendor) {
      router.replace('/dashboard/marketplace');
    }
  }, [isVendor, router, slugParam]);

  // Engagement States
  const [isSaved, setIsSaved] = useState(false);
  const [committedAmountState, setCommittedAmountState] = useState(130000);
  const [investorCountState, setInvestorCountState] = useState(5);

  // Seed / Mock Deal Detail Payload derived from slug
  const deal = {
    id: `deal_${slugParam}`,
    slug: slugParam,
    displayAddress: slugParam
      ? slugParam.replace(/([0-9]+)([a-zA-Z]+)/, '$1 $2').replace(/([a-z])([A-Z])/g, '$1 $2')
      : '123 Main St, Austin, TX 78701',
    propertyName: 'Austin Prime Multifamily / Residential Project',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    assetClass: 'Multi-Family',
    subStrategy: 'FLIP & HOLD',
    status: committedAmountState >= 200000 ? 'FUNDED' : 'LISTED',
    price: 350000,
    rehabCost: 50000,
    arv: 480000,
    estimatedRent: 3200,
    fundingTarget: 200000,
    currency: 'USD',
    owner: {
      displayName: 'Marcus Aurelius',
      title: 'Lead Investor & Deal Owner',
      organization: 'Apex Capital Holdings',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      bio: 'Commercial real estate syndicator with 12+ years experience across Sunbelt markets.',
    },
  };

  const metrics = mapDealCardMetrics(deal);
  const funding = calculateFundingProgress(
    deal.fundingTarget,
    committedAmountState,
    investorCountState,
    deal.currency
  );

  const handleSaveToggle = () => {
    setIsSaved(!isSaved);
    toast.success(isSaved ? 'Removed from saved deals' : 'Deal saved to your bookmarks!', { id: 'save-toast' });
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Deal link copied to clipboard!', { id: 'share-toast' });
    }
  };

  const handleOpenAnalyzer = () => {
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
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8 animate-fade-in">
      {/* Navigation Breadcrumb & Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/deals"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Deals Marketplace</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Deals</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-200 font-bold truncate max-w-xs">{slugParam}</span>
        </div>
      </div>

      {/* ── Address Hero Header ── */}
      <div className="glass-card rounded-2xl border border-pw-border p-6 md:p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-slate-800/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase border ${
                deal.status === 'FUNDED'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}>
                {deal.status}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-extrabold uppercase bg-white/5 text-slate-300 border border-pw-border">
                {deal.assetClass}
              </span>
              <span className="px-3 py-1 rounded-md text-xs font-extrabold uppercase bg-white/5 text-slate-300 border border-pw-border">
                {deal.subStrategy}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100">{deal.propertyName}</h1>
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-300 shrink-0" />
              <span>{deal.displayAddress}</span>
            </p>
            <p className="text-xs text-slate-400">
              Canonical Slug: <code className="text-slate-300 font-mono">{slugParam}</code>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 self-start">
            <button
              onClick={handleSaveToggle}
              className={`h-11 px-4 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 min-h-[44px] ${
                isSaved
                  ? 'bg-slate-800/20 text-slate-300 border-slate-700/40'
                  : 'bg-white/5 text-slate-300 border-pw-border hover:bg-white/10'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-emerald-400' : ''}`} />
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
            <button
              onClick={handleShare}
              className="h-11 px-4 rounded-xl border border-pw-border bg-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2 min-h-[44px]"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button
              onClick={handleOpenAnalyzer}
              className="h-11 px-4 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg min-h-[44px]"
            >
              <Calculator className="w-4 h-4" />
              <span>Open in Deal Analyzer</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Grid: Left (Metrics + Map) / Right (Engagement + Owner) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Full Analyzer Underwriting Panel */}
          <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-pw-border pb-4">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-slate-300" />
                <span>Financial Underwriting Snapshot</span>
              </h2>
              <button
                onClick={handleOpenAnalyzer}
                className="text-xs font-bold text-slate-300 hover:underline flex items-center gap-1"
              >
                <span>Deep Underwriting Mode</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-pw-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Purchase Price
                </span>
                <span className="text-base font-extrabold font-mono text-slate-100">
                  {formatCurrencyAmount(metrics.purchasePrice)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-pw-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Rehab Budget
                </span>
                <span className="text-base font-extrabold font-mono text-slate-100">
                  {formatCurrencyAmount(metrics.rehabCost)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-pw-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  After Repair Value
                </span>
                <span className="text-base font-extrabold font-mono text-slate-300">
                  {formatCurrencyAmount(metrics.arv)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-pw-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Monthly Rent
                </span>
                <span className="text-base font-extrabold font-mono text-slate-300">
                  {formatCurrencyAmount(metrics.monthlyRent)}
                </span>
              </div>
            </div>

            {/* Return Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-800/10 border border-slate-700/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-300 block">Cash-on-Cash Return</span>
                  <span className="text-xl font-extrabold font-mono text-white mt-1 block">
                    {metrics.cashOnCash}%
                  </span>
                </div>
                <TrendingUp className="w-6 h-6 text-slate-300" />
              </div>
              <div className="p-4 rounded-xl bg-slate-800/10 border border-slate-700/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-300 block">Cap Rate</span>
                  <span className="text-xl font-extrabold font-mono text-white mt-1 block">
                    {metrics.capRate}%
                  </span>
                </div>
                <TrendingUp className="w-6 h-6 text-slate-300" />
              </div>
              <div className="p-4 rounded-xl bg-slate-800/10 border border-slate-700/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-300 block">Projected ROI</span>
                  <span className="text-xl font-extrabold font-mono text-white mt-1 block">
                    {metrics.projectedROI}%
                  </span>
                </div>
                <TrendingUp className="w-6 h-6 text-slate-300" />
              </div>
            </div>
          </div>

          {/* Property Location Map */}
          <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-300" />
              <span>Location & Geographic Overview</span>
            </h3>
            <div className="h-64 w-full rounded-xl bg-slate-900 border border-pw-border relative overflow-hidden flex items-center justify-center">
              <div className="text-center space-y-2 p-6">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto animate-bounce" />
                <p className="text-sm font-bold text-slate-200">{deal.displayAddress}</p>
                <p className="text-xs text-slate-400">Interactive geographic boundary & satellite view enabled</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Engagement & Invitations Module + Owner Business Card */}
        <div className="space-y-8">
          {/* Funding Progress & Engagement Module */}
          <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-slate-300" />
                <span>Crowdfunding & Engagement</span>
              </h2>
              {funding.isFullyFunded && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  100% Funded
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-slate-300">Progress</span>
                <span className="text-emerald-400 font-mono">{funding.percentFunded}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-pw-border">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${funding.percentFunded}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
                <span>Committed: {funding.formattedCommitted}</span>
                <span>Target: {funding.formattedTarget}</span>
              </div>
            </div>

            {/* Engagement Form (Flow 1, 2, 4) */}
            <DealEngagementModule
              dealId={deal.id}
              dealSlug={deal.slug}
              displayAddress={deal.displayAddress}
              fundingTarget={deal.fundingTarget}
              committedAmount={committedAmountState}
              currency={deal.currency}
              onInterestAdded={(interest) => {
                if (interest.status === 'COMMITTED') {
                  const added = interest.amountIntent || (deal.fundingTarget * (interest.percentIntent || 0)) / 100;
                  setCommittedAmountState((prev) => prev + added);
                  setInvestorCountState((prev) => prev + 1);
                }
              }}
            />
          </div>

          {/* Deal Owner Business Card Block */}
          <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Deal Owner & Syndicator
            </h3>

            <div className="flex items-center gap-4">
              <img
                src={deal.owner.avatarUrl}
                alt={deal.owner.displayName}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-700/30 shadow-md"
              />
              <div>
                <h4 className="text-base font-extrabold text-slate-100">{deal.owner.displayName}</h4>
                <p className="text-xs font-bold text-slate-300">{deal.owner.title}</p>
                <p className="text-xs text-slate-400">{deal.owner.organization}</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-pw-border/50">
              {deal.owner.bio}
            </p>

            <button
              onClick={() => toast.success(`Messaging initiated with ${deal.owner.displayName}`, { id: 'contact-toast' })}
              className="w-full h-11 rounded-xl border border-pw-border bg-white/5 text-slate-200 text-xs font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Contact Deal Owner</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
