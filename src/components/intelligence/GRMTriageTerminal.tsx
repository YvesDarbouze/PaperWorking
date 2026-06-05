'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Zap, DollarSign, Home, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   GRM TRIAGE TERMINAL — A-Phase Quick Screen
   Two-input terminal for rapid deal screening via GRM.
   Formula: GRM = Property Price ÷ Gross Annual Rent
   Lower GRM = higher rent relative to price = better deal.
   ═══════════════════════════════════════════════════════════════ */

export interface GRMTriageValues {
  propertyPrice: number;
  grossMonthlyRent: number;
  grossAnnualRent: number;
  grm: number;
  signal: 'Pass' | 'Review' | 'Reject';
}

interface GRMTriageTerminalProps {
  defaultPropertyPrice?: number;
  defaultMonthlyRent?: number;
  marketGRM?: number;
  maxAcceptableGRM?: number;
  onValuesChange?: (values: GRMTriageValues) => void;
  className?: string;
}

/* ── GRM Signal Thresholds ── */
const SIGNAL_THRESHOLDS = {
  pass: 10,    // GRM < 10 = strong buy signal
  review: 13,  // 10-13 = needs further analysis
  // > 13 = reject / overpriced
} as const;

function getSignal(grm: number, maxGRM: number): 'Pass' | 'Review' | 'Reject' {
  if (grm <= 0) return 'Review';
  if (grm <= maxGRM * 0.75) return 'Pass';
  if (grm <= maxGRM) return 'Review';
  return 'Reject';
}

const SIGNAL_CONFIG = {
  Pass:   { color: '#14B8A6', icon: CheckCircle2, label: 'PASS — Strong Buy Signal',     bgClass: 'bg-teal-400/10 border-teal-400/20' },
  Review: { color: '#EAB308', icon: AlertTriangle, label: 'REVIEW — Needs Analysis',      bgClass: 'bg-amber-400/10 border-amber-400/20' },
  Reject: { color: '#F06543', icon: XCircle,       label: 'REJECT — Overpriced',          bgClass: 'bg-red-400/10 border-red-400/20' },
} as const;

