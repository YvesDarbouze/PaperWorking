'use client';

import React, { useState, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { AppreciationCollectionTerminal } from '@/components/intelligence/AppreciationCollectionTerminal';
import type { AppreciationValues } from '@/components/intelligence/AppreciationCollectionTerminal';

/* ═══════════════════════════════════════════════════════════════
   Appreciation Intelligence — Value Trajectory vs. Baseline
   12-column grid:
     Left  4/12: Hero card + KPI stack
     Right 8/12: Dual-line chart (Portfolio Value vs Market Baseline)
   Bottom: Value by Property table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

const DEMO_APPRECIATION   = 12.5;
const DEMO_CURRENT_VALUE  = 545500;
const DEMO_ORIGINAL_BASIS = 485000;
const DEMO_UNREALIZED_GAIN = DEMO_CURRENT_VALUE - DEMO_ORIGINAL_BASIS; // 60500

const DEMO_MONTHS_LABELS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

// Portfolio value: ascending from purchase price to current estimated value
const DEMO_PORTFOLIO_VALUE = [
  485000, 490200, 496000, 502500, 508800, 515000,
  520200, 525800, 531000, 536500, 541200, 545500,
];

// Market baseline: flatter appreciation (~5% annual = ~0.4%/month)
const DEMO_MARKET_BASELINE = [
  485000, 487000, 489000, 491000, 493000, 495000,
  497000, 499000, 501000, 503000, 505000, 507000,
];

const DEMO_PROPERTIES = [
  { address: '421 Oak St, Brooklyn', purchase: 485000, current: 545500, gain: 60500,  gainPct: 12.5, yoy: 12.5 },
  { address: '1248 Oakwood Ave',      purchase: 320000, current: 368000, gain: 48000,  gainPct: 15.0, yoy: 15.0 },
  { address: '77 Prospect Heights',   purchase: 820000, current: 890000, gain: 70000,  gainPct: 8.5,  yoy:  8.5 },
  { address: '310 Atlantic Ave',      purchase: 280000, current: 295000, gain: 15000,  gainPct: 5.4,  yoy:  5.4 },
];

/* ── Dual-Line Appreciation Chart ── */
function AppreciationChart({
  labels,
  portfolioData,
  baselineData,
}: {
  labels: string[];
  portfolioData: number[];
  baselineData: number[];
}) {
  // Shaded area between the two lines represents alpha generated
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
      formatter: (params: any[]) => {
        const label = params[0].axisValue;
        const lines = params
          .map((p: any) => `<span style="color:${p.color}">─</span> ${p.seriesName}: <b>$${Number(p.value).toLocaleString()}</b>`)
          .join('<br/>');
        return `${label}<br/>${lines}`;
      },
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
      axisLabel: {
        color: '#64748b',
        fontSize: 10,
        formatter: (v: number) => `$${(v / 1000).toFixed(0)}k`,
      },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [
      {
        name: 'Portfolio Value',
        type: 'line',
        data: portfolioData,
        smooth: true,
        lineStyle: { width: 2.5, color: '#20B2AA' },
        itemStyle: { color: '#20B2AA' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(32, 178, 170,0.22)' },
              { offset: 1, color: 'rgba(32, 178, 170,0.03)' },
            ],
          },
        },
        symbol: 'none',
        symbolSize: 7,
      },
      {
        name: 'Market Baseline',
        type: 'line',
        data: baselineData,
        smooth: true,
        lineStyle: { width: 1.8, color: 'rgba(148,163,184,0.55)', type: 'dashed' },
        itemStyle: { color: 'rgba(148,163,184,0.55)' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(148,163,184,0.08)' },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
        symbol: 'none',
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 280, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

export default function AppreciationIntelligencePage() {
  useAllDealsSync();
  useProjectStore((s) => s.projects);
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');
  const { snapshots } = usePortfolioMetricSnapshots('monthly');

  /* ── Reactive state from Collection Terminal ── */
  const [collectedValues, setCollectedValues] = useState<AppreciationValues | null>(null);
  const handleCollectionChange = useCallback((v: AppreciationValues) => setCollectedValues(v), []);

  const {
    isUsingDemoData,
    appreciationRate,
    currentValue,
    originalBasis,
    unrealizedGain,
    annualRate,
    chartLabels,
    portfolioSeries,
    baselineSeries,
  } = useMemo(() => {
    if (snapshots && snapshots.length >= 2) {
      const sorted = [...snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const appVals  = sorted.map((s) => s.appreciation ?? 0);
      const valVals  = sorted.map((s) => s.propertyValue ?? 0);
      const labels   = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const lastApp  = appVals[appVals.length - 1];
      const lastVal  = valVals[valVals.length - 1];
      const firstVal = valVals[0];
      const gain     = lastVal - firstVal;
      // Baseline = linear appreciation at 5% annual
      const baselineVals = valVals.map((_, i) => {
        return Math.round(firstVal * (1 + (0.05 / 12) * i));
      });
      return {
        isUsingDemoData: false,
        appreciationRate: lastApp,
        currentValue: lastVal,
        originalBasis: firstVal,
        unrealizedGain: gain,
        annualRate: lastApp,
        chartLabels: labels,
        portfolioSeries: valVals,
        baselineSeries: baselineVals,
      };
    }
    return {
      isUsingDemoData: true,
      appreciationRate: collectedValues?.annualizedRate ?? DEMO_APPRECIATION,
      currentValue: collectedValues?.currentEstimate ?? DEMO_CURRENT_VALUE,
      originalBasis: collectedValues?.totalBasis ?? DEMO_ORIGINAL_BASIS,
      unrealizedGain: collectedValues?.totalGain ?? DEMO_UNREALIZED_GAIN,
      annualRate: collectedValues?.annualizedRate ?? DEMO_APPRECIATION,
      chartLabels: DEMO_MONTHS_LABELS,
      portfolioSeries: DEMO_PORTFOLIO_VALUE,
      baselineSeries: DEMO_MARKET_BASELINE,
    };
  }, [snapshots, collectedValues]);

  const fmt = (n: number) => `$${n.toLocaleString()}`;
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  // Alpha = portfolio appreciation vs market baseline
  const alphaVsPct = ((currentValue - (baselineSeries[baselineSeries.length - 1] ?? currentValue)) / (baselineSeries[baselineSeries.length - 1] ?? currentValue) * 100);
  const alphaDollar = currentValue - (baselineSeries[baselineSeries.length - 1] ?? currentValue);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">Appreciation Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Appreciation Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">Value trajectory vs. market baseline — unrealized gain analysis</p>
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

        {/* ── Left 4/12: Hero + KPI Stack ── */}
        <div className="md:col-span-4 space-y-4">

          {/* Hero Appreciation Card */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Appreciation Rate
              </span>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-teal-400 bg-teal-400/10 border border-teal-400/20">
                Above Market Avg
              </span>
            </div>

            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-6xl font-bold text-teal-400 tabular-nums tracking-tighter leading-none">
                {fmtPct(appreciationRate)}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1 text-teal-400 text-sm font-bold">
                <ArrowUpRight className="w-4 h-4" />
                {fmt(Math.abs(unrealizedGain))} Unrealized Gain
              </div>
            </div>

            {/* Alpha vs market */}
            {alphaDollar > 0 && (
              <div className="pt-3 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Alpha vs Market</span>
                  <span className="text-xs font-bold text-teal-400 tabular-nums">
                    +{fmtPct(alphaVsPct)} · +{fmt(alphaDollar)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* KPI Stack */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-4">
              Portfolio Value KPIs
            </span>
            <div className="space-y-4">
              {[
                {
                  label: 'Current Value',
                  value: fmt(currentValue),
                  color: '#20B2AA',
                  change: null,
                },
                {
                  label: 'Original Basis',
                  value: fmt(originalBasis),
                  color: '#dae4ec',
                  change: null,
                },
                {
                  label: 'Unrealized Gain',
                  value: `+${fmt(Math.abs(unrealizedGain))}`,
                  color: '#57f1db',
                  change: null,
                },
                {
                  label: 'Annual Apprec. Rate',
                  value: `${annualRate.toFixed(1)}%`,
                  color: '#20B2AA',
                  change: null,
                },
              ].map((kpi) => (
                <div key={kpi.label} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-xs text-slate-500 font-semibold">{kpi.label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: kpi.color }}>
                    {kpi.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right 8/12: Trajectory Chart ── */}
        <div className="md:col-span-8">
          <div className="rounded-xl border border-white/10 p-6 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Value Trajectory vs. Market Baseline
              </span>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-0.5 inline-block rounded" style={{ background: '#20B2AA' }} />
                  Portfolio Value
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-6 h-0.5 inline-block"
                    style={{ borderTop: '2px dashed rgba(148,163,184,0.6)' }}
                  />
                  Market Baseline
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mb-4">
              Shaded area between lines = alpha generated above market appreciation rate
            </p>
            <AppreciationChart
              labels={chartLabels}
              portfolioData={portfolioSeries}
              baselineData={baselineSeries}
            />

            {/* Alpha callout */}
            {alphaDollar > 0 && (
              <div className="mt-4 p-3 rounded-lg border border-teal-400/15 bg-teal-400/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-teal-400/70">
                    Alpha vs. 5% Market Baseline
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base font-extrabold text-teal-400 tabular-nums">
                      +{fmtPct(alphaVsPct)}
                    </span>
                    <span className="text-sm font-bold text-teal-400/70 tabular-nums">
                      +{fmt(alphaDollar)}
                    </span>
                  </div>
                </div>
                <ArrowUpRight className="w-6 h-6 text-teal-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Appreciation Collection Terminal ── */}
      <AppreciationCollectionTerminal
        onValuesChange={handleCollectionChange}
      />

      {/* ── Bottom: Value by Property Table ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Value by Property
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
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Purchase Price</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Current Value</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Gain $</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Gain %</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">YoY %</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_PROPERTIES.map((prop) => (
                <tr key={prop.address} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">{prop.address}</td>
                  <td className="py-3 px-3 text-right text-slate-400 tabular-nums">{fmt(prop.purchase)}</td>
                  <td className="py-3 px-3 text-right text-white tabular-nums font-semibold">{fmt(prop.current)}</td>
                  <td className="py-3 px-3 text-right text-teal-400 tabular-nums font-bold">+{fmt(prop.gain)}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ArrowUpRight className="w-3 h-3 text-teal-400" />
                      <span className="text-teal-400 font-bold tabular-nums">+{prop.gainPct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-teal-400/80 font-semibold tabular-nums">+{prop.yoy.toFixed(1)}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
