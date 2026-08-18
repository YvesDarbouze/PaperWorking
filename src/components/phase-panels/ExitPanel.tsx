'use client';

import React, { useState } from 'react';
import { Tag, TrendingUp, ShieldCheck, FileCheck2, Video, Calculator, DollarSign, Sparkles } from 'lucide-react';
import ExplainerVideoModal from './ExplainerVideoModal';

export default function ExitPanel() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [listingPrice, setListingPrice] = useState(580000);
  const [salePrice, setSalePrice] = useState(575000);
  const [purchasePrice] = useState(420000);
  const [rehabCosts] = useState(45000);
  const [holdingCosts] = useState(12000);
  const [sellingCosts] = useState(28000);
  const [is1031Exchange, setIs1031Exchange] = useState(false);

  // Capital Gains calculation
  const totalCostBasis = purchasePrice + rehabCosts + holdingCosts + sellingCosts;
  const netCapitalGain = Math.max(0, salePrice - totalCostBasis);
  const netProfit = salePrice - totalCostBasis;
  const roiPct = Math.round((netProfit / totalCostBasis) * 100);
  const saleToListRatio = ((salePrice / listingPrice) * 100).toFixed(1);

  const handleGenerateTaxDocs = () => {
    alert('Generating Schedule D (Form 1040), Form 8825, and 1099-S year-end tax documentation package...');
  };

  return (
    <section data-testid="exit-panel" id="exit-panel" className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-6 text-white backdrop-blur-md">
      {/* Top Banner & Video Trigger */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Exit & Disposition Phase Management
          </h2>
          <p className="text-xs text-slate-300">Property marketing, buyer closing, capital gains, 1031 exchange, & tax returns.</p>
        </div>

        <button
          onClick={() => setIsVideoOpen(true)}
          data-testid="exit-video-btn"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/30 border border-red-400/40 text-red-300 text-xs font-semibold hover:bg-red-600/40 transition"
        >
          <Video className="w-4 h-4" />
          <span>Watch Explainer</span>
        </button>
      </div>

      {/* KPI Header Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Days on Market</span>
          <span className="text-xl font-bold text-white">14 Days</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Sale-to-List Ratio</span>
          <span className="text-xl font-bold text-emerald-400">{saleToListRatio}%</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Net Realized Profit</span>
          <span className="text-xl font-bold text-emerald-400">${netProfit.toLocaleString()}</span>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <span className="text-xs text-slate-400 block">Total Realized ROI</span>
          <span className="text-xl font-bold text-emerald-400">{roiPct}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Marketing & Sale Tracker */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Tag className="w-4 h-4 text-red-400" />
            Marketing & Sale Contract Inputs
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block">Listing Price ($)</label>
              <input type="number" value={listingPrice} onChange={e => setListingPrice(Number(e.target.value))} className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <label className="text-slate-400 block">Final Sale Price ($)</label>
              <input type="number" value={salePrice} onChange={e => setSalePrice(Number(e.target.value))} className="w-full p-2.5 rounded bg-black/40 border border-white/10 text-white mt-1" />
            </div>
            <div>
              <span className="text-slate-400 block">Marketing Spend</span>
              <span className="font-semibold text-white mt-1 block">$4,500</span>
            </div>
            <div>
              <span className="text-slate-400 block">Closing Date</span>
              <span className="font-semibold text-white mt-1 block">2026-08-30</span>
            </div>
          </div>
        </div>

        {/* Capital Gains & 1031 Exchange Flag */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Calculator className="w-4 h-4 text-red-400" />
            Capital Gains & 1031 Exchange Flag
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Total Cost Basis:</span>
              <span className="font-bold text-white">${totalCostBasis.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Taxable Capital Gain:</span>
              <span className="font-bold text-amber-400">${netCapitalGain.toLocaleString()}</span>
            </div>

            <label className="flex items-center gap-2 p-3 rounded-lg bg-black/40 border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={is1031Exchange}
                onChange={e => setIs1031Exchange(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded"
              />
              <span className="text-xs font-semibold text-white">
                Flag for 1031 Tax-Deferred Exchange (Schedule D Deferral)
              </span>
            </label>

            {is1031Exchange && (
              <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs">
                ✓ 1031 Exchange flagged. Capital gains tax deferral active for Qualified Intermediary (QI) filing.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tax Document Generation Action */}
      <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            Auto-Generate Year-End Tax Package
          </h4>
          <p className="text-xs text-slate-400">Instantly compiles Schedule D, Schedule E, Form 8825, and 1099-S forms.</p>
        </div>

        <button
          onClick={handleGenerateTaxDocs}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Tax Forms</span>
        </button>
      </div>

      <ExplainerVideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        title="Marketing, Sales & 1031 Tax Strategy"
        videoUrl="https://www.youtube.com/embed/dQw4w9WgXcQ"
      />
    </section>
  );
}