/* ── Formatting ── */
const fmtUSD = (v: number): string =>
  `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtCompact = (v: number): string => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
  return fmtUSD(v);
};

/* ── Glass Input ── */
function TriageInput({
  label,
  sublabel,
  icon: Icon,
  value,
  onChange,
  step = 1000,
}: {
  label: string;
  sublabel: string;
  icon: React.ElementType;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="group">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </label>
      <p className="text-[9px] text-slate-600 mb-1.5">{sublabel}</p>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium pointer-events-none">$</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          step={step}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] text-slate-200 text-sm
                     font-mono tabular-nums py-2.5 pl-7 pr-3 focus:outline-none focus:border-teal-500/40
                     focus:ring-1 focus:ring-teal-500/20 transition-all placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function GRMTriageTerminal({
  defaultPropertyPrice = 279000,
  defaultMonthlyRent = 1950,
  marketGRM = 10.5,
  maxAcceptableGRM = 13,
  onValuesChange,
  className = '',
}: GRMTriageTerminalProps) {
  const [propertyPrice, setPropertyPrice] = useState(defaultPropertyPrice);
  const [monthlyRent, setMonthlyRent] = useState(defaultMonthlyRent);

  const computed = useMemo(() => {
    const grossAnnualRent = monthlyRent * 12;
    const grm = grossAnnualRent > 0
      ? Math.round((propertyPrice / grossAnnualRent) * 100) / 100
      : 0;
    const signal = getSignal(grm, maxAcceptableGRM);
    return { grossAnnualRent, grm, signal };
  }, [propertyPrice, monthlyRent, maxAcceptableGRM]);

  const signalConfig = SIGNAL_CONFIG[computed.signal];
  const SignalIcon = signalConfig.icon;

  // Notify parent
  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({
        propertyPrice,
        grossMonthlyRent: monthlyRent,
        grossAnnualRent: computed.grossAnnualRent,
        grm: computed.grm,
        signal: computed.signal,
      });
    }
  }, [propertyPrice, monthlyRent, computed, onValuesChange]);

  /* ── GRM position relative to market ── */
  const vsMarket = computed.grm - marketGRM;
  const isBelowMarket = vsMarket < 0;

  /* ── Quick comparisons ── */
  const comparisons = [
    { label: 'Break-even Monthly', value: propertyPrice > 0 ? fmtUSD(Math.round(propertyPrice / (marketGRM * 12))) : '—', sublabel: `at ${marketGRM}x market GRM` },
    { label: 'Fair Value at Rent', value: fmtCompact(computed.grossAnnualRent * marketGRM), sublabel: `${monthlyRent > 0 ? fmtUSD(monthlyRent) : '—'}/mo × ${marketGRM}x` },
  ];

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-5 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Quick Screen</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">A-Phase Triage Terminal</p>
          </div>
        </div>
      </div>

      {/* ── 2 Input Fields ── */}
      <div className="grid grid-cols-2 gap-4">
        <TriageInput
          label="Property Price"
          sublabel="Purchase price or ARV"
          icon={Home}
          value={propertyPrice}
          onChange={setPropertyPrice}
          step={5000}
        />
        <TriageInput
          label="Monthly Rent"
          sublabel="Gross monthly rent"
          icon={DollarSign}
          value={monthlyRent}
          onChange={setMonthlyRent}
          step={50}
        />
      </div>

      {/* ── Signal Output ── */}
      <div
        className={`rounded-xl border p-4 flex items-center justify-between transition-all duration-500 ${signalConfig.bgClass}`}
      >
        <div className="flex items-center gap-3">
          <SignalIcon className="w-6 h-6 flex-shrink-0" style={{ color: signalConfig.color }} />
          <div>
            <p className="text-xs font-bold" style={{ color: signalConfig.color }}>{signalConfig.label}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              GRM {computed.grm.toFixed(1)}x · {isBelowMarket ? 'below' : 'above'} market ({marketGRM}x)
            </p>
          </div>
        </div>
        <span className="text-3xl font-bold tabular-nums tracking-tighter" style={{ color: signalConfig.color }}>
          {computed.grm.toFixed(1)}x
        </span>
      </div>

      {/* ── vs Market Bar ── */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider">
          <span>vs Market ({marketGRM}x)</span>
          <span className={isBelowMarket ? 'text-teal-400' : 'text-red-400'}>
            {isBelowMarket ? '' : '+'}{vsMarket.toFixed(1)}x
          </span>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden bg-white/[0.04]">
          {/* Market position */}
          <div
            className="absolute top-0 bottom-0 w-px border-l border-dashed border-white/30"
            style={{ left: `${Math.min(marketGRM / 20 * 100, 100)}%` }}
          />
          {/* Current GRM fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(computed.grm / 20 * 100, 100)}%`,
              backgroundColor: `${signalConfig.color}60`,
            }}
          />
          {/* Needle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white rounded transition-all duration-700"
            style={{ left: `${Math.min(computed.grm / 20 * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-slate-600 tabular-nums font-mono">
          <span>0x</span><span>5x</span><span>10x</span><span>15x</span><span>20x</span>
        </div>
      </div>

      {/* ── Quick Comparisons ── */}
      <div className="grid grid-cols-2 gap-3">
        {comparisons.map((c) => (
          <div key={c.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">{c.label}</p>
            <p className="text-sm font-bold text-white tabular-nums">{c.value}</p>
            <p className="text-[9px] text-slate-600 mt-0.5">{c.sublabel}</p>
          </div>
        ))}
      </div>

      {/* ── Formula reference ── */}
      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Formula</p>
        <p className="text-[11px] text-slate-400 font-mono">
          GRM = {fmtCompact(propertyPrice)} ÷ {fmtCompact(computed.grossAnnualRent)}/yr = {computed.grm.toFixed(1)}x
        </p>
      </div>
    </div>
  );
}
