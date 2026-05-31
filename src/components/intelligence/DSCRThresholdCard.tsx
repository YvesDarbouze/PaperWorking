'use client';

import React, { useMemo } from 'react';
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, BarChart3, Target } from 'lucide-react';
import { computeDSCR } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   DSCR THRESHOLD INTELLIGENCE CARD
   Detailed threshold analysis showing:
     1. Stacked zone bar with position indicator
     2. Formula breakdown (NOI ÷ Debt Service = DSCR)
     3. Threshold distance analysis
     4. NOI required to reach each threshold
   Formula: DSCR = NOI ÷ Annual Debt Service
   ═══════════════════════════════════════════════════════════════ */

interface DSCRThresholdCardProps {
  noi: number;
  annualDebtService: number;
  lenderMinDSCR?: number;
  targetDSCR?: number;
  className?: string;
}

/* ── Formatting ── */
const fmtUSD = (v: number): string =>
  `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtCompact = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${v < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1000) return `${v < 0 ? '-' : ''}$${(abs / 1000).toFixed(1)}k`;
  return `${v < 0 ? '-' : ''}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

/* ── Threshold Zones ── */
const ZONES = [
  { min: 0, max: 0.8,  label: 'Critical',  color: '#DC2626', description: 'Default risk — immediate action required' },
  { min: 0.8, max: 1.0, label: 'At Risk',   color: '#EF4444', description: 'Cannot fully cover debt obligations' },
  { min: 1.0, max: 1.25, label: 'Marginal',  color: '#F59E0B', description: 'Meets bare minimum — no safety margin' },
  { min: 1.25, max: 1.5, label: 'Adequate',  color: '#14B8A6', description: 'Above lender minimum — acceptable' },
  { min: 1.5, max: 2.0, label: 'Strong',    color: '#3B82F6', description: 'Robust coverage — favorable terms' },
  { min: 2.0, max: 3.0, label: 'Excellent',  color: '#8B5CF6', description: 'Best-in-class debt coverage' },
] as const;

function getZone(dscr: number) {
  for (const zone of ZONES) {
    if (dscr >= zone.min && dscr < zone.max) return zone;
  }
  if (dscr >= 3.0) return ZONES[5];
  return ZONES[0];
}

/* ═══════════════════════════════════════════════════════════════
   STACKED ZONE BAR
   ═══════════════════════════════════════════════════════════════ */

