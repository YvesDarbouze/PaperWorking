'use client';

import React, { useMemo } from 'react';
import { BarChart3, ArrowDown, ArrowUp, Trophy, AlertTriangle, ChevronRight, Minus } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   GRM COMPARISON CARD — Multi-Property Deal Compare
   Side-by-side comparison of GRM across portfolio deals.
   Formula: GRM = Property Price ÷ Gross Annual Rent
   Lower GRM = better rent-to-price ratio.
   ═══════════════════════════════════════════════════════════════ */

interface DealEntry {
  id: string;
  address: string;
  propertyPrice: number;
  grossAnnualRent: number;
  grm?: number; // if pre-computed
}

interface GRMComparisonCardProps {
  deals: DealEntry[];
  marketGRM?: number;
  className?: string;
}

/* ── Formatting ── */
const fmtCompact = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

/* ── GRM color by value ── */
function grmColor(grm: number, marketGRM: number): string {
  if (grm <= marketGRM * 0.8) return '#14B8A6'; // strong buy — well below market
  if (grm <= marketGRM) return '#3B82F6';        // good — at or below market
  if (grm <= marketGRM * 1.2) return '#EAB308';  // caution — slightly above market
  return '#F06543';                               // overpriced
}

function grmSignal(grm: number, marketGRM: number): { label: string; className: string } {
  if (grm <= marketGRM * 0.8) return { label: 'Strong Buy', className: 'bg-[#6E7480]/10 border-[#6E7480]/20 text-[#6E7480]' };
  if (grm <= marketGRM) return { label: 'Buy', className: 'bg-blue-400/10 border-blue-400/20 text-blue-400' };
  if (grm <= marketGRM * 1.2) return { label: 'Hold', className: 'bg-amber-400/10 border-amber-400/20 text-amber-400' };
  return { label: 'Avoid', className: 'bg-red-400/10 border-red-400/20 text-red-400' };
}

/* ═══════════════════════════════════════════════════════════════
   HORIZONTAL GRM BAR — One per deal
   ═══════════════════════════════════════════════════════════════ */

function GRMBar({ grm, maxGRM, marketGRM }: { grm: number; maxGRM: number; marketGRM: number }) {
  const pct = Math.min((grm / maxGRM) * 100, 100);
  const marketPct = Math.min((marketGRM / maxGRM) * 100, 100);
  const color = grmColor(grm, marketGRM);

  return (
    <div className="relative h-2.5 rounded-full overflow-hidden bg-white/[0.04]">
      {/* Market reference line */}
      <div
        className="absolute top-0 bottom-0 w-px border-l border-dashed border-white/20 z-10"
        style={{ left: `${marketPct}%` }}
      />
      {/* Fill */}
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, backgroundColor: `${color}60` }}
      />
      {/* Needle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 rounded transition-all duration-700"
        style={{ left: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function GRMComparisonCard({
  deals,
  marketGRM = 10.5,
  className = '',
}: GRMComparisonCardProps) {
  /* ── Compute GRMs ── */
  const rankedDeals = useMemo(() => {
    const computed = deals.map((d) => {
      const grm = d.grm ?? (d.grossAnnualRent > 0 ? Math.round((d.propertyPrice / d.grossAnnualRent) * 100) / 100 : 0);
      const vsMarket = grm - marketGRM;
      return { ...d, grm, vsMarket };
    });
    return computed.sort((a, b) => a.grm - b.grm); // best first
  }, [deals, marketGRM]);

  const maxGRM = useMemo(() => {
    const max = Math.max(...rankedDeals.map((d) => d.grm), marketGRM);
    return Math.ceil(max / 5) * 5 || 20; // round up to nearest 5
  }, [rankedDeals, marketGRM]);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    if (rankedDeals.length === 0) return { avgGRM: 0, bestDeal: null, worstDeal: null };
    const sum = rankedDeals.reduce((s, d) => s + d.grm, 0);
    return {
      avgGRM: sum / rankedDeals.length,
      bestDeal: rankedDeals[0],
      worstDeal: rankedDeals[rankedDeals.length - 1],
    };
  }, [rankedDeals]);

  if (deals.length === 0) {
    return (
      <div className={`rounded-xl border border-white/10 p-6 ${className}`} style={{ background: 'rgba(24,33,39,0.7)' }}>
        <p className="text-sm text-[#6B6870] text-center py-8">Add deals to compare GRM across properties.</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-5 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Deal Comparison</h3>
            <p className="text-[10px] text-[#6B6870] uppercase tracking-widest font-bold">Multi-Property GRM</p>
          </div>
        </div>
        <span className="text-[10px] text-[#6B6870] font-mono">
          {rankedDeals.length} deals · Mkt {marketGRM}x
        </span>
      </div>

      {/* ── Summary Row ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6870] mb-1">Avg GRM</p>
          <p className="text-lg font-bold text-white tabular-nums">{stats.avgGRM.toFixed(1)}x</p>
        </div>
        <div className="rounded-lg bg-[#6E7480]/[0.04] border border-[#6E7480]/10 p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6870] mb-1 flex items-center justify-center gap-1">
            <Trophy className="w-3 h-3 text-[#6E7480]" /> Best
          </p>
          <p className="text-lg font-bold text-[#6E7480] tabular-nums">{stats.bestDeal?.grm.toFixed(1) ?? '—'}x</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#6B6870] mb-1">Market</p>
          <p className="text-lg font-bold text-[#C0BEC2] tabular-nums">{marketGRM}x</p>
        </div>
      </div>

      {/* ── Deal Bars ── */}
      <div className="space-y-3">
        {rankedDeals.map((deal, idx) => {
          const signal = grmSignal(deal.grm, marketGRM);
          const isBest = idx === 0;
          return (
            <div key={deal.id} className="space-y-1.5">
              {/* Row header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {isBest && <Trophy className="w-3 h-3 text-[#6E7480] flex-shrink-0" />}
                  <span className="text-xs text-[#C0BEC2] font-medium truncate">{deal.address}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-bold tabular-nums" style={{ color: grmColor(deal.grm, marketGRM) }}>
                    {deal.grm.toFixed(1)}x
                  </span>
                  <span className={`px-1.5 py-0.5 rounded border text-[8px] font-bold uppercase tracking-wider ${signal.className}`}>
                    {signal.label}
                  </span>
                </div>
              </div>

              {/* Bar */}
              <GRMBar grm={deal.grm} maxGRM={maxGRM} marketGRM={marketGRM} />

              {/* Details */}
              <div className="flex items-center gap-3 text-[9px] text-slate-600">
                <span>{fmtCompact(deal.propertyPrice)}</span>
                <span className="text-slate-700">÷</span>
                <span>{fmtCompact(deal.grossAnnualRent)}/yr</span>
                <span className="text-slate-700">·</span>
                <span className={deal.vsMarket < 0 ? 'text-[#6E7480]/70' : 'text-red-400/70'}>
                  {deal.vsMarket < 0 ? '' : '+'}{deal.vsMarket.toFixed(1)}x vs market
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Scale footer ── */}
      <div className="flex justify-between text-[8px] text-slate-600 tabular-nums font-mono px-0.5 pt-1 border-t border-white/[0.04]">
        <span>0x</span>
        <span>Lower = Better</span>
        <span>{maxGRM}x</span>
      </div>
    </div>
  );
}
