'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Building2, Calendar,
  DollarSign, Target, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { computeAnnualizedAppreciationRate } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   APPRECIATION COLLECTION TERMINAL
   Collects acquisition price, current estimated value, and hold
   period to compute annualized appreciation rate (CAGR).

   Formula: CAGR = ((EndValue / Basis) ^ (1 / Years)) – 1
   Seed: $279,000 → $295,000 over 2 years = ~2.8% annualized
   ═══════════════════════════════════════════════════════════════ */

export interface AppreciationValues {
  purchasePrice: number;
  acquisitionCosts: number;
  totalBasis: number;
  currentEstimate: number;
  holdYears: number;
  annualizedRate: number;
  totalGain: number;
  totalGainPct: number;
  zone: 'strong' | 'moderate' | 'flat';
}

interface AppreciationCollectionTerminalProps {
  defaults?: Partial<{
    purchasePrice: number;
    acquisitionCosts: number;
    currentEstimate: number;
    holdYears: number;
  }>;
  onValuesChange?: (values: AppreciationValues) => void;
  className?: string;
}

/* ── Zone config ── */
const ZONE_CFG = {
  strong:   { label: 'Strong Growth',   color: '#20B2AA', range: '>5%',   icon: TrendingUp },
  moderate: { label: 'Moderate',        color: '#fbbf24', range: '2–5%',  icon: Target },
  flat:     { label: 'Flat / Decline',  color: '#F06543', range: '<2%',   icon: TrendingDown },
} as const;

function getZone(rate: number): 'strong' | 'moderate' | 'flat' {
  if (rate >= 5) return 'strong';
  if (rate >= 2) return 'moderate';
  return 'flat';
}

/* ═══════════════════════════════════════════════════════════════
   MINI CAGR TRAJECTORY CHART (SVG)
   ═══════════════════════════════════════════════════════════════ */

