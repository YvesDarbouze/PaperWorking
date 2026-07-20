'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Download } from 'lucide-react';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   Portfolio Comparison Matrix — Stitch screen b8ceb1c395c2458a979cb8feab4357e1
   Side-by-side property comparison across all key REI metrics
   ═══════════════════════════════════════════════════════════════ */

type SortKey = 'irr' | 'capRate' | 'coc' | 'dscr' | 'ltv' | 'noi' | 'arv' | 'occupancy';

interface PropertyMetrics {
  id: string;
  name: string;
  address: string;
  phase: string;
  arv: number;
  purchasePrice: number;
  rehabCost: number;
  noi: number;
  capRate: number;
  coc: number;
  ltv: number;
  dscr: number;
  irr: number;
  occupancy: number;
  grossRent: number;
}


const METRIC_COLS: { key: SortKey; label: string; fmt: (v: number) => string; good: 'high' | 'low' }[] = [
  { key: 'arv',       label: 'ARV',       fmt: (v) => `$${(v / 1000).toFixed(0)}k`, good: 'high' },
  { key: 'noi',       label: 'NOI/yr',    fmt: (v) => `$${(v / 1000).toFixed(0)}k`, good: 'high' },
  { key: 'capRate',   label: 'Cap Rate',  fmt: (v) => `${v.toFixed(2)}%`,           good: 'high' },
  { key: 'coc',       label: 'CoC',       fmt: (v) => `${v.toFixed(1)}%`,           good: 'high' },
  { key: 'ltv',       label: 'LTV',       fmt: (v) => `${v.toFixed(0)}%`,           good: 'low'  },
  { key: 'dscr',      label: 'DSCR',      fmt: (v) => `${v.toFixed(2)}x`,           good: 'high' },
  { key: 'irr',       label: 'IRR',       fmt: (v) => `${v.toFixed(1)}%`,           good: 'high' },
  { key: 'occupancy', label: 'Occupancy', fmt: (v) => `${v.toFixed(0)}%`,           good: 'high' },
];

const PHASE_COLORS: Record<string, string> = {
  Acquisition: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  Fund:        'text-purple-400 bg-purple-500/10 border-purple-500/20',
  Hold:        'text-[#6E7480] bg-[#454955]/10 border-[#454955]/20',
  Exit:        'text-amber-400 bg-amber-500/10 border-amber-500/20',
};

function metricScore(col: typeof METRIC_COLS[number], values: number[], v: number): 'best' | 'worst' | 'mid' {
  const sorted = [...values].sort((a, b) => col.good === 'high' ? b - a : a - b);
  if (v === sorted[0]) return 'best';
  if (v === sorted[sorted.length - 1]) return 'worst';
  return 'mid';
}

