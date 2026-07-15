'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '@/lib/intelligence/selectors';
import { DealTermsClosingForm } from '@/components/intelligence/DealTermsClosingForm';
import { CapRateIntelligenceCard } from '@/components/intelligence/CapRateIntelligenceCard';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   Cap Rate Intelligence — Stitch screen: c822dbb6ed384087a6d2f5a645a61a25
   12-column grid:
     Left  4/12: Current cap rate card + gauge
     Right 8/12: Historical trend line chart + property ranking table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

const defaultTrend = [4.8, 5.1, 4.9, 5.3, 5.6, 5.2, 5.7, 5.85];
const defaultMonths = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
const defaultTarget = [5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5, 5.5];

const fallbackProperties = [
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
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
      formatter: (params: any[]) =>
        params[0].axisValue + '<br/>' +
        params.map((p: any) => `<span style="color:${p.color}">─</span> ${p.seriesName}: <b>${p.value}%</b>`).join('<br/>'),
    },
    legend: {
      top: 0,
      right: 0,
      icon: 'line',
      textStyle: { color: '#9E9DA0', fontSize: 10 },
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
      pieces: [{ gte: 4, lte: 6, color: '#454955' }, { gte: 6, color: '#fb923c' }],
    },
    series: [
      {
        name: 'Live Actuals',
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: { width: 2.5, color: '#454955' },
        itemStyle: { color: '#454955' },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(69, 73, 85,0.15)' }, { offset: 1, color: 'transparent' }] },
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

  const zone = value < 6 ? { label: 'Stable', color: '#454955' } : value < 8 ? { label: 'Neutral', color: '#859490' } : { label: 'High Yield', color: '#ffb4ab' };

  return (
    <div>
      <div className="relative flex justify-center overflow-hidden" style={{ height: 90 }}>
        <svg viewBox="0 0 100 60" className="w-56 h-28 absolute -top-2">
          <path d="M 20 50 A 30 30 0 0 1 80 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round" />
          <path d="M 20 50 A 30 30 0 0 1 40 32.5" fill="none" stroke="#454955" strokeWidth="8" />
          <path d="M 40 32.5 A 30 30 0 0 1 60 32.5" fill="none" stroke="#859490" strokeWidth="8" />
          <path d="M 60 32.5 A 30 30 0 0 1 80 50" fill="none" stroke="#ffb4ab" strokeWidth="8" />
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#9E9DA0" strokeWidth="2" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="3.5" fill="#9E9DA0" />
        </svg>
        <div className="absolute bottom-0 w-56 flex justify-between px-5 text-[9px] font-bold text-[#6B6870] uppercase tracking-widest">
          <span>4%</span>
          <span>10%</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2">
        {[
          { label: 'Stable', range: '4–6%', color: '#454955' },
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
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');

  const capCurrentResult = useMetricCurrent('CAP_RATE', { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const capSeriesResult = useMetricSeries('CAP_RATE', undefined, { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const portfolioInputsResult = usePortfolioInputs({ scope: scope === 'My Share' ? 'myShare' : 'property' });

  // Rule 2+3: derive NOI from deriveAllMetrics — no hardcoded seeds
  const { portfolioNoi, portfolioPurchasePrice } = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return { portfolioNoi: 0, portfolioPurchasePrice: 0 };
    }
    const snapshots = portfolioInputsResult.data.snapshots;
    const projects  = portfolioInputsResult.data.projects;
    // Prefer latest snapshot NOI (most recent), then fall back to derived
    if (snapshots && snapshots.length > 0) {
      const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
      const latestNoi = sorted[sorted.length - 1]?.noi;
      if (latestNoi && latestNoi > 0) {
        const totalPrice = projects.reduce((sum, p) => sum + (p.financials?.purchasePrice ?? 0), 0);
        return { portfolioNoi: latestNoi, portfolioPurchasePrice: totalPrice };
      }
    }
    const withPrice = projects.filter(p => (p.financials?.purchasePrice ?? 0) > 0);
    const totalNoi = withPrice.reduce((sum, p) => {
      const d = deriveAllMetrics(p.financials, undefined, p.dispositionType, p.currentPhase);
      return sum + d.noi;
    }, 0);
    const totalPrice = withPrice.reduce((sum, p) => sum + (p.financials?.purchasePrice ?? 0), 0);
    // Rule 3: if no data, return 0 (honest), not a seed
    return { portfolioNoi: Math.round(totalNoi), portfolioPurchasePrice: totalPrice };
  }, [portfolioInputsResult]);

  /* ── Interactive state for form ↔ gauge reactivity ── */
  const [interactivePurchasePrice, setInteractivePurchasePrice] = useState(0);

  // Rule 4: isUsingDemoData = true ONLY when no projects at all
  const { isUsingDemoData, currentCapRate, capRateChange, trendValues, trendLabels } = useMemo(() => {
    if (portfolioInputsResult.status === 'insufficient') {
      return { isUsingDemoData: true, currentCapRate: 5.85, capRateChange: 0.12, trendValues: defaultTrend, trendLabels: defaultMonths };
    }
    if (
      capSeriesResult.status === 'ready' &&
      capCurrentResult.status === 'ready' &&
      portfolioInputsResult.status === 'ready' &&
      portfolioInputsResult.data.snapshots.length >= 2
    ) {
      const sorted = [...portfolioInputsResult.data.snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-8);
      const vals   = sorted.map((s) => s.capRate ?? 0);
      const labels = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last   = capCurrentResult.data;
      const prev   = vals[vals.length - 2] ?? last;
      return { isUsingDemoData: false, currentCapRate: last, capRateChange: last - prev, trendValues: vals, trendLabels: labels };
    }
    // Projects exist but no snapshot history — use live selector if ready
    if (capCurrentResult.status === 'ready') {
      return { isUsingDemoData: false, currentCapRate: capCurrentResult.data, capRateChange: 0, trendValues: [], trendLabels: [] };
    }
    return { isUsingDemoData: false, currentCapRate: 0, capRateChange: 0, trendValues: [], trendLabels: [] };
  }, [capSeriesResult, capCurrentResult, portfolioInputsResult]);

  const propertyRankings = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return fallbackProperties;
    }
    const projects = portfolioInputsResult.data.projects;
    const withCapRate = projects.filter((p) => (p.financials?.capRate ?? (0)) > 0);
    if (withCapRate.length > 0) {
      return withCapRate
        .sort((a, b) => (b.financials?.capRate ?? (0)) - (a.financials?.capRate ?? (0)))
        .slice(0, 5)
        .map((p, i) => ({
          address: p.address || p.propertyName || 'Unknown',
          capRate: p.financials?.capRate ?? (0),
          value: p.financials?.estimatedARV ? `$${((p.financials.estimatedARV) / 1000).toFixed(0)}k` : '--',
          change: 0,
          rank: i + 1,
        }));
    }
    return fallbackProperties;
  }, [portfolioInputsResult]);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">Cap Rate Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Cap Rate Intelligence</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Property', 'My Share'] as Scope[]).map((s) => (
              <button key={s} onClick={() => setScope(s)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  scope === s ? 'bg-[#454955] text-black' : 'text-[#9E9DA0] hover:text-slate-200'
                }`}>{s}</button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Month', 'Quarter', 'Year', 'Overall'] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  period === p ? 'bg-white/10 text-[#6E7480] font-bold' : 'text-[#9E9DA0] hover:text-slate-200'
                }`}>{p}</button>
            ))}
          </div>
          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-[#C0BEC2] hover:border-[#454955]/40 hover:text-[#6E7480] transition-all flex items-center gap-2">
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
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Current Cap Rate</span>
              <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${capRateChange >= 0 ? 'text-[#6E7480]' : 'text-red-400'}`}>
                {capRateChange >= 0 ? '+' : ''}{capRateChange.toFixed(2)}%
                <ArrowUpRight className={`w-3.5 h-3.5 ${capRateChange < 0 ? 'rotate-180' : ''}`} />
              </div>
            </div>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-[#6E7480] tabular-nums tracking-tighter">{currentCapRate.toFixed(2)}%</span>
                <div className="px-2 py-0.5 rounded border border-[#6E7480]/20 bg-[#6E7480]/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6E7480] animate-pulse" />
                  <span className="text-[9px] font-extrabold tracking-widest text-[#6E7480]">LIVE</span>
                </div>
              </div>
              {/* Sparkline */}
              <svg viewBox="0 0 100 40" className="w-24 h-12 overflow-visible">
                <path
                  d={`M 0 35 ${trendValues.map((v, i) => `L ${(i / (trendValues.length - 1)) * 100} ${35 - ((v - 4) / 6) * 30}`).join(' ')}`}
                  fill="none" stroke="rgba(69, 73, 85,0.5)" strokeWidth="2" strokeLinecap="round"
                />
                <circle cx="100" cy={35 - ((trendValues[trendValues.length - 1] - 4) / 6) * 30} r="2.5" fill="#454955" />
              </svg>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
              <span className="w-2 h-2 rounded-full bg-[#6E7480]" />
              <span className="text-sm text-[#C0BEC2]">In-Range Performance</span>
            </div>
          </div>

          {/* Gauge */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-4">Performance Gauge</span>
            <CapRateGauge value={currentCapRate} />
          </div>
        </div>

        {/* ── Right: Trend + Ranking ── */}
        <div className="md:col-span-8 space-y-5">

          {/* Trend History Chart */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Historical Trend Analysis</span>
            </div>
            <TrendChart values={trendValues} labels={trendLabels} target={defaultTarget} />
          </div>

          {/* Property Rankings */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-4">Property Cap Rate Rankings</span>
            <div className="space-y-1">
              {propertyRankings.map((prop) => (
                <div key={prop.address} className="flex items-center justify-between py-3 border-b border-white/[0.04] hover:bg-white/[0.02] rounded-lg px-2 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-slate-600 w-5 flex-shrink-0">#{prop.rank}</span>
                    <span className="text-sm font-semibold text-white truncate">{prop.address}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs text-[#6B6870] tabular-nums">{prop.value}</span>
                    <div className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${prop.change >= 0 ? 'text-[#6E7480]' : 'text-red-400'}`}>
                      {prop.change >= 0 ? '+' : ''}{prop.change.toFixed(2)}%
                    </div>
                    <span className="text-sm font-bold text-[#6E7480] tabular-nums">{prop.capRate.toFixed(2)}%</span>
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