function TrajectoryMini({ basis, current, years, color }: {
  basis: number; current: number; years: number; color: string;
}) {
  if (basis <= 0 || current <= 0 || years <= 0) return null;
  const pts = 20;
  const rate = Math.pow(current / basis, 1 / years) - 1;
  const points: string[] = [];
  for (let i = 0; i <= pts; i++) {
    const t = i / pts;
    const y = basis * Math.pow(1 + rate, t * years);
    const x = (i / pts) * 100;
    const yNorm = ((y - basis) / (current - basis || 1)) * 100;
    points.push(`${x},${100 - Math.min(Math.max(yNorm, 0), 100)}`);
  }
  const pathD = `M${points.join(' L')}`;
  const areaD = `${pathD} L100,100 L0,100 Z`;

  return (
    <svg viewBox="0 0 100 100" className="w-full h-20" preserveAspectRatio="none">
      <path d={areaD} fill={`${color}15`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function AppreciationCollectionTerminal({
  defaults = {},
  onValuesChange,
  className = '',
}: AppreciationCollectionTerminalProps) {
  const [purchasePrice, setPurchasePrice] = useState(defaults.purchasePrice ?? 279000);
  const [acquisitionCosts, setAcquisitionCosts] = useState(defaults.acquisitionCosts ?? 0);
  const [currentEstimate, setCurrentEstimate] = useState(defaults.currentEstimate ?? 295000);
  const [holdYears, setHoldYears] = useState(defaults.holdYears ?? 2);

  /* ── Computations ── */
  const computed = useMemo((): AppreciationValues => {
    const totalBasis = purchasePrice + acquisitionCosts;
    const annualizedRate = computeAnnualizedAppreciationRate(
      purchasePrice, acquisitionCosts, currentEstimate, holdYears
    );
    const totalGain = currentEstimate - totalBasis;
    const totalGainPct = totalBasis > 0 ? (totalGain / totalBasis) * 100 : 0;
    const zone = getZone(annualizedRate);

    return {
      purchasePrice,
      acquisitionCosts,
      totalBasis,
      currentEstimate,
      holdYears,
      annualizedRate,
      totalGain,
      totalGainPct,
      zone,
    };
  }, [purchasePrice, acquisitionCosts, currentEstimate, holdYears]);

  const stableOnChange = useCallback((v: AppreciationValues) => {
    onValuesChange?.(v);
  }, [onValuesChange]);

  useEffect(() => {
    stableOnChange(computed);
  }, [computed, stableOnChange]);

  const zoneCfg = ZONE_CFG[computed.zone];
  const ZoneIcon = zoneCfg.icon;
  const gainIsPositive = computed.totalGain >= 0;

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-4 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Appreciation</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Valuation Collection
            </p>
          </div>
        </div>
        <span
          className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: zoneCfg.color,
            borderColor: `${zoneCfg.color}40`,
            background: `${zoneCfg.color}10`,
          }}
        >
          <ZoneIcon className="w-3 h-3 inline mr-0.5" />
          {zoneCfg.label}
        </span>
      </div>

      {/* ── Result hero ── */}
      <div
        className="rounded-xl border p-4 transition-all duration-500"
        style={{ borderColor: `${zoneCfg.color}30`, background: `${zoneCfg.color}08` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-bold" style={{ color: zoneCfg.color }}>
              Annualized CAGR
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {computed.holdYears.toFixed(1)} year hold period
            </p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold tabular-nums tracking-tighter" style={{ color: zoneCfg.color }}>
              {computed.annualizedRate >= 0 ? '+' : ''}{computed.annualizedRate.toFixed(1)}
            </span>
            <span className="text-lg font-bold ml-0.5" style={{ color: zoneCfg.color }}>%</span>
            <p className="text-[9px] text-slate-600 mt-0.5">per year</p>
          </div>
        </div>

        {/* Trajectory mini chart */}
        <TrajectoryMini
          basis={computed.totalBasis}
          current={computed.currentEstimate}
          years={computed.holdYears}
          color={zoneCfg.color}
        />

        {/* Gain summary */}
        <div className="flex justify-between mt-2 text-[10px]">
          <span className="text-slate-500">
            Total Gain: <span className="font-bold" style={{ color: gainIsPositive ? '#20B2AA' : '#F06543' }}>
              {gainIsPositive ? '+' : ''}${Math.abs(computed.totalGain).toLocaleString()}
            </span>
          </span>
          <span className="text-slate-500">
            Total Return: <span className="font-bold" style={{ color: gainIsPositive ? '#20B2AA' : '#F06543' }}>
              {gainIsPositive ? '+' : ''}{computed.totalGainPct.toFixed(1)}%
            </span>
          </span>
        </div>
      </div>

      {/* ── Input fields ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Purchase Price */}
        <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1 mb-1">
            <Building2 className="w-3 h-3" /> Acquisition Price
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-600">$</span>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(Math.max(0, Number(e.target.value) || 0))}
              min={0}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-sm text-white
                         font-mono tabular-nums text-right focus:outline-none focus:border-teal-500/30 transition-all"
            />
          </div>
        </div>

        {/* Acquisition Costs */}
        <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1 mb-1">
            <DollarSign className="w-3 h-3" /> Closing / Acq. Costs
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-600">$</span>
            <input
              type="number"
              value={acquisitionCosts}
              onChange={(e) => setAcquisitionCosts(Math.max(0, Number(e.target.value) || 0))}
              min={0}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-sm text-white
                         font-mono tabular-nums text-right focus:outline-none focus:border-teal-500/30 transition-all"
            />
          </div>
          <p className="text-[9px] text-slate-600 mt-1">
            Total Basis: ${computed.totalBasis.toLocaleString()}
          </p>
        </div>

        {/* Current Estimated Value */}
        <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1 mb-1">
            <Target className="w-3 h-3" /> Current Estimate
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-600">$</span>
            <input
              type="number"
              value={currentEstimate}
              onChange={(e) => setCurrentEstimate(Math.max(0, Number(e.target.value) || 0))}
              min={0}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-sm text-white
                         font-mono tabular-nums text-right focus:outline-none focus:border-teal-500/30 transition-all"
            />
          </div>
        </div>

        {/* Hold Period */}
        <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3" /> Hold Period (Years)
          </label>
          <input
            type="number"
            value={holdYears}
            onChange={(e) => setHoldYears(Math.max(0.1, Number(e.target.value) || 0.1))}
            min={0.1}
            step={0.5}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-sm text-white
                       font-mono tabular-nums text-right focus:outline-none focus:border-teal-500/30 transition-all"
          />
        </div>
      </div>

      {/* ── Formula ── */}
      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Formula (CAGR)</p>
        <p className="text-[11px] text-slate-400 font-mono">
          ({currentEstimate.toLocaleString()} / {computed.totalBasis.toLocaleString()})^(1/{holdYears}) − 1 = {computed.annualizedRate >= 0 ? '+' : ''}{computed.annualizedRate.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}