export default function PortfolioComparisonPage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const [sortKey, setSortKey] = useState<SortKey>('irr');

  const properties: PropertyMetrics[] = useMemo(() => {
    if (projects.length === 0) return [];
    return projects.map((p) => {
      const f = p.financials ?? {};
      const derived   = deriveAllMetrics(f, undefined, p.dispositionType, p.currentPhase);
      const arv       = f.estimatedARV ?? f.purchasePrice ?? 0;
      const annualRent = derived.noiComponents.grossRentalIncome;

      const phase = p.status === 'acquisition' ? 'Acquisition'
                  : p.status === 'fund'        ? 'Fund'
                  : p.status === 'hold'        ? 'Hold'
                  : p.status === 'exit'        ? 'Exit'
                  : 'Hold';

      return {
        id:            p.id,
        name:          p.name ?? 'Unnamed Property',
        address:       p.address ?? '',
        phase,
        arv,
        purchasePrice: f.purchasePrice ?? 0,
        rehabCost:     f.projectedRehabCost ?? 0,
        noi:           derived.noi,
        capRate:       derived.capRate,
        coc:           derived.cashOnCashReturn,
        ltv:           derived.ltv,
        dscr:          derived.dscr,
        irr:           derived.irr ?? 0,
        occupancy:     derived.occupancyRate,
        grossRent:     annualRent,
      };
    });
  }, [projects]);

  const sorted = useMemo(() => {
    const col = METRIC_COLS.find((c) => c.key === sortKey)!;
    return [...properties].sort((a, b) =>
      col.good === 'high' ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]
    );
  }, [properties, sortKey]);

  const colValues = useMemo(() =>
    Object.fromEntries(
      METRIC_COLS.map((col) => [col.key, properties.map((p) => p[col.key])])
    ) as Record<SortKey, number[]>
  , [properties]);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#454955] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#454955]">Comparison Matrix</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio Comparison</h1>
          <p className="text-sm text-[#9E9DA0] mt-1">Side-by-side performance metrics across all properties</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-[#C0BEC2] hover:border-[#454955]/40 hover:text-[#454955] transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-[#6B6870] self-center mr-1">Sort by:</span>
        {METRIC_COLS.map((col) => (
          <button
            key={col.key}
            onClick={() => setSortKey(col.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              sortKey === col.key
                ? 'bg-[#454955] text-black'
                : 'bg-white/5 border border-white/10 text-[#9E9DA0] hover:text-slate-200 hover:border-white/20'
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>

      {/* ── Empty state ── */}
      {properties.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2">
            <span className="material-symbols-outlined text-3xl text-[#6B6870] select-none">compare</span>
          </div>
          <h3 className="text-lg font-bold text-white">No projects to compare yet</h3>
          <p className="text-sm text-[#9E9DA0] max-w-sm">
            Add at least two properties to your pipeline to see a side-by-side comparison of key metrics across your portfolio.
          </p>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#454955] text-black text-sm font-bold hover:bg-[#454955]/90 transition-colors"
          >
            <span className="material-symbols-outlined text-base select-none">add</span>
            Add Your First Project
          </Link>
        </div>
      )}

      {/* ── Comparison Table — real data only ── */}
      {properties.length > 0 && (
      <div className="rounded-2xl border border-white/10 overflow-x-auto" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-[#6B6870] w-56">Property</th>
              {METRIC_COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => setSortKey(col.key)}
                  className={`text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${
                    sortKey === col.key ? 'text-[#454955]' : 'text-[#6B6870] hover:text-[#C0BEC2]'
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && <span className="ml-1 text-[#454955]">↓</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((prop, idx) => (
              <tr
                key={prop.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors"
              >
                {/* Property name + phase */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-[#454955] flex-shrink-0"
                      style={{ background: 'rgba(69,73,85,0.1)' }}
                    >
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{prop.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[#6B6870] truncate">{prop.address}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${PHASE_COLORS[prop.phase] ?? 'text-[#9E9DA0] bg-white/5 border-white/10'}`}>
                          {prop.phase}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Metric cells */}
                {METRIC_COLS.map((col) => {
                  const v     = prop[col.key];
                  const score = metricScore(col, colValues[col.key], v);
                  return (
                    <td key={col.key} className="px-4 py-4 text-right">
                      <span
                        className={`inline-block font-mono font-semibold tabular-nums text-sm px-2 py-0.5 rounded ${
                          score === 'best'  ? 'text-[#454955] bg-[#454955]/10' :
                          score === 'worst' ? 'text-[#F06543] bg-[#F06543]/[0.08]' :
                          'text-[#C0BEC2]'
                        }`}
                      >
                        {v > 0 ? col.fmt(v) : '—'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/[0.08] bg-white/[0.02]">
              <td className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-[#6B6870]">Portfolio Avg</td>
              {METRIC_COLS.map((col) => {
                const vals = colValues[col.key].filter((v) => v > 0);
                const avg  = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                return (
                  <td key={col.key} className="px-4 py-3 text-right">
                    <span className="font-mono text-xs font-bold text-[#9E9DA0] tabular-nums">
                      {avg > 0 ? col.fmt(avg) : '—'}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B6870]">
        <span className="font-semibold uppercase tracking-widest">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#454955]/20 border border-[#454955]/30" /> Best in portfolio</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#F06543]/15 border border-[#F06543]/20" /> Lowest performer</span>
        <span className="flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3" /> Click column header to sort</span>
      </div>

    </div>
  );
}
