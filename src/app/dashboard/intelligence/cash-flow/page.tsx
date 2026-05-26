'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';

/* ═══════════════════════════════════════════════════════════════
   Cash Flow Detail — Diverging Trend Page
   Top row hero card (full width)
   Main chart: full-width diverging bar (inflow above / outflow below zero)
   Second row: Cash Flow by Category donut + Stats table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

const DEMO_NET_CF       = 12140;
const DEMO_CF_CHANGE    = 12.4;
const DEMO_MONTHS_LABELS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

// Diverging bars: positive = inflow, negative = outflow
const DEMO_INFLOW  = [18200, 0,     19100, 0,     17900, 0,     21200, 0,     20400, 0,     22000, 0    ];
const DEMO_OUTFLOW = [0,    -14800, 0,    -15200, 0,    -13600,  0,   -15800, 0,    -14100, 0,   -9860  ];
const DEMO_NET     = [3400, -14800, 3900, -15200, 4300, -13600, 5400, -15800, 6300, -14100, 7000, 12140 ];

const DEMO_SPARKLINE = [3400, 3900, 4300, 5400, 6300, 7000, 12140];

/* ── Diverging Bar Chart ── */
function DivergingBarChart({
  labels,
  inflow,
  outflow,
}: {
  labels: string[];
  inflow: number[];
  outflow: number[];
}) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
      formatter: (params: any[]) => {
        const label = params[0].axisValue;
        const lines = params
          .filter((p: any) => p.value !== 0)
          .map((p: any) => {
            const val = Math.abs(Number(p.value));
            const sign = Number(p.value) >= 0 ? '+' : '-';
            return `<span style="color:${p.color}">■</span> ${p.seriesName}: <b>${sign}$${val.toLocaleString()}</b>`;
          })
          .join('<br/>');
        return `${label}<br/>${lines}`;
      },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#bacac5', fontSize: 10 },
    },
    grid: { top: 36, right: 16, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: (v: number) => `$${(Math.abs(v) / 1000).toFixed(0)}k${v < 0 ? '' : ''}`,
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      axisLine: { show: false },
    },
    series: [
      {
        name: 'Inflow',
        type: 'bar',
        stack: 'cf',
        data: inflow,
        barMaxWidth: 32,
        itemStyle: { color: '#2dd4bf', borderRadius: [3, 3, 0, 0] },
      },
      {
        name: 'Outflow',
        type: 'bar',
        stack: 'cf',
        data: outflow,
        barMaxWidth: 32,
        itemStyle: { color: 'rgba(239,68,68,0.55)', borderRadius: [0, 0, 3, 3] },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

/* ── Category Donut Chart ── */
function CategoryDonut() {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
      formatter: (params: any) =>
        `${params.name}<br/><b>${params.percent}%</b> · $${Number(params.value).toLocaleString()}`,
    },
    legend: {
      orient: 'vertical',
      right: 0,
      top: 'center',
      icon: 'circle',
      textStyle: { color: '#94a3b8', fontSize: 10 },
    },
    series: [
      {
        name: 'Cash Flow',
        type: 'pie',
        radius: ['52%', '78%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data: [
          { value: 12100, name: 'Rent Income',    itemStyle: { color: '#2dd4bf' } },
          { value: 3300,  name: 'Other Income',   itemStyle: { color: '#57f1db' } },
          { value: -6600, name: 'Expenses',       itemStyle: { color: 'rgba(239,68,68,0.55)' } },
          { value: -3300, name: 'Debt Interest',  itemStyle: { color: 'rgba(245,158,11,0.55)' } },
        ].map((d) => ({ ...d, value: Math.abs(d.value) })),
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 200, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

export default function CashFlowIntelligencePage() {
  useAllDealsSync();
  useProjectStore((s) => s.projects);
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');
  const { snapshots } = usePortfolioMetricSnapshots('monthly');

  const { netCashFlow, cfChange, chartLabels, inflowBars, outflowBars, sparkline, stats } = useMemo(() => {
    if (snapshots && snapshots.length >= 2) {
      const sorted = [...snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const labels  = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const mcfVals = sorted.map((s) => s.monthlyCashFlow ?? 0);
      const inflows = mcfVals.map((v) => (v > 0 ? v : 0));
      const outflows = mcfVals.map((v) => (v < 0 ? v : 0));
      const last = mcfVals[mcfVals.length - 1];
      const prev = mcfVals[mcfVals.length - 2];
      const pctChg = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;
      const spark = mcfVals.slice(-7);
      const ytd   = sorted.reduce((acc, s) => acc + (s.monthlyCashFlow ?? 0), 0);
      const avg   = ytd / sorted.length;
      const best  = Math.max(...mcfVals);
      const worst = Math.min(...mcfVals);
      return {
        netCashFlow: last,
        cfChange: pctChg,
        chartLabels: labels,
        inflowBars: inflows,
        outflowBars: outflows,
        sparkline: spark,
        stats: { avg, best, worst, ytd },
      };
    }
    const ytd   = DEMO_NET.reduce((a, b) => a + b, 0);
    const avg   = ytd / DEMO_MONTHS_LABELS.length;
    const positiveVals = DEMO_NET.filter((v) => v > 0);
    const best  = positiveVals.length > 0 ? Math.max(...positiveVals) : 0;
    const worst = Math.min(...DEMO_NET);
    return {
      netCashFlow: DEMO_NET_CF,
      cfChange: DEMO_CF_CHANGE,
      chartLabels: DEMO_MONTHS_LABELS,
      inflowBars: DEMO_INFLOW,
      outflowBars: DEMO_OUTFLOW,
      sparkline: DEMO_SPARKLINE,
      stats: { avg, best, worst, ytd },
    };
  }, [snapshots]);

  const fmt = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString()}`;

  // Fill bar for hero card — map netCashFlow to 0–100% (assume max meaningful CF ~$20k)
  const fillPct = Math.min(Math.max((netCashFlow / 20000) * 100, 0), 100);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">Cash Flow Detail</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Cash Flow Detail</h1>
          <p className="text-sm text-slate-500 mt-1">Diverging inflow / outflow trend analysis</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Property', 'My Share'] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  scope === s ? 'bg-teal-500 text-black' : 'text-slate-400 hover:text-slate-200'
                }`}
              >{s}</button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Month', 'Quarter', 'Year', 'Overall'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  period === p ? 'bg-white/10 text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >{p}</button>
            ))}
          </div>
          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 hover:border-teal-500/40 hover:text-teal-400 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* ── Hero Card (full width) ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: primary number */}
          <div className="flex items-center gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Net Cash Flow</span>
                <div className="px-2 py-0.5 rounded border border-teal-400/20 bg-teal-400/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-[9px] font-extrabold tracking-widest text-teal-400">LIVE</span>
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-teal-400 tabular-nums tracking-tighter">
                  {fmt(netCashFlow)}
                </span>
                <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${cfChange >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                  {cfChange >= 0 ? '+' : ''}{cfChange.toFixed(1)}%
                  <ArrowUpRight className={`w-4 h-4 ${cfChange < 0 ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            {/* Mini sparkline */}
            <div className="hidden md:block ml-4">
              <svg viewBox="0 0 70 32" className="w-20 h-10 overflow-visible">
                {sparkline.map((v, i) => {
                  const x = (i / (sparkline.length - 1)) * 70;
                  const minV = Math.min(...sparkline);
                  const maxV = Math.max(...sparkline);
                  const range = maxV - minV || 1;
                  const y = 28 - ((v - minV) / range) * 22;
                  const barH = Math.max(2, ((v - minV) / range) * 22);
                  const isFull = i === sparkline.length - 1;
                  return (
                    <rect
                      key={i}
                      x={x - 4}
                      y={y}
                      width={8}
                      height={barH}
                      rx={2}
                      fill={isFull ? '#2dd4bf' : 'rgba(45,212,191,0.25)'}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Right: fill bar */}
          <div className="flex-1 max-w-xs">
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1.5">
              <span>Monthly Progress</span>
              <span>{fillPct.toFixed(0)}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${fillPct}%`, background: '#2dd4bf' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Diverging Bar Chart (full width) ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Monthly Cash Flow — Inflow vs Outflow
          </span>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#2dd4bf' }} />
              Inflow
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'rgba(239,68,68,0.55)' }} />
              Outflow
            </span>
          </div>
        </div>
        <DivergingBarChart labels={chartLabels} inflow={inflowBars} outflow={outflowBars} />
      </div>

      {/* ── Bottom row: Donut + Stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Category Donut */}
        <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-3">
            Cash Flow by Category
          </span>
          <CategoryDonut />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: 'Rent Income',   pct: '55%', color: '#2dd4bf' },
              { label: 'Other Income',  pct: '15%', color: '#57f1db' },
              { label: 'Expenses',      pct: '30%', color: 'rgba(239,68,68,0.7)' },
              { label: 'Debt Interest', pct: '15%', color: 'rgba(245,158,11,0.7)' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                <span className="text-xs text-slate-400">{item.label}</span>
                <span className="text-xs font-bold text-white ml-auto tabular-nums">{item.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Table */}
        <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-4">
            Cash Flow Trend Stats
          </span>
          <div className="space-y-3">
            {[
              { label: 'Monthly Average', value: fmt(stats.avg), highlight: false },
              { label: 'Best Month',      value: fmt(stats.best), highlight: true, color: '#2dd4bf' },
              { label: 'Worst Month',     value: fmt(stats.worst), highlight: true, color: '#ef4444' },
              { label: 'YTD Total',       value: fmt(stats.ytd), highlight: true, color: '#57f1db' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                <span className="text-sm text-slate-400">{row.label}</span>
                <span
                  className="text-base font-bold tabular-nums"
                  style={{ color: row.highlight ? row.color : '#dae4ec' }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Trend Direction</span>
              <div className="flex items-center gap-1 text-teal-400 text-xs font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Net Positive
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
