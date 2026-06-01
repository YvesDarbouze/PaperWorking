'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Shield, DollarSign, Percent, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Building2 } from 'lucide-react';
import { computeDSCR } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   DSCR RISK STRIP TERMINAL — Financing Terminal
   Collects NOI + Debt Service inputs and displays a live
   risk-strip showing DSCR health with traffic-light zones.
   Formula: DSCR = NOI ÷ Annual Debt Service
   Thresholds: < 1.0 (At Risk), 1.0–1.25 (Marginal), ≥ 1.25 (Healthy)
   ═══════════════════════════════════════════════════════════════ */

export interface DSCRRiskStripValues {
  annualNOI: number;
  monthlyDebtService: number;
  annualDebtService: number;
  dscr: number;
  riskLevel: 'at-risk' | 'marginal' | 'healthy';
}

interface DSCRRiskStripTerminalProps {
  defaultAnnualNOI?: number;
  defaultMonthlyDebtService?: number;
  lenderMinDSCR?: number;
  onValuesChange?: (values: DSCRRiskStripValues) => void;
  className?: string;
}

/* ── Risk Levels ── */
const RISK_CONFIG = {
  'at-risk': {
    label: 'AT RISK',
    sublabel: 'Cannot cover debt obligations',
    color: '#EF4444',
    icon: XCircle,
    bgClass: 'bg-red-400/10 border-red-400/20',
    stripGradient: 'linear-gradient(90deg, #EF4444 0%, #EF444440 100%)',
  },
  'marginal': {
    label: 'MARGINAL',
    sublabel: 'Meets lender minimum — thin margin',
    color: '#F59E0B',
    icon: AlertTriangle,
    bgClass: 'bg-amber-400/10 border-amber-400/20',
    stripGradient: 'linear-gradient(90deg, #F59E0B 0%, #F59E0B40 100%)',
  },
  'healthy': {
    label: 'HEALTHY',
    sublabel: 'Strong debt coverage — above optimal',
    color: '#14B8A6',
    icon: CheckCircle2,
    bgClass: 'bg-teal-400/10 border-teal-400/20',
    stripGradient: 'linear-gradient(90deg, #14B8A6 0%, #14B8A640 100%)',
  },
} as const;

function getRiskLevel(dscr: number): 'at-risk' | 'marginal' | 'healthy' {
  if (dscr < 1.0) return 'at-risk';
  if (dscr < 1.25) return 'marginal';
  return 'healthy';
}

