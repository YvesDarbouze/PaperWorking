'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { computeCapitalGainsTax } from '@/lib/math/calculatorUtils';
import { Gem, ArrowDown, ArrowUp, Clock, TrendingUp } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Net Proceeds Card — Final Profit & Tax Liability
   
   The single source of truth for what the sponsor walks 
   away with. Renders capital gains, holding period, 
   tax estimate, and net-after-tax in real time.
   ═══════════════════════════════════════════════════════ */

interface NetProceedsCardProps {
  deal: Project;
}

export default function NetProceedsCard({ deal }: NetProceedsCardProps) {
  const tax = useMemo(() => computeCapitalGainsTax(deal), [deal]);

  const fmt = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const isProfit = tax.capitalGain > 0;

  return (
    <div className="glass-card border border-pw-border rounded-none shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-pw-black text-pw-white">
        <div className="flex items-center gap-2">
          <Gem className="w-4 h-4" />
          <h3 className="text-xs font-black tracking-[0.3em] uppercase">Net_Proceeds_Calculator</h3>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-text-secondary" />
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
            {tax.holdingPeriodDays}d → {tax.isLongTerm ? 'Long-Term' : 'Short-Term'}
          </span>
        </div>
      </div>

      {/* Primary Metric: Net After Tax */}
      <div className="px-8 py-8 text-center bg-pw-glass-bg/50 border-b border-pw-border">
        <p className="text-[9px] font-black text-text-secondary uppercase tracking-[0.4em] mb-2">
          Net.After.Tax
        </p>
        <div className="flex items-center justify-center gap-2">
          {isProfit ? (
            <ArrowUp className="w-6 h-6 text-pw-accent" />
          ) : (
            <ArrowDown className="w-6 h-6 text-color-error" />
          )}
          <span className={`text-5xl font-black font-mono tracking-tighter ${
            isProfit ? 'text-pw-accent' : 'text-color-error'
          }`}>
            {fmt(tax.netAfterTax)}
          </span>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 gap-px bg-pw-border">
        {/* Cost Basis */}
        <div className="bg-pw-glass-bg px-5 py-4">
          <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Cost_Basis</p>
          <p className="text-lg font-black font-mono tracking-tighter text-text-primary">{fmt(tax.costBasis)}</p>
          <p className="text-[9px] text-text-secondary mt-0.5">Purchase + Rehab + Acq + Hold</p>
        </div>

        {/* Net Proceeds */}
        <div className="bg-pw-glass-bg px-5 py-4">
          <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Net_Proceeds</p>
          <p className="text-lg font-black font-mono tracking-tighter text-text-primary">{fmt(tax.netProceeds)}</p>
          <p className="text-[9px] text-text-secondary mt-0.5">Sale Price − Sell Costs</p>
        </div>

        {/* Capital Gain */}
        <div className="bg-pw-glass-bg px-5 py-4">
          <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Capital_Gain</p>
          <p className={`text-lg font-black font-mono tracking-tighter ${isProfit ? 'text-pw-accent' : 'text-color-error'}`}>
            {fmt(tax.capitalGain)}
          </p>
          <p className="text-[9px] text-text-secondary mt-0.5">Net Proceeds − Cost Basis</p>
        </div>

        {/* Tax Liability */}
        <div className="bg-pw-glass-bg px-5 py-4">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Tax_Liability</p>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-none ${
              tax.isLongTerm ? 'bg-pw-accent/10 text-pw-accent' : 'bg-pw-muted/20 text-text-primary'
            }`}>
              {tax.estimatedTaxRate}%
            </span>
          </div>
          <p className="text-lg font-black font-mono tracking-tighter text-color-error">
            −{fmt(tax.estimatedTaxLiability)}
          </p>
          <p className="text-[9px] text-text-secondary mt-0.5">
            {tax.isLongTerm ? 'LTCG @ 15%' : `Ordinary Income @ ${tax.estimatedTaxRate}%`}
          </p>
        </div>
      </div>

      {/* Holding Period Bar */}
      <div className="px-6 py-4 border-t border-pw-border bg-pw-glass-bg/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest">Holding_Period</span>
          <span className="text-[10px] font-bold font-mono text-text-primary">{tax.holdingPeriodDays} days</span>
        </div>
        <div className="w-full h-1.5 bg-pw-border rounded-none overflow-hidden">
          <div
            className="h-full transition-all duration-700 bg-pw-accent"
            style={{ width: `${Math.min(100, (tax.holdingPeriodDays / 730) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[8px] text-text-secondary">0d</span>
          <span className={`text-[8px] font-bold ${tax.holdingPeriodDays > 365 ? 'text-pw-accent' : 'text-text-secondary'}`}>
            365d (LTCG threshold)
          </span>
          <span className="text-[8px] text-text-secondary">730d</span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-6 py-3 border-t border-pw-border bg-pw-glass-bg/10">
        <p className="text-[8px] text-text-secondary leading-relaxed">
          ⚠ Estimates only. Consult a CPA for final tax liabilities. Does not account for 1031 exchanges, depreciation recapture, or state taxes.
        </p>
      </div>
    </div>
  );
}
