'use client';

import React, { useState, useMemo } from 'react';
import { DollarSign, Landmark, RefreshCw, Key, ChevronRight, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';

interface StrategyStepProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
}

export default function StrategyStep({
  initialData,
  onSave,
}: StrategyStepProps) {
  const f = initialData?.financials || {};

  // Input states
  const [strategy, setStrategy] = useState<string>(f.exitStrategy || 'Sell');
  const [targetDate, setTargetDate] = useState<string>(f.exitTargetDate || '');

  // Estimated values from properties
  const arValue = initialData?.estimatedARV || f.estimatedARV || 320000;
  const currentLoanBalance = f.loanAmount / 100 || 180000; // in dollars
  const projectedSalePrice = arValue;

  // Calculators
  const sellMetrics = useMemo(() => {
    const commission = projectedSalePrice * 0.06;
    const closingCosts = projectedSalePrice * 0.02;
    const payoff = currentLoanBalance;
    const netProceeds = projectedSalePrice - payoff - closingCosts - commission;
    const totalCashInvested = f.totalCashInvested / 100 || 80000;
    const roi = (netProceeds / totalCashInvested) * 100;
    return {
      netProceeds,
      roi,
      dom: 42, // average from RentCast Zip
    };
  }, [projectedSalePrice, currentLoanBalance, f.totalCashInvested]);

  const refinanceMetrics = useMemo(() => {
    const estimatedValue = projectedSalePrice;
    const maxLoan = estimatedValue * 0.75; // 75% LTV
    const cashOut = maxLoan - currentLoanBalance;
    const newMonthlyPayment = (maxLoan * 0.065) / 12; // 6.5% interest rate simple
    const projectedNOI = f.projectedNOI / 100 || 2200;
    const dscr = projectedNOI / (newMonthlyPayment * 12);
    return {
      cashOut,
      newPayment: newMonthlyPayment,
      dscr,
    };
  }, [projectedSalePrice, currentLoanBalance, f.projectedNOI]);

  const holdMetrics = useMemo(() => {
    const currentNOI = f.projectedNOI / 100 || 2200;
    const capRate = (currentNOI / projectedSalePrice) * 100;
    
    // 5-year projections (3% growth compounding)
    const year5Value = projectedSalePrice * Math.pow(1.03, 5);
    const year5Rent = (f.grossRent / 100 || 1800) * Math.pow(1.03, 5);
    return {
      capRate,
      year5Value,
      year5Rent,
    };
  }, [projectedSalePrice, f.projectedNOI, f.grossRent]);

  const handleContinue = async () => {
    const payload = {
      financials: {
        ...f,
        exitStrategy: strategy,
        exitTargetDate: targetDate,
        exitSellProceeds: sellMetrics.netProceeds * 100,
        exitRefiCashOut: refinanceMetrics.cashOut * 100,
        exitHoldCapRate: holdMetrics.capRate,
      },
    };
    await onSave(payload);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Step 1: Exit Strategy Selection</h3>
        <p className="text-xs text-slate-400">Evaluate pro-forma returns across Sale, Refinance, and Hold strategies to define your target disposition.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* SELL CARD */}
        <div
          onClick={() => setStrategy('Sell')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[220px] ${
            strategy === 'Sell'
              ? 'bg-[#454955]/15 border-[#7A9EAA] shadow-[0_0_15px_rgba(122,158,170,0.15)] text-white'
              : 'bg-white/[0.01] border-white/5 text-slate-400 hover:border-white/10'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Option 1</span>
              <DollarSign className="w-4 h-4 text-[#7A9EAA]" />
            </div>
            <h4 className="text-sm font-bold text-white">Sell Property</h4>
            <p className="text-[11px] opacity-80 leading-relaxed">Sell the asset on the open market and realize accumulated equity gains.</p>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="opacity-60">Projected Net Proceeds</span>
              <span className="font-bold text-white">${Math.round(sellMetrics.netProceeds).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Estimated ROI</span>
              <span className="font-bold text-emerald-400">{sellMetrics.roi.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="opacity-60">Avg. Days on Market</span>
              <span className="font-semibold text-white">{sellMetrics.dom} Days</span>
            </div>
          </div>
        </div>

        {/* REFINANCE CARD */}
        <div
          onClick={() => setStrategy('Refinance')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[220px] ${
            strategy === 'Refinance'
              ? 'bg-[#454955]/15 border-[#7A9EAA] shadow-[0_0_15px_rgba(122,158,170,0.15)] text-white'
              : 'bg-white/[0.01] border-white/5 text-slate-400 hover:border-white/10'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Option 2</span>
              <Landmark className="w-4 h-4 text-[#7A9EAA]" />
            </div>
            <h4 className="text-sm font-bold text-white">Refinance Equity</h4>
            <p className="text-[11px] opacity-80 leading-relaxed">Pull out cash-tax free with a new senior debt and keep holding as a rental.</p>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="opacity-60">Projected Cash-Out</span>
              <span className="font-bold text-white">${Math.round(refinanceMetrics.cashOut).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">New Debt Service</span>
              <span className="font-bold text-white">${Math.round(refinanceMetrics.newPayment).toLocaleString()}/mo</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="opacity-60">Projected DSCR</span>
              <span className="font-semibold text-[#7A9EAA]">{refinanceMetrics.dscr.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* HOLD CARD */}
        <div
          onClick={() => setStrategy('Hold')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[220px] ${
            strategy === 'Hold'
              ? 'bg-[#454955]/15 border-[#7A9EAA] shadow-[0_0_15px_rgba(122,158,170,0.15)] text-white'
              : 'bg-white/[0.01] border-white/5 text-slate-400 hover:border-white/10'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A9EAA]">Option 3</span>
              <TrendingUp className="w-4 h-4 text-[#7A9EAA]" />
            </div>
            <h4 className="text-sm font-bold text-white">Hold Long-Term</h4>
            <p className="text-[11px] opacity-80 leading-relaxed">Keep the current financing setup active, building up equity from amortization.</p>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="opacity-60">Projected Cap Rate</span>
              <span className="font-bold text-white">{holdMetrics.capRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Year 5 Comp. Value</span>
              <span className="font-bold text-white">${Math.round(holdMetrics.year5Value).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="opacity-60">Year 5 Rent</span>
              <span className="font-semibold text-white">${Math.round(holdMetrics.year5Rent).toLocaleString()}/mo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Target date configuration */}
      <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 max-w-sm">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Target Exit Date</label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs font-semibold h-9"
        />
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <span />
        <button
          onClick={handleContinue}
          className="px-6 py-2.5 bg-[#7A9EAA] text-[#0d0a0b] hover:opacity-90 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-opacity flex items-center gap-1.5"
        >
          Select & Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
