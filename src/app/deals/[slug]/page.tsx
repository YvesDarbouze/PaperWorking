'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  DollarSign,
  BarChart3,
  Image as ImageIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

export default function DealSlugPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const slug = (params?.slug as string) || '';
  const isCollisionWarning = searchParams?.get('warning') === 'collision';

  // Reverse slugify address for human-readable display
  const formatSlugAddress = (rawSlug: string): string => {
    if (!rawSlug) return 'New Property Deal';
    if (rawSlug.includes(',')) return rawSlug.split(',')[0];
    return rawSlug
      .replace(/([0-9]+)([a-zA-Z]+)/, '$1 $2')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
  };

  const displayAddress = formatSlugAddress(slug);

  // Accordion Section States
  const [openSections, setOpenSections] = useState({
    basics: true,
    analysis: true,
    details: false,
    publish: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Form Fields
  const [purchasePrice, setPurchasePrice] = useState<number>(350000);
  const [rehabCost, setRehabCost] = useState<number>(50000);
  const [arv, setArv] = useState<number>(480000);
  const [holdingCosts, setHoldingCosts] = useState<number>(12000);
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [publishMarketplace, setPublishMarketplace] = useState(true);
  const [organizeCrowdfund, setOrganizeCrowdfund] = useState(true);
  const [isSavedDraft, setIsSavedDraft] = useState(false);

  // Auto-calculated Projected ROI
  const totalBasis = purchasePrice + rehabCost + holdingCosts;
  const projectedRoi = totalBasis > 0 ? Number((((arv - totalBasis) / totalBasis) * 100).toFixed(1)) : 0;

  const handleSaveDraft = () => {
    setIsSavedDraft(true);
    setTimeout(() => {
      router.push('/deals?tab=my-activity');
    }, 1000);
  };

  const handlePublishDeal = () => {
    router.push(`/deals/${slug}/detail`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Top Header Banner */}
      <div className="rounded-[14px] border border-white/10 p-6 bg-[#0a0a0f]/90 backdrop-blur-[14px] shadow-2xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-[6px] text-[10px] font-extrabold uppercase tracking-wider bg-[#34d399]/20 text-[#34d399] border border-[#34d399]/30">
            Create Deal Listing
          </span>
          <span className="text-xs text-slate-400 font-mono">PaperWorking Workflow</span>
        </div>
        <h1 className="text-2xl font-bold text-white">{displayAddress}</h1>
        <p className="text-xs text-slate-400">
          Complete the deal underwriting sections below to publish this opportunity to the PaperWorking marketplace.
        </p>
      </div>

      {/* Collision Warning Banner */}
      {isCollisionWarning && (
        <div data-testid="collision-warning-banner" className="p-4 rounded-[12px] bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2.5 shadow-lg">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
          <span>Another deal exists at this address. Consider collaborating instead.</span>
        </div>
      )}

      {isSavedDraft && (
        <div data-testid="draft-saved-banner" className="p-4 rounded-[12px] bg-[#34d399]/15 border border-[#34d399]/30 text-[#34d399] text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#34d399]" />
          <span>Deal saved as Draft! Redirecting to My Activity...</span>
        </div>
      )}

      {/* ── Section 1: Basics Accordion ── */}
      <div className="rounded-[14px] border border-white/10 bg-[#0a0a0f]/90 backdrop-blur-[14px] overflow-hidden shadow-2xl">
        <button
          type="button"
          onClick={() => toggleSection('basics')}
          className="w-full p-5 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-5 h-5 text-[#34d399]" />
            <span className="text-sm font-bold text-white">1. Financial Basics</span>
          </div>
          {openSections.basics ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.basics && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Purchase Price ($)</label>
              <input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs font-mono text-white focus:outline-none focus:border-[#34d399]/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rehab Cost ($)</label>
              <input
                type="number"
                value={rehabCost}
                onChange={(e) => setRehabCost(Number(e.target.value))}
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs font-mono text-white focus:outline-none focus:border-[#34d399]/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">After Repair Value (ARV) ($)</label>
              <input
                type="number"
                value={arv}
                onChange={(e) => setArv(Number(e.target.value))}
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs font-mono text-white focus:outline-none focus:border-[#34d399]/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Holding Costs ($)</label>
              <input
                type="number"
                value={holdingCosts}
                onChange={(e) => setHoldingCosts(Number(e.target.value))}
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs font-mono text-white focus:outline-none focus:border-[#34d399]/40"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 2: Analysis Accordion ── */}
      <div className="rounded-[14px] border border-white/10 bg-[#0a0a0f]/90 backdrop-blur-[14px] overflow-hidden shadow-2xl">
        <button
          type="button"
          onClick={() => toggleSection('analysis')}
          className="w-full p-5 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-[#34d399]" />
            <span className="text-sm font-bold text-white">2. Pro-Forma & ROI Analysis</span>
          </div>
          {openSections.analysis ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.analysis && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-[12px] bg-white/[0.03] border border-white/5 flex items-center justify-between font-mono">
              <span className="text-xs text-slate-400 font-bold uppercase">Auto-Calculated Projected ROI</span>
              <span className="text-xl font-bold text-[#34d399]">{projectedRoi}%</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculated basis: Total Investment ${totalBasis.toLocaleString()} against ARV ${arv.toLocaleString()}.
            </p>
          </div>
        )}
      </div>

      {/* ── Section 3: Details & Media Accordion ── */}
      <div className="rounded-[14px] border border-white/10 bg-[#0a0a0f]/90 backdrop-blur-[14px] overflow-hidden shadow-2xl">
        <button
          type="button"
          onClick={() => toggleSection('details')}
          className="w-full p-5 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <ImageIcon className="w-5 h-5 text-[#34d399]" />
            <span className="text-sm font-bold text-white">3. Description & Media</span>
          </div>
          {openSections.details ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.details && (
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Executive Summary</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="High-ROI value-add opportunity..."
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs text-white focus:outline-none focus:border-[#34d399]/40 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Section 4: Publish & Crowdfund Options ── */}
      <div className="rounded-[14px] border border-white/10 bg-[#0a0a0f]/90 backdrop-blur-[14px] overflow-hidden shadow-2xl">
        <button
          type="button"
          onClick={() => toggleSection('publish')}
          className="w-full p-5 flex items-center justify-between border-b border-white/5 hover:bg-white/5 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#34d399]" />
            <span className="text-sm font-bold text-white">4. Publishing & Crowdfund Settings</span>
          </div>
          {openSections.publish ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {openSections.publish && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-white/[0.03] border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">List on Deals Marketplace</span>
                <span className="text-[10px] text-slate-400">If OFF, only invited investors can see this deal.</span>
              </div>
              <input
                type="checkbox"
                data-testid="publish-marketplace-toggle"
                checked={publishMarketplace}
                onChange={(e) => setPublishMarketplace(e.target.checked)}
                className="w-4 h-4 accent-[#34d399] rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-white/[0.03] border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">Organize Crowdfund</span>
                <span className="text-[10px] text-slate-400">Enable soft investment commitments</span>
              </div>
              <input
                type="checkbox"
                checked={organizeCrowdfund}
                onChange={(e) => setOrganizeCrowdfund(e.target.checked)}
                className="w-4 h-4 accent-[#34d399] rounded cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Actions Bar: Glass Ghost "Save as draft" + Teal Primary "Publish deal" ── */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
        <button
          type="button"
          data-testid="save-draft-btn"
          onClick={handleSaveDraft}
          className="px-5 py-3 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] font-bold text-xs uppercase tracking-wider transition-colors min-h-[44px] cursor-pointer"
        >
          Save as draft
        </button>

        <button
          type="button"
          data-testid="publish-deal-btn"
          onClick={handlePublishDeal}
          className="px-6 py-3 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl min-h-[44px] cursor-pointer"
        >
          <span>Publish Deal</span>
          <ArrowRight className="w-4 h-4 text-slate-950" />
        </button>
      </div>
    </div>
  );
}
