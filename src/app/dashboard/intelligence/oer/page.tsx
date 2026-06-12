'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowDownRight, ArrowUpRight, Download, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '@/lib/intelligence/selectors';
import { ExpenseRatioCollectionTerminal } from '@/components/intelligence/ExpenseRatioCollectionTerminal';
import type { ExpenseRatioValues } from '@/components/intelligence/ExpenseRatioCollectionTerminal';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   OER Intelligence Page
   Left 4/12: Hero card + gradient bar
   Right 8/12: Historical trend line chart with zone bands
   Bottom: Expense breakdown horizontal bar
   ═══════════════════════════════════════════════════════════════ */

const EXPENSE_CATEGORIES = [
  { name: 'Property Taxes', pct: 12, color: '#454955' },
  { name: 'Maintenance',    pct: 9,  color: '#38bdf8' },
  { name: 'Insurance',      pct: 8,  color: '#818cf8' },
  { name: 'Management',     pct: 7,  color: '#fb923c' },
  { name: 'Other',          pct: 2,  color: '#94a3b8' },
];

function TrendChart({ values, labels, whatIfOER }: { values: number[]; labels: string[]; whatIfOER?: number | null }) {
  const markLineData = [
    {
      yAxis: 35,
      lineStyle: { color: '#454955', type: 'dashed', width: 1, opacity: 0.5 },
      label: { formatter: 'Excellent <35%', color: '#454955', fontSize: 9 },
    },
    {
      yAxis: 45,
      lineStyle: { color: '#fb923c', type: 'dashed', width: 1, opacity: 0.5 },
      label: { formatter: 'Review >45%', color: '#fb923c', fontSize: 9 },
    },
  ];
  if (whatIfOER != null && isFinite(whatIfOER) && whatIfOER > 0) {
    markLineData.push({
      yAxis: Number(whatIfOER.toFixed(1)),
      lineStyle: { color: '#fb923c', type: 'solid', width: 2, opacity: 1 },
      label: { formatter: `What-If (${whatIfOER.toFixed(1)}%)`, color: '#fb923c', fontSize: 10, fontWeight: 'bold' } as any,
    });
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
      formatter: (params: any[]) =>
        params[0].axisValue + '<br/>' +
        `<span style="color:#454955">─</span> OER: <b>${params[0].value}%</b>`,
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
      min: 30,
      max: 55,
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    visualMap: { show: false },
    series: [
      // Zone: Excellent <35 (green fill behind)
      {
        name: 'Excellent Zone',
        type: 'line',
        data: labels.map(() => 35),
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: 'rgba(69, 73, 85,0.08)',
          origin: 'start',
        },
        showSymbol: false,
        stack: 'zone',
        silent: true,
        z: 0,
      },
      {
        name: 'OER Trend',
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: { width: 2.5, color: '#454955' },
        itemStyle: { color: '#454955' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69, 73, 85,0.18)' },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
        symbol: 'circle',
        symbolSize: 6,
        markLine: {
          silent: true,
          symbol: ['none', 'none'],
          data: markLineData,
        },
        markArea: {
          silent: true,
          data: [
            [
              { yAxis: 30, itemStyle: { color: 'rgba(69, 73, 85,0.04)' } },
              { yAxis: 35 },
            ],
            [
              { yAxis: 35, itemStyle: { color: 'rgba(251,191,36,0.04)' } },
              { yAxis: 45 },
            ],
            [
              { yAxis: 45, itemStyle: { color: 'rgba(240, 101, 67,0.05)' } },
              { yAxis: 55 },
            ],
          ],
        },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 240, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(22,19,24,0.4)' }}>
      <div className="flex flex-col items-center justify-center gap-4 text-center border border-dashed border-white/10 rounded-xl p-12 min-h-[300px]">
        <TrendingUp className="w-12 h-12 text-slate-600" strokeWidth={1} />
        <div>
          <p className="text-sm font-semibold text-[#C0BEC2] mb-1">Awaiting Portfolio Data</p>
          <p className="text-xs text-[#6B6870] max-w-xs leading-relaxed">
            Import deal data or complete Purchase phase tasks to generate Operating Expense Ratio analytics.
          </p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="mt-2 px-5 py-2 rounded-full border border-[#454955]/30 text-[#6E7480] text-xs font-semibold hover:bg-[#454955]/10 transition-all"
        >
          Add First Deal
        </Link>
      </div>
    </div>
  );
}

function ExpenseChart({ categories }: { categories: typeof EXPENSE_CATEGORIES }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
      formatter: (params: any[]) => `${params[0].name}: <b>${params[0].value}%</b> of Gross Income`,
    },
    grid: { top: 8, right: 48, bottom: 8, left: 0, containLabel: true },
    xAxis: {
      type: 'value',
      max: 20,
      axisLabel: { color: '#64748b', fontSize: 9, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    yAxis: {
      type: 'category',
      data: categories.map((c) => c.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        data: categories.map((c) => ({
          value: c.pct,
          itemStyle: { color: c.color, borderRadius: [0, 4, 4, 0] },
        })),
        barMaxWidth: 18,
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          fontSize: 10,
          formatter: (p: any) => `${p.value}%`,
        },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 160, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

export default function OERIntelligencePage() {
  useAllDealsSync();
  const oerCurrentResult = useMetricCurrent('OER');
  const oerSeriesResult = useMetricSeries('OER');
  const portfolioInputsResult = usePortfolioInputs();

  const derivedExpenseCategories = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return [
        { name: 'Property Taxes', pct: 0, color: '#454955' },
        { name: 'Maintenance',    pct: 0,  color: '#38bdf8' },
        { name: 'Insurance',      pct: 0,  color: '#818cf8' },
        { name: 'Management',     pct: 0,  color: '#fb923c' },
        { name: 'Other',          pct: 0,  color: '#94a3b8' },
      ];
    }
    const projects = portfolioInputsResult.data.projects;
    let gr = 0, pt = 0, ins = 0, pm = 0, mt = 0, other = 0;

    for (const p of projects) {
      const financials = p.financials || {};
      const factor = (financials.ownershipPercentage ?? 100) / 100;
      const comp = deriveAllMetrics(financials, undefined, p.strategyType, p.currentPhase).noiComponents;

      gr += comp.grossRentalIncome * factor;
      pt += comp.propertyTaxes * factor;
      ins += comp.insurance * factor;
      pm += comp.propertyManagement * factor;
      mt += comp.maintenance * factor;
      other += (comp.utilities + comp.hoa) * factor;
    }

    if (gr === 0) {
      return [
        { name: 'Property Taxes', pct: 0, color: '#454955' },
        { name: 'Maintenance',    pct: 0,  color: '#38bdf8' },
        { name: 'Insurance',      pct: 0,  color: '#818cf8' },
        { name: 'Management',     pct: 0,  color: '#fb923c' },
        { name: 'Other',          pct: 0,  color: '#94a3b8' },
      ];
    }

    return [
      { name: 'Property Taxes', pct: Math.round((pt / gr) * 100), color: '#454955' },
      { name: 'Maintenance',    pct: Math.round((mt / gr) * 100),  color: '#38bdf8' },
      { name: 'Insurance',      pct: Math.round((ins / gr) * 100), color: '#818cf8' },
      { name: 'Management',     pct: Math.round((pm / gr) * 100),  color: '#fb923c' },
      { name: 'Other',          pct: Math.round((other / gr) * 100), color: '#94a3b8' },
    ];
  }, [portfolioInputsResult]);

  if (
    oerCurrentResult.status === 'loading' ||
    oerSeriesResult.status === 'loading' ||
    portfolioInputsResult.status === 'loading'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 flex items-center justify-center" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <p className="text-sm text-[#9E9DA0]">Loading OER data...</p>
      </div>
    );
  }

  if (
    portfolioInputsResult.status === 'insufficient' ||
    oerCurrentResult.status === 'insufficient' ||
    oerSeriesResult.status === 'insufficient'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">OER Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Operating Expense Ratio</h1>
        </div>
        <EmptyState />
      </div>
    );
  }

  /* ── Reactive state from Collection Terminal ── */
  const [collectedValues, setCollectedValues] = useState<ExpenseRatioValues | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const initialOERRef = useRef<number | null>(null);

  const handleCollectionChange = useCallback((v: ExpenseRatioValues) => {
    if (initialOERRef.current === null) {
      initialOERRef.current = v.expenseRatio;
    } else if (Math.abs(v.expenseRatio - initialOERRef.current) > 0.01) {
      setHasInteracted(true);
    }
    setCollectedValues(v);
  }, []);

  const whatIfOER = useMemo(() => {
    if (hasInteracted && collectedValues) {
      return collectedValues.expenseRatio;
    }
    return null;
  }, [hasInteracted, collectedValues]);

  const portfolioDefaults = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return { grossMonthlyRent: 1950 };
    }
    const projects = portfolioInputsResult.data.projects;
    const withRent = projects.filter(p => (p.financials?.monthlyGrossRent ?? 0) > 0);
    const avgRent = withRent.length > 0
      ? withRent.reduce((s, p) => s + (p.financials?.monthlyGrossRent ?? 0), 0) / withRent.length
      : 1950;
    return {
      grossMonthlyRent: Math.round(avgRent),
    };
  }, [portfolioInputsResult]);

  const { isUsingDemoData, currentOER, oerChange, trendValues, trendLabels } = useMemo(() => {
    if (
      oerSeriesResult.status === 'ready' &&
      oerCurrentResult.status === 'ready' &&
      portfolioInputsResult.status === 'ready' &&
      portfolioInputsResult.data.snapshots.length >= 2
    ) {
      const sorted = [...portfolioInputsResult.data.snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const vals   = sorted.map((s) => s.oer ?? (0));
      const labels = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last   = oerCurrentResult.data;
      const prev   = vals[vals.length - 2] ?? last;
      return { isUsingDemoData: false, currentOER: last, oerChange: last - prev, trendValues: vals, trendLabels: labels };
    }
    return { isUsingDemoData: false, currentOER: 0, oerChange: 0, trendValues: [], trendLabels: [] };
  }, [oerSeriesResult, oerCurrentResult, portfolioInputsResult]);

  const displayOER = whatIfOER ?? currentOER;

  const zone = displayOER < 35
    ? { label: 'Excellent', color: '#454955', bg: 'bg-[#6E7480]/10 border-[#6E7480]/20 text-[#6E7480]' }
    : displayOER <= 45
    ? { label: 'Efficient', color: '#454955', bg: 'bg-[#6E7480]/10 border-[#6E7480]/20 text-[#6E7480]' }
    : { label: 'Review', color: '#F06543', bg: 'bg-red-400/10 border-red-400/20 text-red-400' };

  // Position marker on gradient bar (0% = left = good, 100% = right = bad)
  const markerPct = Math.min(Math.max(((displayOER - 25) / 35) * 100, 0), 100);

  const isDecreasing = oerChange < 0;

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">OER Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Operating Expense Ratio</h1>
        </div>
        <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-[#C0BEC2] hover:border-[#454955]/40 hover:text-[#6E7480] transition-all flex items-center gap-2 self-start md:self-auto">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      <SampleDataBanner show={isUsingDemoData} />

      {/* ── Main 12-column grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

        {/* ── Left Hero: 4/12 ── */}
        <div className="md:col-span-4 space-y-4">
          <div className="rounded-xl border border-white/10 p-6 space-y-5" style={{ background: 'rgba(24,33,39,0.7)' }}>

            {/* Label */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Current OER</span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${zone.bg}`}>
                {zone.label}
              </span>
            </div>

            {/* Big number */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-5xl font-bold tabular-nums tracking-tighter transition-all" style={{ color: whatIfOER != null ? '#fb923c' : '#6E7480' }}>
                {displayOER.toFixed(1)}%
              </span>
              {whatIfOER != null && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest uppercase" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
                  WHAT-IF
                </span>
              )}
            </div>

            {/* Indicator row */}
            <div className="flex items-center gap-2">
              {whatIfOER != null ? (
                <div className="px-2 py-0.5 rounded border border-orange-400/20 bg-orange-400/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span className="text-[9px] font-extrabold tracking-widest text-orange-400">HYPOTHETICAL</span>
                </div>
              ) : (
                <div className="px-2 py-0.5 rounded border border-[#6E7480]/20 bg-[#6E7480]/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6E7480] animate-pulse" />
                  <span className="text-[9px] font-extrabold tracking-widest text-[#6E7480]">LIVE</span>
                </div>
              )}
            </div>

            {/* Change indicator */}
            <div className={`flex items-center gap-1.5 text-sm font-bold ${isDecreasing ? 'text-[#6E7480]' : 'text-red-400'}`}>
              {isDecreasing
                ? <ArrowDownRight className="w-4 h-4" />
                : <ArrowUpRight className="w-4 h-4" />
              }
              {isDecreasing ? '' : '+'}{oerChange.toFixed(1)}% vs Last Period
              <span className="text-[10px] font-normal text-[#6B6870] ml-1">(lower is better)</span>
            </div>

            {/* Gradient bar */}
            <div className="space-y-2 pt-2">
              <div className="relative h-3 rounded-full overflow-hidden"
                style={{ background: 'linear-gradient(to right, #454955 0%, #fbbf24 50%, #F06543 100%)' }}>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#0d0a0b] shadow"
                  style={{ left: `${markerPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-[#6B6870]">
                <span>Excellent &lt;35%</span>
                <span>Efficient 35–45%</span>
                <span>Review &gt;45%</span>
              </div>
            </div>

            {/* Zone legend */}
            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/[0.06]">
              {[
                { label: 'Excellent', range: '<35%', color: '#454955' },
                { label: 'Efficient', range: '35–45%', color: '#fbbf24' },
                { label: 'Review', range: '>45%', color: '#F06543' },
              ].map((z) => (
                <div key={z.label} className="flex flex-col items-center py-2 rounded-lg bg-white/[0.02]">
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: z.color }}>{z.label}</span>
                  <span className="text-xs font-bold text-white tabular-nums">{z.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Trend Chart 8/12 ── */}
        <div className="md:col-span-8">
          <div className="rounded-xl border border-white/10 p-6 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">OER Historical Trend</span>
              <div className="flex items-center gap-4 text-[10px] text-[#6B6870]">
                <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-[#6E7480] inline-block" /> Portfolio OER</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#6E7480]/30 inline-block border-t border-dashed border-[#6E7480]/50" /> 35% Target</span>
              </div>
            </div>
            <TrendChart values={trendValues} labels={trendLabels} whatIfOER={whatIfOER} />
          </div>
        </div>
      </div>

      {/* ── Expense Ratio Collection Terminal ── */}
      <ExpenseRatioCollectionTerminal
        defaults={portfolioDefaults}
        onValuesChange={handleCollectionChange}
      />

      {/* ── Bottom: Expense Breakdown ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Expense Breakdown</span>
          <span className="text-[10px] text-slate-600">% of Gross Rental Income</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ExpenseChart categories={derivedExpenseCategories} />
          <div className="space-y-2">
            {derivedExpenseCategories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="text-sm text-[#C0BEC2]">{cat.name}</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: cat.color }}>{cat.pct}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 mt-1 border-t border-white/10">
              <span className="text-sm font-bold text-white">Total Operating Expenses</span>
              <span className="text-sm font-bold text-[#6E7480] tabular-nums">
                {derivedExpenseCategories.reduce((s, c) => s + c.pct, 0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
