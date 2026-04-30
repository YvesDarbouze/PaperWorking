'use client';

import React from 'react';
import { Calculator, TrendingUp, Hammer, DollarSign, ArrowRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   DealAnalyzer — Financial Data Visualization
   
   Design distinct, elevated #FFFFFF cards to capture and calculate
   the After Repair Value (ARV) and Estimated Rehab Costs. Prominently
   displays a dynamic calculation for the Maximum Allowable Offer (MAO).
   Uses a large typography scale for the MAO output.
   ═══════════════════════════════════════════════════════════════ */

interface DealAnalyzerProps {
  arvCents?: number;
  rehabCents?: number;
  counterPriceCents?: number;
  phaseColor?: string;
}

export function DealAnalyzer({
  arvCents = 0,
  rehabCents = 0,
  counterPriceCents,
  phaseColor = '#595959',
}: DealAnalyzerProps) {
  const arv = arvCents / 100;
  const rehab = rehabCents / 100;

  // Rule of thumb: MAO = (ARV * 70%) - Rehab
  const maxAllowableOffer = (arv * 0.70) - rehab;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <section
      className="rounded-lg overflow-hidden flex flex-col shadow-sm"
      style={{
        background: 'var(--bg-surface, #FFFFFF)',
        border: '1px solid var(--border-ui)',
      }}
    >
      {/* ── Header ── */}
      <div className="px-8 py-5 flex items-center gap-3" style={{ background: phaseColor }}>
        <Calculator className="w-4 h-4 text-white" aria-hidden="true" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
          Deal Analysis (70% Rule)
        </h2>
      </div>

      <div className="p-8 space-y-8">
        {/* ── ARV & Rehab Inputs (Read-Only Representation from Conversational Form) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* ARV Card */}
          <div className="flex flex-col gap-3 p-6 rounded-lg shadow-md transition-shadow hover:shadow-lg" style={{ border: '1px solid var(--border-ui)', background: '#FFFFFF' }}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: phaseColor }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>
                Target ARV
              </span>
            </div>
            <div className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(arv)}
            </div>
            <div className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Estimated After-Repair Value
            </div>
          </div>

          {/* Rehab Card */}
          <div className="flex flex-col gap-3 p-6 rounded-lg shadow-md transition-shadow hover:shadow-lg" style={{ border: '1px solid var(--border-ui)', background: '#FFFFFF' }}>
            <div className="flex items-center gap-2">
              <Hammer className="w-4 h-4" style={{ color: phaseColor }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>
                Rehab Costs
              </span>
            </div>
            <div className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(rehab)}
            </div>
            <div className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              Estimated Renovation Budget
            </div>
          </div>
        </div>

        {/* ── Calculation Visualizer ── */}
        <div className="flex items-center justify-center gap-4 py-2 opacity-60">
          <div className="text-xs font-bold tabular-nums tracking-widest uppercase">
            ({formatCurrency(arv)} × 70%)
          </div>
          <div className="text-xs font-bold">—</div>
          <div className="text-xs font-bold tabular-nums tracking-widest uppercase">
            {formatCurrency(rehab)}
          </div>
        </div>

        {/* ── MAO Output Card ── */}
        <div 
          className="rounded-lg p-10 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left shadow-md transition-shadow hover:shadow-lg"
          style={{ 
            background: phaseColor, 
            color: '#FFFFFF', 
          }}
        >
          <div className="flex flex-col gap-1 mb-6 sm:mb-0">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.2em] opacity-90">
              Maximum Allowable Offer
            </h3>
            <p className="text-xs font-medium opacity-80 mt-1">
              Your ceiling acquisition price
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ArrowRight className="w-6 h-6 opacity-50 hidden sm:block" />
            <div className="text-5xl lg:text-7xl font-extrabold tabular-nums tracking-tighter" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              {formatCurrency(Math.max(0, maxAllowableOffer))}
            </div>
          </div>
        </div>

        {/* ── Counter Offer Impact (if present) ── */}
        {counterPriceCents !== undefined && counterPriceCents > 0 && (
          <div className="rounded-lg p-8 flex flex-col sm:flex-row items-center justify-between text-center sm:text-left shadow-md transition-shadow hover:shadow-lg" style={{ border: '1px solid var(--border-ui)', background: '#F8FAFC' }}>
            <div className="flex flex-col gap-1 mb-6 sm:mb-0">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: phaseColor }}>
                Counter Offer Impact
              </h3>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
                Projected Profit at {formatCurrency(counterPriceCents / 100)} Counter Price
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-extrabold tabular-nums tracking-tighter" style={{ color: (arv - rehab - (counterPriceCents / 100)) > 0 ? '#16A34A' : '#DC2626' }}>
                {formatCurrency(arv - rehab - (counterPriceCents / 100))}
              </div>
              <div className="text-sm font-bold ml-2 px-3 py-1 rounded-full" style={{ background: (arv - rehab - (counterPriceCents / 100)) > 0 ? '#DCFCE7' : '#FEE2E2', color: (arv - rehab - (counterPriceCents / 100)) > 0 ? '#15803D' : '#B91C1C' }}>
                {arv > 0 ? ((arv - rehab - (counterPriceCents / 100)) / arv * 100).toFixed(1) : 0}% Margin
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}
