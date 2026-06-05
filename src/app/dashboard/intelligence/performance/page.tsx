'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ArrowUpRight, Download, RefreshCw, TrendingUp } from 'lucide-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';

/* ═══════════════════════════════════════════════════════════════
   Portfolio Performance — Stitch screen fb4ad4ea62b54d83bc36f9f7ec327872
   Three states: Loading skeleton → Active chart → Empty placeholder
   Desktop: Hero value + area chart (full width) + KPI strip
   ═══════════════════════════════════════════════════════════════ */

type Scope  = 'Property' | 'My Share';
type Period = 'M' | 'Q' | 'Y' | 'All';

const PERIOD_MAP: Record<Period, 'monthly' | 'quarterly' | 'annual' | 'monthly'> = {
  M: 'monthly', Q: 'quarterly', Y: 'annual', All: 'monthly',
};

const DEMO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DEMO_VALUES = [920000, 940000, 910000, 970000, 985000, 1020000, 1050000, 1080000, 1100000, 1150000, 1190000, 1240000];

function PerformanceChart({ labels, values }: { labels: string[]; values: number[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(6,15,21,0.92)',
      borderColor: '#20B2AA',
      borderWidth: 1,
      textStyle: { color: '#dae4ec', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
      formatter: (params: any[]) => {
        const p = params[0];
        return `${p.name}<br/><b style="color:#20B2AA">$${(p.value / 1000).toFixed(0)}k</b>`;
      },
      extraCssText: 'box-shadow: 0 0 20px rgba(32, 178, 170,0.2); backdrop-filter: blur(12px);',
    },
    grid: { top: 20, right: 16, bottom: 28, left: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#64748b', fontSize: 10,
        formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`,
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: '#20B2AA', width: 2.5 },
        itemStyle: { color: '#20B2AA', borderColor: '#060f15', borderWidth: 2 },
        emphasis: { itemStyle: { color: '#57f1db', borderColor: '#060f15', borderWidth: 2, shadowBlur: 8, shadowColor: 'rgba(32, 178, 170,0.5)' } },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(32, 178, 170,0.35)' },
              { offset: 1, color: 'rgba(32, 178, 170,0)' },
            ],
          },
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 300, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

function LoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 p-6 space-y-4" style={{ background: 'rgba(20,29,35,0.4)' }}>
      <div className="flex items-center gap-2 text-slate-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-xs font-semibold uppercase tracking-widest">Loading Intelligence…</span>
      </div>
      <div className="h-8 w-1/4 rounded-lg bg-white/5 animate-pulse" />
      <div className="h-[300px] w-full rounded-xl bg-white/[0.03] animate-pulse" />
      <div className="flex justify-between gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 w-10 rounded bg-white/5 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(20,29,35,0.4)' }}>
      <div className="flex flex-col items-center justify-center gap-4 text-center border border-dashed border-white/10 rounded-xl p-12 min-h-[300px]">
        <TrendingUp className="w-12 h-12 text-slate-600" strokeWidth={1} />
        <div>
          <p className="text-sm font-semibold text-slate-300 mb-1">Awaiting Portfolio Data</p>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Import deal data or complete Purchase phase tasks to generate performance analytics.
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="mt-2 px-5 py-2 rounded-full border border-teal-500/30 text-teal-400 text-xs font-semibold hover:bg-teal-500/10 transition-all"
        >
          Add First Deal
        </Link>
      </div>
    </div>
  );
}

export default function PortfolioPerformancePage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const [scope, setScope]   = useState<Scope>('Property');
  const [period, setPeriod] = useState<Period>('Y');
  const { snapshots, loading } = usePortfolioMetricSnapshots(PERIOD_MAP[period]);

  const { labels, values, totalValue, roiPct, hasData, isUsingDemoData } = useMemo(() => {
    if (!snapshots || snapshots.length === 0) {
      const totalCost = projects.reduce((s, p) => s + ((p.financials?.purchasePrice ?? 0) + (p.financials?.rehabBudget ?? 0)), 0);
      if (totalCost === 0) return { labels: DEMO_MONTHS, values: DEMO_VALUES, totalValue: 1_240_000, roiPct: 14.2, hasData: false, isUsingDemoData: true };
      const totalArv = projects.reduce((s, p) => s + (p.financials?.arv ?? p.financials?.purchasePrice ?? 0), 0);
      return { labels: DEMO_MONTHS, values: DEMO_VALUES, totalValue: totalArv, roiPct: totalCost > 0 ? ((totalArv - totalCost) / totalCost) * 100 : 14.2, hasData: true, isUsingDemoData: true };
    }

    const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
    const vals   = sorted.map((s) => s.propertyValue ?? 0).filter(Boolean);
    const lbls   = sorted.filter((s) => s.propertyValue).map((s) =>
      s.date.toLocaleDateString('en-US', { month: 'short', year: period === 'All' ? '2-digit' : undefined })
    );
    const last = vals[vals.length - 1] ?? 0;
    const first = vals[0] ?? last;
    const roi = first > 0 ? ((last - first) / first) * 100 : 0;
    return { labels: lbls, values: vals, totalValue: last, roiPct: roi, hasData: vals.length > 1, isUsingDemoData: false };
  }, [snapshots, projects, period]);

  const kpis = useMemo(() => {
    const totalArv    = projects.reduce((s, p) => s + (p.financials?.arv ?? p.financials?.purchasePrice ?? 0), 0);
    const totalEquity = projects.reduce((s, p) => {
      const arv  = p.financials?.arv ?? p.financials?.purchasePrice ?? 0;
      const loan = p.financials?.loanAmount ?? arv * 0.65;
      return s + Math.max(0, arv - loan);
    }, 0);
    const totalDebt = projects.reduce((s, p) => s + (p.financials?.loanAmount ?? 0), 0);
    return {
      assets:  totalArv  > 0 ? totalArv  : 2_100_000,
      equity:  totalEquity > 0 ? totalEquity : 760_000,
      debt:    totalDebt > 0 ? totalDebt  : 1_340_000,
      deals:   projects.length > 0 ? projects.length : 4,
    };
  }, [projects]);

  const fmt = (v: number) =>
    v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(2)}M` : `$${(v / 1000).toFixed(0)}k`;

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">Portfolio Performance</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Portfolio Performance</h1>
          <p className="text-sm text-slate-400 mt-1">Total portfolio value trajectory and ROI analytics</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Scope toggle */}
          <div className="flex gap-0.5 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Property', 'My Share'] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all font-mono ${
                  scope === s ? 'bg-teal-500 text-black shadow-[0_0_15px_rgba(32, 178, 170,0.3)]' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {/* Period toggle */}
          <div className="flex gap-0.5 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['M', 'Q', 'Y', 'All'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all font-mono ${
                  period === p ? 'border border-teal-500/60 text-teal-400 bg-teal-500/10' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 hover:border-teal-500/40 hover:text-teal-400 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Strip */}

      <SampleDataBanner show={isUsingDemoData} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assets',  value: fmt(kpis.assets),  sub: 'Portfolio ARV' },
          { label: 'Total Equity',  value: fmt(kpis.equity),  sub: 'Assets – Debt' },
          { label: 'Total Debt',    value: fmt(kpis.debt),    sub: 'Loan balances' },
          { label: 'Active Deals',  value: String(kpis.deals), sub: 'Properties tracked' },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-white/10 p-4"
            style={{ background: 'rgba(24,33,39,0.7)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-white tabular-nums font-mono">{k.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Chart Panel */}
      {loading ? (
        <LoadingSkeleton />
      ) : !hasData && projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="rounded-2xl border border-white/10 p-6"
          style={{ background: 'rgba(20,29,35,0.4)', backdropFilter: 'blur(24px)' }}
        >
          {/* Chart header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest mb-1">Total Portfolio Value</p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-teal-400 tabular-nums font-mono">
                  {fmt(totalValue)}
                </span>
                <span className={`flex items-center gap-1 text-sm font-bold font-mono ${roiPct >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                  {roiPct >= 0 ? '+' : ''}{roiPct.toFixed(1)}%
                  <ArrowUpRight className={`w-4 h-4 ${roiPct < 0 ? 'rotate-90' : ''}`} />
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-teal-400 inline-block rounded-full" />
                Portfolio Value
              </span>
            </div>
          </div>

          <PerformanceChart labels={labels} values={values} />
        </div>
      )}

      {/* Milestone timeline */}
      <div
        className="rounded-2xl border border-white/10 p-6"
        style={{ background: 'rgba(24,33,39,0.7)' }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Performance Milestones</p>
        <div className="relative pl-4 space-y-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
          {[
            { date: 'Oct 2024', event: 'Portfolio crosses $1M ARV threshold', delta: '+8.2%', type: 'milestone' },
            { date: 'Aug 2024', event: 'Q3 refinance — LTV reduced to 62%', delta: 'LTV ↓', type: 'refi' },
            { date: 'Jun 2024', event: 'Rehab completion — 124 Elm St ARV realized', delta: '+$85k', type: 'exit' },
            { date: 'Mar 2024', event: 'New acquisition — 87 Oak Ave added', delta: '$310k', type: 'acq' },
          ].map((m) => (
            <div key={m.date} className="flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 flex-shrink-0 -ml-[5px]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-200 font-medium">{m.event}</p>
                  <span className="text-xs font-bold text-teal-400 font-mono flex-shrink-0">{m.delta}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{m.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
