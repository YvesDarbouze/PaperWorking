'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Percent, Award, Briefcase } from 'lucide-react';

interface FinancialAssessmentStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

export default function FinancialAssessmentStep({
  initialData,
  onSave,
}: FinancialAssessmentStepProps) {
  const f = initialData?.financials || {};

  const [availableCapital, setAvailableCapital] = useState<number>(f.availableCapital || 50000);
  const [targetPurchaseMin, setTargetPurchaseMin] = useState<number>(f.targetPurchasePriceMin || 150000);
  const [targetPurchaseMax, setTargetPurchaseMax] = useState<number>(f.targetPurchasePriceMax || 450000);
  const [creditScore, setCreditScore] = useState<string>(f.creditScore !== undefined ? String(f.creditScore) : '');
  const [strategy, setStrategy] = useState<string>(initialData?.strategy || 'Rental');

  // Calculates Max Offer
  const isRentalOrCrowd = strategy === 'Rental' || strategy === 'Crowdfunding';
  const downPaymentRequirement = isRentalOrCrowd ? 0.25 : 0.20;
  const maxOffer = Math.round(availableCapital / downPaymentRequirement);

  // Suggested reserve (6 months base Operating Expenses)
  const suggestedReserve = 1200; // $200 * 6 months base projection placeholder

  // Financing Estimate based on credit score
  const scoreNum = Number(creditScore);
  const isGoodCredit = scoreNum >= 680;
  const financingEstimate = creditScore
    ? isGoodCredit
      ? 'Conventional Loan (Estimated 6.5% interest, 30-yr amortized, 75% LTV)'
      : 'Hard Money Loan (Estimated 9.5% interest, interest-only, 12-mo term, 80% LTC)'
    : 'Select or input credit score to estimate financing terms';

  const handleContinue = async () => {
    // Map strategy to dispositionType and subStrategy for system rules compatibility
    let dispositionType = 'RENT';
    let subStrategy = 'LONG_TERM';

    if (strategy === 'Flip') {
      dispositionType = 'SALE';
      subStrategy = 'FLIP';
    } else if (strategy === 'Wholesale') {
      dispositionType = 'SALE';
      subStrategy = 'WHOLESALE';
    } else if (strategy === 'Crowdfunding') {
      dispositionType = 'RENT';
      subStrategy = 'CROWDFUND';
    }

    const payload = {
      strategy,
      dispositionType,
      subStrategy,
      financials: {
        ...f,
        availableCapital,
        targetPurchasePriceMin: targetPurchaseMin,
        targetPurchasePriceMax: targetPurchaseMax,
        targetPurchasePrice: targetPurchaseMax, // default baseline target is the upper limit
        creditScore: creditScore ? Number(creditScore) : null,
        maxOffer,
      },
    };

    await onSave(payload);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 1: Financial Assessment</h3>
        <p className="text-xs text-slate-400">Establish your capital resources, buying range, and strategy.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strategy Selector */}
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Investment Strategy</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['Rental', 'Flip', 'Wholesale', 'Crowdfunding'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStrategy(s)}
                className={`py-3 px-4 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
                  strategy === s
                    ? 'bg-emerald-500/10 border-emerald-400 text-emerald-400 font-bold'
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Available Capital */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Available Liquid Capital ($)</label>
          <div className="relative">
            <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="number"
              value={availableCapital || ''}
              onChange={(e) => setAvailableCapital(Number(e.target.value))}
              placeholder="e.g. 50000"
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs font-medium"
            />
          </div>
        </div>

        {/* Credit Score */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">FICO Credit Score (Optional)</label>
          <div className="relative">
            <Award className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="number"
              min="300"
              max="850"
              value={creditScore}
              onChange={(e) => setCreditScore(e.target.value)}
              placeholder="e.g. 720"
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 text-xs font-medium"
            />
          </div>
        </div>

        {/* Sliders for Price Range */}
        <div className="space-y-2 md:col-span-2 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Target Purchase Price Range</span>
            <span className="text-white text-xs font-semibold">
              ${targetPurchaseMin.toLocaleString()} - ${targetPurchaseMax.toLocaleString()}
            </span>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 font-semibold uppercase">Min Price</span>
              <input
                type="range"
                min="50000"
                max="1000000"
                step="10000"
                value={targetPurchaseMin}
                onChange={(e) => setTargetPurchaseMin(Math.min(Number(e.target.value), targetPurchaseMax))}
                className="w-full accent-emerald-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 font-semibold uppercase">Max Price</span>
              <input
                type="range"
                min="50000"
                max="1000000"
                step="10000"
                value={targetPurchaseMax}
                onChange={(e) => setTargetPurchaseMax(Math.max(Number(e.target.value), targetPurchaseMin))}
                className="w-full accent-emerald-500 h-1 bg-white/5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Instant Results Output Card */}
      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" /> Instant Assessment Results
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Max Offer Budget</p>
            <p className="text-sm font-bold text-white">${maxOffer.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Required Operating Reserve</p>
            <p className="text-sm font-bold text-white">${suggestedReserve.toLocaleString()}</p>
          </div>
          <div className="col-span-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-500">Estimated Financing Route</p>
            <p className="text-slate-200 mt-0.5">{financingEstimate}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 bg-emerald-500 text-[#0d0a0b] hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-opacity"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}
