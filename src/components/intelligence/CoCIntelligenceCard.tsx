'use client';

import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  ArrowRight,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   COC INTELLIGENCE CARD — Performance Gap Analysis
   Visualizes Cash-on-Cash Return with:
     1. Horizontal bar gauge with zone markers
     2. Formula breakdown (Annual CF ÷ Total Cash = CoC%)
     3. Performance gap analysis (Your CoC vs Target vs Market)
     4. Scenario sensitivity: what-if table
   Formula: CoC = (Annual Pre-Tax Cash Flow ÷ Total Cash Invested) × 100
   ═══════════════════════════════════════════════════════════════ */

interface CoCIntelligenceCardProps {
  annualCashFlow: number;
  totalCashInvested: number;
  targetCoC?: number;       // User's target (default 8%)
  marketAvgCoC?: number;    // Market benchmark (default 6.5%)
  className?: string;
}

/* ── Formatting ── */
const fmtUSD = (v: number): string =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtCompact = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1000) return `${v < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  return fmtUSD(v);
};

/* ── CoC Health Zones ── */
const COC_ZONES = [
  { min: 0, max: 3, label: 'Poor', color: '#F06543', bgClass: 'bg-[#F06543]/10 border-[#F06543]/20 text-[#F06543]' },
  { min: 3, max: 6, label: 'Below Avg', color: '#EAB308', bgClass: 'bg-amber-400/10 border-amber-400/20 text-amber-400' },
  { min: 6, max: 8, label: 'Acceptable', color: '#20B2AA', bgClass: 'bg-[#20B2AA]/10 border-[#20B2AA]/20 text-[#20B2AA]' },
  { min: 8, max: 12, label: 'Good', color: '#3B82F6', bgClass: 'bg-blue-400/10 border-blue-400/20 text-blue-400' },
  { min: 12, max: 100, label: 'Excellent', color: '#3f7d20', bgClass: 'bg-[#3f7d20]/10 border-[#3f7d20]/20 text-[#3f7d20]' },
] as const;

function getCoCZone(coc: number) {
  for (const zone of COC_ZONES) {
    if (coc >= zone.min && coc < zone.max) return zone;
  }
  if (coc >= 12) return COC_ZONES[4];
  return COC_ZONES[0];
}

/* ═══════════════════════════════════════════════════════════════
   HORIZONTAL BAR GAUGE
   Shows CoC on a 0–15% scale with color zones and markers
   ═══════════════════════════════════════════════════════════════ */

function HorizontalGauge({
  value,
  targetCoC,
  marketAvg,
}: {
  value: number;
  targetCoC: number;
  marketAvg: number;
}) {
  const maxScale = 15;
  const clampedValue = Math.min(Math.max(value, 0), maxScale);
  const valuePct = (clampedValue / maxScale) * 100;
  const targetPct = (Math.min(targetCoC, maxScale) / maxScale) * 100;
  const marketPct = (Math.min(marketAvg, maxScale) / maxScale) * 100;

  return (
    <div className="space-y-2">
      {/* Scale labels */}
      <div className="flex justify-between text-[9px] text-slate-600 tabular-nums font-mono px-0.5">
        <span>0%</span>
        <span>3%</span>
        <span>6%</span>
        <span>8%</span>
        <span>12%</span>
        <span>15%</span>
      </div>

      {/* Gauge bar */}
      <div className="relative h-5 rounded-full overflow-hidden bg-white/[0.04]">
        {/* Zone segments */}
        <div className="absolute inset-0 flex">
          <div className="h-full" style={{ width: '20%', backgroundColor: 'rgba(240,101,67,0.15)' }} />
          <div className="h-full" style={{ width: '20%', backgroundColor: 'rgba(234,179,8,0.12)' }} />
          <div className="h-full" style={{ width: '13.3%', backgroundColor: 'rgba(32,178,170,0.12)' }} />
          <div className="h-full" style={{ width: '26.7%', backgroundColor: 'rgba(59,130,246,0.12)' }} />
          <div className="h-full" style={{ width: '20%', backgroundColor: 'rgba(63,125,32,0.10)' }} />
        </div>

        {/* Fill bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${valuePct}%`,
            background: `linear-gradient(90deg, ${getCoCZone(value).color}40, ${getCoCZone(value).color}80)`,
          }}
        />

        {/* Value indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg transition-all duration-700"
          style={{ left: `${valuePct}%` }}
        />

        {/* Market avg marker */}
        <div
          className="absolute top-0 bottom-0 w-px border-l border-dashed border-amber-400/60 transition-all duration-500"
          style={{ left: `${marketPct}%` }}
        />

        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-px border-l border-dashed transition-all duration-500"
          style={{ left: `${targetPct}%`, borderColor: 'rgba(32,178,170,0.6)' }}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white" /> Your CoC
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 border-t border-dashed border-amber-400/60 inline-block" /> Market ({marketAvg}%)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 border-t border-dashed inline-block" style={{ borderColor: 'rgba(32,178,170,0.6)' }} /> Target ({targetCoC}%)
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function CoCIntelligenceCard({
  annualCashFlow,
  totalCashInvested,
  targetCoC = 8.0,
  marketAvgCoC = 6.5,
  className = '',
}: CoCIntelligenceCardProps) {
  const cocReturn = useMemo(() => {
    if (totalCashInvested === 0) return 0;
    return Math.round((annualCashFlow / totalCashInvested) * 100 * 100) / 100;
  }, [annualCashFlow, totalCashInvested]);

  const zone = getCoCZone(cocReturn);

  /* ── Performance Gap Analysis ── */
  const gap = useMemo(() => {
    const vsTarget = cocReturn - targetCoC;
    const vsMarket = cocReturn - marketAvgCoC;
    const cashFlowNeededForTarget = totalCashInvested * (targetCoC / 100);
    const cashFlowGap = cashFlowNeededForTarget - annualCashFlow;
    return { vsTarget, vsMarket, cashFlowNeededForTarget, cashFlowGap };
  }, [cocReturn, targetCoC, marketAvgCoC, totalCashInvested, annualCashFlow]);

  /* ── Sensitivity: What-if scenarios ── */
  const scenarios = useMemo(() => {
    const variations = [-20, -10, 0, 10, 20];
    return variations.map((pctChange) => {
      const adjustedCF = annualCashFlow * (1 + pctChange / 100);
      const adjustedCoC = totalCashInvested > 0
        ? Math.round((adjustedCF / totalCashInvested) * 100 * 100) / 100
        : 0;
      return {
        label: pctChange === 0 ? 'Current' : `${pctChange > 0 ? '+' : ''}${pctChange}%`,
        cashFlow: adjustedCF,
        coc: adjustedCoC,
        isCurrent: pctChange === 0,
      };
    });
  }, [annualCashFlow, totalCashInvested]);

  const isAboveTarget = gap.vsTarget >= 0;
  const isAboveMarket = gap.vsMarket >= 0;

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-5 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#20B2AA]/10 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-[#20B2AA]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Cash-on-Cash Return</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Performance Gap Analysis</p>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${zone.bgClass}`}>
          {zone.label}
        </span>
      </div>

      {/* ── Big Number ── */}
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold tabular-nums tracking-tighter" style={{ color: zone.color }}>
          {cocReturn.toFixed(2)}%
        </span>
        <div className={`flex items-center gap-1 text-sm font-bold ${isAboveTarget ? 'text-[#3f7d20]' : 'text-[#F06543]'}`}>
          {isAboveTarget ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {isAboveTarget ? '+' : ''}{gap.vsTarget.toFixed(2)}% vs target
        </div>
      </div>

      {/* ── Horizontal Gauge ── */}
      <HorizontalGauge value={cocReturn} targetCoC={targetCoC} marketAvg={marketAvgCoC} />

      {/* ── Formula Breakdown ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Annual Cash Flow</p>
          <p className="text-sm font-bold text-white tabular-nums">{fmtCompact(annualCashFlow)}</p>
        </div>
        <div className="text-slate-600 text-lg font-bold flex-shrink-0">÷</div>
        <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Cash Invested</p>
          <p className="text-sm font-bold text-white tabular-nums">{fmtCompact(totalCashInvested)}</p>
        </div>
        <div className="text-slate-600 text-lg font-bold flex-shrink-0">=</div>
        <div className="px-3 py-2 rounded-lg border text-center min-w-0 flex-1"
          style={{ background: `${zone.color}08`, borderColor: `${zone.color}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">CoC Return</p>
          <p className="text-sm font-bold tabular-nums" style={{ color: zone.color }}>{cocReturn.toFixed(2)}%</p>
        </div>
      </div>

      {/* ── Performance Gap Grid ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* vs Target */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">vs Target ({targetCoC}%)</p>
          <p className={`text-lg font-bold tabular-nums ${isAboveTarget ? 'text-[#3f7d20]' : 'text-[#F06543]'}`}>
            {isAboveTarget ? '+' : ''}{gap.vsTarget.toFixed(2)}%
          </p>
          <div className="mt-1">
            {isAboveTarget ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#3f7d20] mx-auto" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-[#F06543] mx-auto" />
            )}
          </div>
        </div>

        {/* vs Market */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">vs Market ({marketAvgCoC}%)</p>
          <p className={`text-lg font-bold tabular-nums ${isAboveMarket ? 'text-[#3f7d20]' : 'text-amber-400'}`}>
            {isAboveMarket ? '+' : ''}{gap.vsMarket.toFixed(2)}%
          </p>
          <div className="mt-1">
            {isAboveMarket ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#3f7d20] mx-auto" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mx-auto" />
            )}
          </div>
        </div>

        {/* Cash Flow Gap */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">CF Gap to Target</p>
          <p className={`text-lg font-bold tabular-nums ${gap.cashFlowGap <= 0 ? 'text-[#3f7d20]' : 'text-[#F06543]'}`}>
            {gap.cashFlowGap <= 0 ? '—' : `+${fmtCompact(gap.cashFlowGap)}`}
          </p>
          <p className="text-[9px] text-slate-600 mt-0.5">
            {gap.cashFlowGap <= 0 ? 'On target' : 'needed/yr'}
          </p>
        </div>
      </div>

      {/* ── Sensitivity Table ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Cash Flow Sensitivity
        </p>
        <div className="grid grid-cols-5 gap-1">
          {scenarios.map((sc) => (
            <div
              key={sc.label}
              className={`rounded-lg p-2 text-center transition-all ${
                sc.isCurrent
                  ? 'bg-[#20B2AA]/[0.06] border border-[#20B2AA]/20 ring-1 ring-[#20B2AA]/10'
                  : 'bg-white/[0.02] border border-white/[0.04]'
              }`}
            >
              <p className={`text-[9px] font-bold uppercase tracking-wider ${
                sc.isCurrent ? 'text-[#20B2AA]' : 'text-slate-500'
              }`}>
                {sc.label}
              </p>
              <p className={`text-xs font-bold tabular-nums mt-0.5 ${
                sc.coc >= targetCoC ? 'text-[#3f7d20]' : sc.coc >= marketAvgCoC ? 'text-slate-300' : 'text-[#F06543]'
              }`}>
                {sc.coc.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
