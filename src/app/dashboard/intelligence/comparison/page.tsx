'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download } from 'lucide-react';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';

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

const DEMO_PROPERTIES: PropertyMetrics[] = [
  {
    id: 'demo-1', name: '124 Elm Street', address: 'Memphis, TN',
    phase: 'Hold', arv: 385000, purchasePrice: 225000, rehabCost: 65000,
    noi: 28800, capRate: 7.48, coc: 9.2, ltv: 62, dscr: 1.62, irr: 18.4, occupancy: 100, grossRent: 38400,
  },
  {
    id: 'demo-2', name: '87 Oak Avenue', address: 'Birmingham, AL',
    phase: 'Acquisition', arv: 310000, purchasePrice: 195000, rehabCost: 42000,
    noi: 21600, capRate: 6.97, coc: 8.1, ltv: 71, dscr: 1.38, irr: 14.2, occupancy: 94, grossRent: 30000,
  },
  {
    id: 'demo-3', name: '55 Maple Drive', address: 'Kansas City, MO',
    phase: 'Hold', arv: 275000, purchasePrice: 168000, rehabCost: 38000,
    noi: 19200, capRate: 6.98, coc: 7.8, ltv: 68, dscr: 1.44, irr: 15.8, occupancy: 100, grossRent: 26400,
  },
  {
    id: 'demo-4', name: '210 Pine Court', address: 'Indianapolis, IN',
    phase: 'Exit', arv: 420000, purchasePrice: 258000, rehabCost: 72000,
    noi: 33600, capRate: 8.0, coc: 11.4, ltv: 58, dscr: 1.85, irr: 22.1, occupancy: 100, grossRent: 44400,
  },
];

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
  Hold:        'text-teal-400 bg-teal-500/10 border-teal-500/20',
  Exit:        'text-amber-400 bg-amber-500/10 border-amber-500/20',
  Rehab:       'text-purple-400 bg-purple-500/10 border-purple-500/20',
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

  const isUsingDemoData = projects.length === 0;

  const properties: PropertyMetrics[] = useMemo(() => {
    if (projects.length === 0) return DEMO_PROPERTIES;
    return projects.map((p) => {
      const f = p.financials ?? {};
      const arv       = f.arv ?? f.purchasePrice ?? 0;
      const loan      = f.loanAmount ?? arv * 0.65;
      const annualRent= (f.monthlyGrossRent ?? 0) * 12;
      const annualOpEx= ((f.holdingCostInsurance ?? 0) + (f.holdingCostTaxes ?? 0) + (f.holdingCostUtilities ?? 0)) * 12;
      const noi       = Math.max(0, annualRent - annualOpEx);
      const annualDebt= (f.longTermMortgagePayment ?? 0) * 12;
      const cost      = (f.purchasePrice ?? 0) + (f.rehabBudget ?? 0);
      const equity    = Math.max(0, arv - loan);
      const netCF     = noi - annualDebt;

      const phase = p.phase === 'acquisition' ? 'Acquisition'
                  : p.phase === 'exit'        ? 'Exit'
                  : p.phase === 'rehab'       ? 'Rehab'
                  : 'Hold';

      return {
        id:            p.id,
        name:          p.name ?? 'Unnamed Property',
        address:       p.address ?? '',
        phase,
        arv,
        purchasePrice: f.purchasePrice ?? 0,
        rehabCost:     f.rehabBudget ?? 0,
        noi,
        capRate:       arv > 0 ? (noi / arv) * 100 : 0,
        coc:           equity > 0 ? (netCF / equity) * 100 : 0,
        ltv:           arv > 0 ? (loan / arv) * 100 : 0,
        dscr:          annualDebt > 0 ? noi / annualDebt : 0,
        irr:           f.cashOnCashReturn ?? 0,
        occupancy:     f.occupancyRate ?? (p.phase === 'hold' ? 95 : 0),
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
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">Comparison Matrix</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio Comparison</h1>
          <p className="text-sm text-slate-400 mt-1">Side-by-side performance metrics across all properties</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 hover:border-teal-500/40 hover:text-teal-400 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 self-center mr-1">Sort by:</span>
        {METRIC_COLS.map((col) => (
          <button
            key={col.key}
            onClick={() => setSortKey(col.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              sortKey === col.key
                ? 'bg-teal-500 text-black'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            {col.label}
          </button>
        ))}
      </div>

      <SampleDataBanner show={isUsingDemoData} />

      {/* ── Comparison Table ── */}
      <div className="rounded-2xl border border-white/10 overflow-x-auto" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 w-56">Property</th>
              {METRIC_COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => setSortKey(col.key)}
                  className={`text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-colors ${
                    sortKey === col.key ? 'text-teal-400' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && <span className="ml-1 text-teal-400">↓</span>}
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
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-teal-400 flex-shrink-0"
                      style={{ background: 'rgba(45,212,191,0.1)' }}
                    >
                      #{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{prop.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 truncate">{prop.address}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${PHASE_COLORS[prop.phase] ?? 'text-slate-400 bg-white/5 border-white/10'}`}>
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
                          score === 'best'  ? 'text-teal-400 bg-teal-500/10' :
                          score === 'worst' ? 'text-red-400 bg-red-500/[0.08]' :
                          'text-slate-300'
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
              <td className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">Portfolio Avg</td>
              {METRIC_COLS.map((col) => {
                const vals = colValues[col.key].filter((v) => v > 0);
                const avg  = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
                return (
                  <td key={col.key} className="px-4 py-3 text-right">
                    <span className="font-mono text-xs font-bold text-slate-400 tabular-nums">
                      {avg > 0 ? col.fmt(avg) : '—'}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-widest">Legend:</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-teal-500/20 border border-teal-500/30" /> Best in portfolio</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/15 border border-red-500/20" /> Lowest performer</span>
        <span className="flex items-center gap-1.5"><ArrowUpRight className="w-3 h-3" /> Click column header to sort</span>
      </div>

    </div>
  );
}
