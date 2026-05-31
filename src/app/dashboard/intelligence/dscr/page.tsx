'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { DSCRRiskStripTerminal } from '@/components/intelligence/DSCRRiskStripTerminal';
import { DSCRThresholdCard } from '@/components/intelligence/DSCRThresholdCard';

/* ═══════════════════════════════════════════════════════════════
   DSCR Intelligence Page
   12-column grid:
     Left  4/12: Hero DSCR card + horizontal threshold bar gauge
     Right 8/12: Historical DSCR Trend line chart
   Bottom: Property-Level DSCR Breakdown table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

const DEMO_DSCR = 1.42;
const DEMO_CHANGE = +0.04;
const DEMO_TREND_VALUES = [1.18, 1.25, 1.31, 1.28, 1.35, 1.38, 1.42];
const DEMO_TREND_LABELS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

const DEMO_PROPERTIES = [
  { address: '421 Oak St, Brooklyn',  noi: 48200,  debtService: 32100, dscr: 1.50 },
  { address: '1248 Oakwood Ave',       noi: 36400,  debtService: 25600, dscr: 1.42 },
  { address: '77 Prospect Heights',    noi: 61800,  debtService: 48200, dscr: 1.28 },
  { address: '310 Atlantic Ave',       noi: 22100,  debtService: 19800, dscr: 1.12 },
];

/* ── Horizontal Threshold Gauge ── */
function DSCRGauge({ value }: { value: number }) {
  // Scale: 0–2.0 range mapped to 0–100%
  const MAX = 2.0;
  const fillPct = Math.min((value / MAX) * 100, 100);
  // Threshold positions: 1.0 → 50%, 1.25 → 62.5%
  const threshold1Pct = (1.0 / MAX) * 100;  // 50%
  const threshold2Pct = (1.25 / MAX) * 100; // 62.5%

  const zoneColor =
    value < 1.0  ? '#ef4444' :
    value < 1.25 ? '#f59e0b' :
                   '#2dd4bf';

  return (
    <div className="space-y-3">
      <div className="relative h-5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {/* Fill bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{ width: `${fillPct}%`, background: zoneColor }}
        />
        {/* Threshold markers */}
        <div
          className="absolute inset-y-0 w-0.5 bg-red-400/80"
          style={{ left: `${threshold1Pct}%` }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-amber-400/80"
          style={{ left: `${threshold2Pct}%` }}
        />
        {/* Current position dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-700"
          style={{ left: `calc(${fillPct}% - 8px)`, background: zoneColor }}
        />
      </div>

      {/* Zone labels */}
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="text-red-400">0.8 Risk</span>
        <span className="text-amber-400">1.25 Min</span>
        <span className="text-teal-400">2.0 Optimal</span>
      </div>

      {/* Zone cards */}
      <div className="grid grid-cols-3 gap-1.5 mt-2">
        {[
          { label: 'At Risk',  range: '< 1.0',   color: '#ef4444',  active: value < 1.0 },
          { label: 'Min',      range: '1.0–1.25', color: '#f59e0b',  active: value >= 1.0 && value < 1.25 },
          { label: 'Optimal',  range: '1.25+',    color: '#2dd4bf',  active: value >= 1.25 },
        ].map((z) => (
          <div
            key={z.label}
            className={`flex flex-col items-center py-2 rounded-lg border transition-all ${
              z.active ? 'bg-white/5 border-white/10' : 'border-transparent'
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: z.color }}>{z.label}</span>
            <span className="text-xs font-bold text-white tabular-nums mt-0.5">{z.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── DSCR Trend Line Chart ── */
function DSCRTrendChart({ values, labels }: { values: number[]; labels: string[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
      formatter: (params: any[]) =>
        `${params[0].axisValue}<br/>` +
        params.map((p: any) => `<span style="color:${p.color}">─</span> ${p.seriesName}: <b>${Number(p.value).toFixed(2)}x</b>`).join('<br/>'),
    },
    legend: {
      top: 0,
      right: 0,
      icon: 'line',
      textStyle: { color: '#bacac5', fontSize: 10 },
    },
    grid: { top: 36, right: 16, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      min: 0.8,
      max: 2.0,
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => `${v.toFixed(2)}x` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [
      {
        name: 'DSCR',
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: { width: 2.5, color: '#2dd4bf' },
        itemStyle: { color: '#2dd4bf' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(45,212,191,0.18)' },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
        symbol: 'circle',
        symbolSize: 6,
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          data: [
            {
              yAxis: 1.0,
              lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
              label: { show: true, position: 'insideEndTop', color: '#ef4444', fontSize: 10, formatter: 'Risk (1.0x)' },
            },
            {
              yAxis: 1.25,
              lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 },
              label: { show: true, position: 'insideEndTop', color: '#f59e0b', fontSize: 10, formatter: 'Lender Min (1.25x)' },
            },
          ],
        },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 240, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

export default function DSCRIntelligencePage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');
  const { snapshots } = usePortfolioMetricSnapshots('monthly');

  /* ── Interactive state from DSCRRiskStripTerminal ── */
  const [interactiveNOI, setInteractiveNOI] = useState(0);
  const [interactiveDS, setInteractiveDS] = useState(0);

  /* ── Derive portfolio NOI and debt service ── */
  const portfolioNOI = useMemo(() => {
    const withNOI = projects.filter(p => (p.financials?.netOperatingIncome ?? 0) > 0);
    if (withNOI.length > 0) {
      return withNOI.reduce((sum, p) => sum + (p.financials?.netOperatingIncome ?? 0), 0);
    }
    return 12486; // seed
  }, [projects]);

  const portfolioDebtService = useMemo(() => {
    const withDS = projects.filter(p => (p.financials?.longTermMortgagePayment ?? p.financials?.financingDebtService ?? 0) > 0);
    if (withDS.length > 0) {
      return withDS.reduce((sum, p) => {
        const monthly = p.financials?.longTermMortgagePayment ?? ((p.financials?.financingDebtService ?? 0) / 12);
        return sum + monthly;
      }, 0);
    }
    return 897; // seed monthly
  }, [projects]);

  const { isUsingDemoData, currentDscr, dscrChange, trendValues, trendLabels } = useMemo(() => {
    if (snapshots && snapshots.length >= 2) {
      const sorted = [...snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const vals   = sorted.map((s) => s.dscr ?? 0);
      const labels = sorted.map((s) =>
        s.date.toLocaleDateString('en-US', { month: 'short' })
      );
      const last = vals[vals.length - 1] ?? 0;
      const prev = vals[vals.length - 2] ?? 0;
      return { isUsingDemoData: false, currentDscr: last, dscrChange: last - prev, trendValues: vals, trendLabels: labels };
    }
    return {
      isUsingDemoData: true,
      currentDscr: DEMO_DSCR,
      dscrChange: DEMO_CHANGE,
      trendValues: DEMO_TREND_VALUES,
      trendLabels: DEMO_TREND_LABELS,
    };
  }, [snapshots]);

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">DSCR Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">DSCR Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">Debt Service Coverage Ratio — portfolio health signal</p>
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

      <SampleDataBanner show={isUsingDemoData} />

      {/* ── Main 12-column grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

        {/* ── Left 4/12: Hero card + Gauge ── */}
        <div className="md:col-span-4 space-y-4">

          {/* Hero DSCR Card */}
          <div className="rounded-xl border border-white/10 p-6 relative overflow-hidden" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Debt Service Coverage
              </span>
              <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${dscrChange >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                {dscrChange >= 0 ? '+' : ''}{dscrChange.toFixed(2)}x vs Last Month
                <ArrowUpRight className={`w-3.5 h-3.5 ${dscrChange < 0 ? 'rotate-180' : ''}`} />
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-6xl font-bold text-teal-400 tabular-nums tracking-tighter">
                {currentDscr.toFixed(2)}x
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded border border-teal-400/20 bg-teal-400/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-[9px] font-extrabold tracking-widest text-teal-400">LIVE</span>
              </div>
              <span className="text-xs text-slate-500">
                {currentDscr >= 1.25 ? 'Above lender minimum' : currentDscr >= 1.0 ? 'At lender minimum' : 'Below threshold — review required'}
              </span>
            </div>
          </div>

          {/* Threshold Gauge Card */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-4">
              Coverage Threshold Gauge
            </span>
            <DSCRGauge value={currentDscr} />
          </div>
        </div>

        {/* ── Right 8/12: Trend Chart ── */}
        <div className="md:col-span-8">
          <div className="rounded-xl border border-white/10 p-6 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Historical DSCR Trend
              </span>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-0.5 rounded" style={{ background: '#ef4444', display: 'inline-block' }} />
                  Risk Line (1.0x)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-0.5 rounded" style={{ background: '#f59e0b', display: 'inline-block' }} />
                  Lender Min (1.25x)
                </span>
              </div>
            </div>
            <DSCRTrendChart values={trendValues} labels={trendLabels} />
          </div>
        </div>
      </div>

      {/* ── DSCR Threshold + Risk Strip Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Threshold Intelligence Card */}
        <DSCRThresholdCard
          noi={interactiveNOI || portfolioNOI}
          annualDebtService={(interactiveDS || portfolioDebtService) * 12}
          lenderMinDSCR={1.25}
          targetDSCR={1.5}
        />

        {/* Risk Strip Terminal */}
        <DSCRRiskStripTerminal
          defaultAnnualNOI={portfolioNOI}
          defaultMonthlyDebtService={portfolioDebtService}
          lenderMinDSCR={1.25}
          onValuesChange={(values) => {
            setInteractiveNOI(values.annualNOI);
            setInteractiveDS(values.monthlyDebtService);
          }}
        />
      </div>

      {/* ── Bottom: Property-Level DSCR Breakdown ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Property-Level DSCR Breakdown
          </span>
          <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
            {DEMO_PROPERTIES.length} properties
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Address</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">NOI</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Debt Service</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">DSCR</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_PROPERTIES.map((prop) => {
                const status =
                  prop.dscr >= 1.25 ? { label: 'Healthy', color: '#2dd4bf', bg: 'rgba(45,212,191,0.1)' } :
                  prop.dscr >= 1.0  ? { label: 'Marginal', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' } :
                                      { label: 'At Risk',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
                return (
                  <tr key={prop.address} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">{prop.address}</td>
                    <td className="py-3 px-3 text-right text-slate-300 tabular-nums">{fmt(prop.noi)}</td>
                    <td className="py-3 px-3 text-right text-slate-300 tabular-nums">{fmt(prop.debtService)}</td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className="font-bold tabular-nums"
                        style={{ color: prop.dscr >= 1.25 ? '#2dd4bf' : prop.dscr >= 1.0 ? '#f59e0b' : '#ef4444' }}
                      >
                        {prop.dscr.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: status.color, background: status.bg }}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
