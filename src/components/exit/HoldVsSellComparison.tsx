'use client';

import React, { useState, useMemo } from 'react';
import { computeHoldVsSellComparison, HoldVsSellInput } from '@/lib/math/holdVsSell';

export interface HoldVsSellComparisonProps {
  initialData: Partial<HoldVsSellInput>;
}

export default function HoldVsSellComparison({ initialData }: HoldVsSellComparisonProps) {
  const [sellingCostPct, setSellingCostPct] = useState<number>(initialData.sellingCostPercent ?? 6.0);
  const [estimatedValue, setEstimatedValue] = useState<number>(initialData.estimatedCurrentValue || 350000);
  const [holdYears, setHoldYears] = useState<number>(initialData.holdYears || 3);
  const [appreciationPercent, setAppreciationPercent] = useState<number>(initialData.annualAppreciationPercent ?? 3.0);

  const comparison = useMemo(() => {
    return computeHoldVsSellComparison({
      estimatedCurrentValue: estimatedValue,
      sellingCostPercent: sellingCostPct,
      mortgagePayoff: initialData.mortgagePayoff || 200000,
      purchasePrice: initialData.purchasePrice || 250000,
      totalCashInvested: initialData.totalCashInvested || 60000,
      monthlyGrossRent: initialData.monthlyGrossRent || 2500,
      monthlyExpenses: initialData.monthlyExpenses || 900,
      annualDebtService: initialData.annualDebtService || 14000,
      annualAppreciationPercent: appreciationPercent,
      holdYears: holdYears,
    });
  }, [initialData, sellingCostPct, estimatedValue, holdYears, appreciationPercent]);

  const fmtCurrency = (val: number) =>
    val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div data-testid="hold-vs-sell-comparison" className="glass-card rounded-2xl p-6 space-y-6 border border-white/10 bg-[#121014]/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h3 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
            <span className="material-symbols-outlined text-[#7A9EAA]">compare_arrows</span>
            Hold-vs-Sell Decision Analysis
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Projected {holdYears}-year hold returns vs. immediate sale net proceeds (pure mathematical model).
          </p>
        </div>

        {/* Live Selling Cost % Slider */}
        <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Selling Costs:</label>
          <input
            type="range"
            data-testid="selling-cost-slider"
            min="1.0"
            max="10.0"
            step="0.5"
            value={sellingCostPct}
            onChange={(e) => setSellingCostPct(parseFloat(e.target.value))}
            className="w-24 accent-[#7A9EAA] cursor-pointer"
          />
          <span data-testid="selling-cost-display" className="text-xs font-bold text-emerald-400 tabular-nums">{sellingCostPct.toFixed(1)}%</span>
        </div>
      </div>
      
      {/* Interactive Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
        {/* Estimated Current Value Input */}
        <div className="space-y-1.5 text-left">
          <label className="block font-bold uppercase tracking-wider text-slate-400 text-[10px]">
            Estimated Current Value ($)
          </label>
          <input
            type="number"
            data-testid="hold-vs-sell-current-value-input"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#7A9EAA]"
          />
        </div>

        {/* Annual Appreciation % Slider */}
        <div className="space-y-1.5 text-left">
          <div className="flex justify-between">
            <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
              Annual Appreciation (%)
            </label>
            <span data-testid="appreciation-display" className="font-mono text-emerald-400 font-bold">{appreciationPercent.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            data-testid="appreciation-slider"
            min="0.0"
            max="12.0"
            step="0.5"
            value={appreciationPercent}
            onChange={(e) => setAppreciationPercent(parseFloat(e.target.value))}
            className="w-full accent-[#7A9EAA] cursor-pointer mt-1"
          />
        </div>

        {/* Hold Period (Years) Slider */}
        <div className="space-y-1.5 text-left">
          <div className="flex justify-between">
            <label className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
              Hold Period (Years)
            </label>
            <span data-testid="hold-years-display" className="font-mono text-emerald-400 font-bold">{holdYears} Years</span>
          </div>
          <input
            type="range"
            data-testid="hold-years-slider"
            min="1"
            max="10"
            step="1"
            value={holdYears}
            onChange={(e) => setHoldYears(parseInt(e.target.value, 10))}
            className="w-full accent-[#7A9EAA] cursor-pointer mt-1"
          />
        </div>
      </div>

      {/* Computed Verdict Banner (Purely Mathematical — No AI fluff) */}
      <div
        data-testid="verdict-banner"
        className={`p-4 rounded-xl border flex items-start gap-3 ${
          comparison.winner === 'HOLD'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}
      >
        <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">
          {comparison.winner === 'HOLD' ? 'insights' : 'payments'}
        </span>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest block opacity-75">
            Mathematical Verdict ({comparison.winner === 'HOLD' ? 'Hold 3 Years Wins' : 'Sell Now Wins'})
          </span>
          <p className="text-xs font-semibold leading-relaxed mt-0.5">{comparison.verdictBanner}</p>
        </div>
      </div>

      {/* Dual Path Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sell Now Path */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Sell Now Path</h4>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300">
              Immediate Liquidity
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Gross Sale Price</span>
              <span className="font-semibold text-white">{fmtCurrency(comparison.sellNow.grossSalePrice)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Selling Costs ({sellingCostPct.toFixed(1)}%)</span>
              <span className="font-semibold text-rose-400">− {fmtCurrency(comparison.sellNow.sellingCosts)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Mortgage Payoff</span>
              <span className="font-semibold text-rose-400">− {fmtCurrency(comparison.sellNow.mortgagePayoff)}</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm">
              <span className="text-white">Net Sale Proceeds</span>
              <span className="text-emerald-400 tabular-nums">{fmtCurrency(comparison.sellNow.netProceeds)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Equity Multiple</span>
              <span className="font-semibold text-slate-200">{comparison.sellNow.equityMultiple.toFixed(2)}x</span>
            </div>
          </div>
        </div>

        {/* Hold Path */}
        <div className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Hold {holdYears} Years Path</h4>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300">
              Max Value-Add
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Cumulative Operational Cash Flow</span>
              <span className="font-semibold text-white">{fmtCurrency(comparison.holdPath.cumulativeCashFlow)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Projected Terminal Value ({appreciationPercent}%/yr)</span>
              <span className="font-semibold text-white">{fmtCurrency(comparison.holdPath.projectedTerminalValue)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Terminal Sale Net Proceeds</span>
              <span className="font-semibold text-white">{fmtCurrency(comparison.holdPath.netTerminalProceeds)}</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm">
              <span className="text-white">Total 3-Yr Net Returns</span>
              <span className="text-emerald-400 tabular-nums">{fmtCurrency(comparison.holdPath.totalHoldNetReturns)}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px]">
              <span>Projected 3-Yr IRR / Equity Multiple</span>
              <span className="font-semibold text-emerald-300">
                {comparison.holdPath.irr}% IRR · {comparison.holdPath.equityMultiple.toFixed(2)}x EM
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
