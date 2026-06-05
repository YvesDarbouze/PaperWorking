'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { DealTermsClosingForm } from '@/components/intelligence/DealTermsClosingForm';
import { CapRateIntelligenceCard } from '@/components/intelligence/CapRateIntelligenceCard';

/* ═══════════════════════════════════════════════════════════════
   Cap Rate Intelligence — Stitch screen: c822dbb6ed384087a6d2f5a645a61a25
   12-column grid:
     Left  4/12: Current cap rate card + gauge
     Right 8/12: Historical trend line chart + property ranking table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

const DEMO_TREND = [4.8, 5.1, 4.9, 5.3, 5.6, 5.2, 5.7, 5.85];
const DEMO_MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
const DEMO_TARGET = [5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5];

const DEMO_PROPERTIES = [
  { address: '421 Oak St, Brooklyn',   capRate: 6.42, value: '$1.2M',  change: +0.18, rank: 1 },
  { address: '1248 Oakwood Ave',        capRate: 5.85, value: '$850k',  change: +0.12, rank: 2 },
  { address: '77 Prospect Heights',     capRate: 5.21, value: '$2.1M',  change: -0.08, rank: 3 },
  { address: '310 Atlantic Ave',        capRate: 4.97, value: '$680k',  change: +0.04, rank: 4 },
];

function TrendChart({ values, labels, target }: { values: number[]; labels: string[]; target: number[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
      formatter: (params: any[]) =>
        params[0].axisValue + '<br/>' +
        params.map((p: any) => `<span style="color:${p.color}">─</span> ${p.seriesName}: <b>${p.value}%</b>`).join('<br/>'),
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
      min: 4,
      max: 8,
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    visualMap: {
      show: false,
      type: 'piecewise',
      seriesIndex: 0,
      pieces: [{ gte: 4, lte: 6, color: '#20B2AA' }, { gte: 6, color: '#fb923c' }],
    },
    series: [
      {
        name: 'Live Actuals',
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: { width: 2.5, color: '#20B2AA' },
        itemStyle: { color: '#20B2AA' },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(32, 178, 170,0.15)' }, { offset: 1, color: 'transparent' }] },
        },
        symbol: 'circle',
        symbolSize: 6,
      },
      {
        name: 'Annual Target',
        type: 'line',
        data: target,
        lineStyle: { width: 1.5, color: 'rgba(133,148,144,0.5)', type: 'dashed' },
        itemStyle: { color: 'rgba(133,148,144,0.5)' },
        showSymbol: false,
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 220, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

/* ── Semi-circle SVG Gauge ── */
function CapRateGauge({ value }: { value: number }) {
  const MIN = 4, MAX = 10;
  const pct = Math.min(Math.max((value - MIN) / (MAX - MIN), 0), 1);
  const angle = -90 + pct * 180;
  const rad = (angle * Math.PI) / 180;
  const cx = 50, cy = 50, r = 30;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  const zone = value < 6 ? { label: 'Stable', color: '#20B2AA' } : value < 8 ? { label: 'Neutral', color: '#859490' } : { label: 'High Yield', color: '#ffb4ab' };

  return (
    <div>
      <div className="relative flex justify-center overflow-hidden" style={{ height: 90 }}>
        <svg viewBox="0 0 100 60" className="w-56 h-28 absolute -top-2">
          <path d="M 20 50 A 30 30 0 0 1 80 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
          <path d="M 20 50 A 30 30 0 0 1 40 32.5" fill="none" stroke="#20B2AA" strokeWidth="8" />
          <path d="M 40 32.5 A 30 30 0 0 1 60 32.5" fill="none" stroke="#859490" strokeWidth="8" />
          <path d="M 60 32.5 A 30 30 0 0 1 80 50" fill="none" stroke="#ffb4ab" strokeWidth="8" />
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#dae4ec" strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="3.5" fill="#dae4ec" />
        </svg>
        <div className="absolute bottom-0 w-56 flex justify-between px-5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          <span>4%</span>
          <span>10%</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2">
        {[
          { label: 'Stable', range: '4–6%', color: '#20B2AA' },
          { label: 'Neutral', range: '6–8%', color: '#859490' },
          { label: 'High Yield', range: '8%+', color: '#ffb4ab' },
        ].map((z) => (
          <div key={z.label} className={`flex flex-col items-center py-2 rounded-lg ${zone.label === z.label ? 'bg-white/5' : ''}`}>
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: z.color }}>{z.label}</span>
            <span className="text-xs font-bold text-white tabular-nums">{z.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CapRateIntelligencePage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');
  const { snapshots } = usePortfolioMetricSnapshots('monthly');

  /* ── Portfolio NOI & Purchase Price (derived from store) ── */
  const portfolioNoi = useMemo(() => {
    if (snapshots && snapshots.length > 0) {
      const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
      const latestNoi = sorted[sorted.length - 1]?.noi;
      if (latestNoi && latestNoi > 0) return latestNoi;
    }
    const withNoi = projects.filter(p => (p.financials?.netOperatingIncome ?? 0) > 0);
    if (withNoi.length > 0) {
      return withNoi.reduce((sum, p) => sum + (p.financials?.netOperatingIncome ?? 0), 0);
    }
    return 12486; // seed
  }, [snapshots, projects]);

  const portfolioPurchasePrice = useMemo(() => {
    const withPrice = projects.filter(p => (p.financials?.purchasePrice ?? 0) > 0);
    if (withPrice.length > 0) {
      return withPrice.reduce((sum, p) => sum + (p.financials?.purchasePrice ?? 0), 0);
    }
    return 279000; // seed
  }, [projects]);

  /* ── Interactive state for form ↔ gauge reactivity ── */
  const [interactivePurchasePrice, setInteractivePurchasePrice] = useState(0);

  const { isUsingDemoData, currentCapRate, capRateChange, trendValues, trendLabels } = useMemo(() => {
    if (snapshots && snapshots.length >= 2) {
      const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-8);
      const vals   = sorted.map((s) => s.capRate ?? 0);
      const labels = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last   = vals[vals.length - 1] ?? 0;
      const prev   = vals[vals.length - 2] ?? 0;
      return { isUsingDemoData: false, currentCapRate: last, capRateChange: last - prev, trendValues: vals, trendLabels: labels };
    }
    const hasCapRate = projects.some((p) => (p.financials?.capRate ?? 0) > 0);
    if (hasCapRate) {
      const avg = projects.reduce((s, p) => s + (p.financials?.capRate ?? 0), 0) / projects.filter((p) => (p.financials?.capRate ?? 0) > 0).length;
      return { isUsingDemoData: true, currentCapRate: avg, capRateChange: 0.12, trendValues: DEMO_TREND, trendLabels: DEMO_MONTHS };
    }
    return { isUsingDemoData: true, currentCapRate: 5.85, capRateChange: 0.12, trendValues: DEMO_TREND, trendLabels: DEMO_MONTHS };
  }, [snapshots, projects]);

  const propertyRankings = useMemo(() => {
    const withCapRate = projects.filter((p) => (p.financials?.capRate ?? 0) > 0);
    if (withCapRate.length > 0) {
      return withCapRate
        .sort((a, b) => (b.financials?.capRate ?? 0) - (a.financials?.capRate ?? 0))
        .slice(0, 5)
        .map((p, i) => ({
          address: p.address || p.propertyName || 'Unknown',
          capRate: p.financials?.capRate ?? 0,
          value: p.financials?.estimatedARV ? `$${((p.financials.estimatedARV) / 1000).toFixed(0)}k` : '--',
          change: 0,
          rank: i + 1,
        }));
    }
    return DEMO_PROPERTIES;
  }, [projects]);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">Cap Rate Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Cap Rate Intelligence</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Property', 'My Share'] as Scope[]).map((s) => (
              <button key={s} onClick={() => setScope(s)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  scope === s ? 'bg-teal-500 text-black' : 'text-slate-400 hover:text-slate-200'
                }`}>{s}</button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Month', 'Quarter', 'Year', 'Overall'] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  period === p ? 'bg-white/10 text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}>{p}</button>
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

        {/* ── Left: Metric Card + Gauge ── */}
        <div className="md:col-span-4 space-y-4">

          {/* Current Cap Rate Card */}
          <div className="rounded-xl border border-white/10 p-6 relative overflow-hidden" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Current Cap Rate</span>
              <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${capRateChange >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                {capRateChange >= 0 ? '+' : ''}{capRateChange.toFixed(2)}%
                <ArrowUpRight className={`w-3.5 h-3.5 ${capRateChange < 0 ? 'rotate-180' : ''}`} />
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-teal-400 tabular-nums tracking-tighter">{currentCapRate.toFixed(2)}%</span>
                <div className="px-2 py-0.5 rounded border border-teal-400/20 bg-teal-400/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span className="text-[9px] font-extrabold tracking-widest text-teal-400">LIVE</span>
                </div>
              </div>
              {/* Sparkline */}
              <svg viewBox="0 0 100 40" className="w-24 h-12 overflow-visible">
                <path
                  d={`M 0 35 ${trendValues.map((v, i) => `L ${(i / (trendValues.length - 1)) * 100} ${35 - ((v - 4) / 6) * 30}`).join(' ')}`}
                  fill="none" stroke="rgba(32, 178, 170,0.5)" strokeWidth="2" strokeLinecap="round"
                />
                <circle cx="100" cy={35 - ((trendValues[trendValues.length - 1] - 4) / 6) * 30} r="2.5" fill="#20B2AA" />
              </svg>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span className="text-sm text-slate-300">In-Range Performance</span>
            </div>
          </div>

          {/* Gauge */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-4">Performance Gauge</span>
            <CapRateGauge value={currentCapRate} />
          </div>
        </div>

        {/* ── Right: Trend + Ranking ── */}
        <div className="md:col-span-8 space-y-5">

          {/* Trend History Chart */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Historical Trend Analysis</span>
            </div>
            <TrendChart values={trendValues} labels={trendLabels} target={DEMO_TARGET} />
          </div>

          {/* Property Rankings */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-4">Property Cap Rate Rankings</span>
            <div className="space-y-1">
              {propertyRankings.map((prop) => (
                <div key={prop.address} className="flex items-center justify-between py-3 border-b border-white/[0.04] hover:bg-white/[0.02] rounded-lg px-2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-600 w-5 flex-shrink-0">#{prop.rank}</span>
                    <span className="text-sm font-semibold text-white truncate">{prop.address}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs text-slate-500 tabular-nums">{prop.value}</span>
                    <div className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${prop.change >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                      {prop.change >= 0 ? '+' : ''}{prop.change.toFixed(2)}%
                    </div>
                    <span className="text-sm font-bold text-teal-400 tabular-nums">{prop.capRate.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cap Rate Intelligence Card (Gauge) ── */}
      <CapRateIntelligenceCard
        noi={portfolioNoi}
        purchasePrice={interactivePurchasePrice > 0 ? interactivePurchasePrice : portfolioPurchasePrice}
        marketAvgCapRate={5.2}
      />

      {/* ── Deal Terms & Closing Form ── */}
      <DealTermsClosingForm
        noi={portfolioNoi}
        defaultPurchasePrice={portfolioPurchasePrice}
        onValuesChange={(values) => {
          setInteractivePurchasePrice(values.purchasePrice);
        }}
      />

    </div>
  );
}