function ZoneBar({ dscr, lenderMin, target }: { dscr: number; lenderMin: number; target: number }) {
  const MAX = 3.0;
  const valuePct = Math.min(dscr / MAX, 1) * 100;
  const lenderPct = (lenderMin / MAX) * 100;
  const targetPct = (target / MAX) * 100;
  const zone = getZone(dscr);

  const zoneWidths = ZONES.map((z) => ((z.max - z.min) / MAX) * 100);

  return (
    <div className="space-y-2">
      {/* Scale */}
      <div className="flex justify-between text-[8px] text-slate-600 tabular-nums font-mono px-0.5">
        {[0, 0.8, 1.0, 1.25, 1.5, 2.0, 3.0].map((v) => (
          <span key={v}>{v}x</span>
        ))}
      </div>

      {/* Stacked bar */}
      <div className="relative h-5 rounded-full overflow-hidden bg-white/[0.03]">
        {/* Zone segments */}
        <div className="absolute inset-0 flex">
          {ZONES.map((z, i) => (
            <div key={z.label} className="h-full" style={{ width: `${zoneWidths[i]}%`, backgroundColor: `${z.color}15` }} />
          ))}
        </div>

        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${valuePct}%`, background: `linear-gradient(90deg, ${zone.color}30, ${zone.color}60)` }}
        />

        {/* Lender min marker */}
        <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-amber-400/70 z-10" style={{ left: `${lenderPct}%` }} />

        {/* Target marker */}
        <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-teal-400/70 z-10" style={{ left: `${targetPct}%` }} />

        {/* Value needle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-20 transition-all duration-700"
          style={{ left: `${valuePct}%` }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-500 font-medium">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white" /> Current</span>
        <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-amber-400/60 inline-block" /> Lender Min ({lenderMin}x)</span>
        <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-teal-400/60 inline-block" /> Target ({target}x)</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function DSCRThresholdCard({
  noi,
  annualDebtService,
  lenderMinDSCR = 1.25,
  targetDSCR = 1.5,
  className = '',
}: DSCRThresholdCardProps) {
  const dscr = useMemo(() => {
    const raw = computeDSCR(noi, annualDebtService);
    return raw === Infinity ? 999 : raw;
  }, [noi, annualDebtService]);

  const zone = getZone(dscr);

  /* ── Threshold distances ── */
  const thresholds = useMemo(() => {
    const ds = annualDebtService;
    return [
      {
        label: 'Break-even (1.0x)',
        dscrNeeded: 1.0,
        noiRequired: ds * 1.0,
        noiGap: ds * 1.0 - noi,
        met: dscr >= 1.0,
        color: '#EF4444',
      },
      {
        label: `Lender Min (${lenderMinDSCR}x)`,
        dscrNeeded: lenderMinDSCR,
        noiRequired: ds * lenderMinDSCR,
        noiGap: ds * lenderMinDSCR - noi,
        met: dscr >= lenderMinDSCR,
        color: '#F59E0B',
      },
      {
        label: `Target (${targetDSCR}x)`,
        dscrNeeded: targetDSCR,
        noiRequired: ds * targetDSCR,
        noiGap: ds * targetDSCR - noi,
        met: dscr >= targetDSCR,
        color: '#14B8A6',
      },
      {
        label: 'Strong (2.0x)',
        dscrNeeded: 2.0,
        noiRequired: ds * 2.0,
        noiGap: ds * 2.0 - noi,
        met: dscr >= 2.0,
        color: '#3B82F6',
      },
    ];
  }, [noi, annualDebtService, dscr, lenderMinDSCR, targetDSCR]);

  /* ── Max DS to maintain target ── */
  const maxDebtService = useMemo(() => {
    return targetDSCR > 0 ? noi / targetDSCR : 0;
  }, [noi, targetDSCR]);

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-5 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${zone.color}15` }}>
            <Shield className="w-4 h-4" style={{ color: zone.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">DSCR Threshold Analysis</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Intelligence Card</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider"
          style={{ color: zone.color, backgroundColor: `${zone.color}15`, borderColor: `${zone.color}30` }}>
          {zone.label}
        </span>
      </div>

      {/* ── Big Number ── */}
      <div className="flex items-baseline gap-3">
        <span className="text-5xl font-bold tabular-nums tracking-tighter" style={{ color: zone.color }}>
          {dscr >= 100 ? '∞' : dscr.toFixed(2)}x
        </span>
        <div className="flex items-center gap-1 text-sm font-bold" style={{ color: dscr >= lenderMinDSCR ? '#14B8A6' : '#EF4444' }}>
          {dscr >= lenderMinDSCR ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {dscr >= lenderMinDSCR ? 'Above minimum' : 'Below minimum'}
        </div>
      </div>

      {/* ── Zone Bar ── */}
      <ZoneBar dscr={dscr} lenderMin={lenderMinDSCR} target={targetDSCR} />

      {/* ── Formula Breakdown ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">NOI</p>
          <p className="text-sm font-bold text-white tabular-nums">{fmtCompact(noi)}</p>
        </div>
        <div className="text-slate-600 text-lg font-bold flex-shrink-0">÷</div>
        <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Debt Service</p>
          <p className="text-sm font-bold text-white tabular-nums">{fmtCompact(annualDebtService)}/yr</p>
        </div>
        <div className="text-slate-600 text-lg font-bold flex-shrink-0">=</div>
        <div className="px-3 py-2 rounded-lg border text-center min-w-0 flex-1"
          style={{ background: `${zone.color}08`, borderColor: `${zone.color}30` }}>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">DSCR</p>
          <p className="text-sm font-bold tabular-nums" style={{ color: zone.color }}>{dscr >= 100 ? '∞' : dscr.toFixed(2)}x</p>
        </div>
      </div>

      {/* ── Threshold Distance Table ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
          <Target className="w-3 h-3" />
          Threshold Distance
        </p>
        <div className="space-y-1.5">
          {thresholds.map((t) => (
            <div key={t.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center gap-2">
                {t.met ? (
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: t.color }} />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                )}
                <span className="text-xs text-slate-400">{t.label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs tabular-nums">
                <span className="text-slate-500">NOI needed: {fmtCompact(t.noiRequired)}</span>
                {t.met ? (
                  <span className="text-teal-400 font-bold">✓ Met</span>
                ) : (
                  <span className="text-red-400 font-bold">+{fmtCompact(t.noiGap)} gap</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Max Affordable Debt ── */}
      <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Max Debt Service at {targetDSCR}x Target</p>
          <p className="text-[10px] text-slate-600">Maximum affordable annual debt to maintain target DSCR</p>
        </div>
        <p className="text-lg font-bold text-white tabular-nums">{fmtCompact(maxDebtService)}/yr</p>
      </div>
    </div>
  );
}