/* ── Formatting ── */
const fmtUSD = (v: number): string =>
  `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/* ── Glass Input ── */
function TerminalInput({
  label,
  sublabel,
  icon: Icon,
  value,
  onChange,
  step = 100,
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
   RISK STRIP — Animated horizontal strip with zone markers
   ═══════════════════════════════════════════════════════════════ */

function RiskStrip({ dscr, lenderMin }: { dscr: number; lenderMin: number }) {
  const MAX = 2.5;
  const fillPct = Math.min(Math.max(dscr / MAX, 0), 1) * 100;
  const riskPct = (1.0 / MAX) * 100;
  const minPct = (lenderMin / MAX) * 100;
  const riskLevel = getRiskLevel(dscr);
  const config = RISK_CONFIG[riskLevel];

  return (
    <div className="space-y-2">
      {/* Strip */}
      <div className="relative h-6 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {/* Zone backgrounds */}
        <div className="absolute inset-0 flex">
          <div className="h-full" style={{ width: `${riskPct}%`, backgroundColor: 'rgba(239,68,68,0.08)' }} />
          <div className="h-full" style={{ width: `${minPct - riskPct}%`, backgroundColor: 'rgba(245,158,11,0.08)' }} />
          <div className="h-full flex-1" style={{ backgroundColor: 'rgba(20,184,166,0.06)' }} />
        </div>

        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${fillPct}%`, background: config.stripGradient }}
        />

        {/* Risk line (1.0x) */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/80 z-10" style={{ left: `${riskPct}%` }} />

        {/* Lender min line */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80 z-10" style={{ left: `${minPct}%` }} />

        {/* Current position */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg z-20 transition-all duration-700"
          style={{ left: `calc(${fillPct}% - 10px)`, backgroundColor: config.color }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider px-0.5">
        <span className="text-red-400">0.0x</span>
        <span className="text-red-400">1.0x Risk</span>
        <span className="text-amber-400">{lenderMin}x Min</span>
        <span className="text-teal-400">2.5x+</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function DSCRRiskStripTerminal({
  defaultAnnualNOI = 12486,
  defaultMonthlyDebtService = 1410.85,
  lenderMinDSCR = 1.25,
  onValuesChange,
  className = '',
}: DSCRRiskStripTerminalProps) {
  const [annualNOI, setAnnualNOI] = useState(defaultAnnualNOI);
  const [monthlyDS, setMonthlyDS] = useState(defaultMonthlyDebtService);

  const computed = useMemo(() => {
    const annualDebtService = monthlyDS * 12;
    const dscr = computeDSCR(annualNOI, annualDebtService);
    const riskLevel = getRiskLevel(dscr === Infinity ? 999 : dscr);
    return { annualDebtService, dscr: dscr === Infinity ? 999 : dscr, riskLevel };
  }, [annualNOI, monthlyDS]);

  const config = RISK_CONFIG[computed.riskLevel];
  const RiskIcon = config.icon;

  useEffect(() => {
    if (onValuesChange) {
      onValuesChange({
        annualNOI,
        monthlyDebtService: monthlyDS,
        annualDebtService: computed.annualDebtService,
        dscr: computed.dscr,
        riskLevel: computed.riskLevel,
      });
    }
  }, [annualNOI, monthlyDS, computed, onValuesChange]);

  /* ── Stress scenarios ── */
  const stressTests = useMemo(() => {
    const ds = monthlyDS * 12;
    return [
      { label: '25% NOI Drop', noi: annualNOI * 0.75, ds, dscr: ds > 0 ? (annualNOI * 0.75) / ds : 0 },
      { label: 'Rate +2%', noi: annualNOI, ds: ds * 1.15, dscr: ds * 1.15 > 0 ? annualNOI / (ds * 1.15) : 0 },
      { label: '50% Vacancy', noi: annualNOI * 0.5, ds, dscr: ds > 0 ? (annualNOI * 0.5) / ds : 0 },
    ];
  }, [annualNOI, monthlyDS]);

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-5 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-400/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Financing Terminal</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">DSCR Risk Strip</p>
          </div>
        </div>
      </div>

      {/* ── 2 Input Fields ── */}
      <div className="grid grid-cols-2 gap-4">
        <TerminalInput
          label="Annual NOI"
          sublabel="Net Operating Income"
          icon={Building2}
          value={annualNOI}
          onChange={setAnnualNOI}
          step={500}
        />
        <TerminalInput
          label="Monthly Debt Service"
          sublabel="Mortgage payment (P&I)"
          icon={DollarSign}
          value={monthlyDS}
          onChange={setMonthlyDS}
          step={50}
        />
      </div>

      {/* ── Risk Strip ── */}
      <RiskStrip dscr={computed.dscr} lenderMin={lenderMinDSCR} />

      {/* ── Signal Output ── */}
      <div className={`rounded-xl border p-4 flex items-center justify-between transition-all duration-500 ${config.bgClass}`}>
        <div className="flex items-center gap-3">
          <RiskIcon className="w-6 h-6 flex-shrink-0" style={{ color: config.color }} />
          <div>
            <p className="text-xs font-bold" style={{ color: config.color }}>{config.label}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{config.sublabel}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold tabular-nums tracking-tighter" style={{ color: config.color }}>
            {computed.dscr >= 100 ? '∞' : computed.dscr.toFixed(2)}x
          </span>
          <p className="text-[9px] text-slate-600 mt-0.5">
            {fmtUSD(annualNOI)} ÷ {fmtUSD(computed.annualDebtService)}/yr
          </p>
        </div>
      </div>

      {/* ── Stress Test Cards ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Stress Scenarios
        </p>
        <div className="grid grid-cols-3 gap-2">
          {stressTests.map((st) => {
            const stRisk = getRiskLevel(st.dscr);
            const stColor = RISK_CONFIG[stRisk].color;
            return (
              <div key={st.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1">{st.label}</p>
                <p className="text-sm font-bold tabular-nums" style={{ color: stColor }}>
                  {st.dscr.toFixed(2)}x
                </p>
                <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5" style={{ color: stColor }}>
                  {RISK_CONFIG[stRisk].label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Formula ── */}
      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Formula</p>
        <p className="text-[11px] text-slate-400 font-mono">
          DSCR = {fmtUSD(annualNOI)} ÷ {fmtUSD(computed.annualDebtService)} = {computed.dscr >= 100 ? '∞' : computed.dscr.toFixed(2)}x
        </p>
      </div>
    </div>
  );
}
