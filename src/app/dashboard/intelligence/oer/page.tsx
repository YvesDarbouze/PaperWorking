'use client';

import React, { useState, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowDownRight, ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { ExpenseRatioCollectionTerminal } from '@/components/intelligence/ExpenseRatioCollectionTerminal';
import type { ExpenseRatioValues } from '@/components/intelligence/ExpenseRatioCollectionTerminal';

/* ═══════════════════════════════════════════════════════════════
   OER Intelligence Page
   Left 4/12: Hero card + gradient bar
   Right 8/12: Historical trend line chart with zone bands
   Bottom: Expense breakdown horizontal bar
   ═══════════════════════════════════════════════════════════════ */

const DEMO_TREND = [42.1, 41.5, 40.8, 39.9, 39.2, 38.8, 38.5, 38.2];
const DEMO_MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

const EXPENSE_CATEGORIES = [
  { name: 'Property Taxes', pct: 12, color: '#2dd4bf' },
  { name: 'Maintenance',    pct: 9,  color: '#38bdf8' },
  { name: 'Insurance',      pct: 8,  color: '#818cf8' },
  { name: 'Management',     pct: 7,  color: '#fb923c' },
  { name: 'Other',          pct: 2,  color: '#94a3b8' },
];

function TrendChart({ values, labels }: { values: number[]; labels: string[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
      formatter: (params: any[]) =>
        params[0].axisValue + '<br/>' +
        `<span style="color:#2dd4bf">─</span> OER: <b>${params[0].value}%</b>`,
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
          color: 'rgba(45,212,191,0.08)',
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
              yAxis: 35,
              lineStyle: { color: '#2dd4bf', type: 'dashed', width: 1, opacity: 0.5 },
              label: { formatter: 'Excellent <35%', color: '#2dd4bf', fontSize: 9 },
            },
            {
              yAxis: 45,
              lineStyle: { color: '#fb923c', type: 'dashed', width: 1, opacity: 0.5 },
              label: { formatter: 'Review >45%', color: '#fb923c', fontSize: 9 },
            },
          ],
        },
        markArea: {
          silent: true,
          data: [
            [
              { yAxis: 30, itemStyle: { color: 'rgba(45,212,191,0.04)' } },
              { yAxis: 35 },
            ],
            [
              { yAxis: 35, itemStyle: { color: 'rgba(251,191,36,0.04)' } },
              { yAxis: 45 },
            ],
            [
              { yAxis: 45, itemStyle: { color: 'rgba(248,113,113,0.05)' } },
              { yAxis: 55 },
            ],
          ],
        },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 240, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

function ExpenseChart() {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
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
      data: EXPENSE_CATEGORIES.map((c) => c.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [
      {
        type: 'bar',
        data: EXPENSE_CATEGORIES.map((c) => ({
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
  const projects = useProjectStore((s) => s.projects);
  const { snapshots } = usePortfolioMetricSnapshots('monthly');

  /* ── Reactive state from Collection Terminal ── */
  const [collectedValues, setCollectedValues] = useState<ExpenseRatioValues | null>(null);
  const handleCollectionChange = useCallback((v: ExpenseRatioValues) => setCollectedValues(v), []);

  const { isUsingDemoData, currentOER, oerChange, trendValues, trendLabels } = useMemo(() => {
    if (snapshots && snapshots.length >= 2) {
      const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-12);
      const vals   = sorted.map((s) => s.oer ?? 0);
      const labels = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last   = vals[vals.length - 1] ?? 0;
      const prev   = vals[vals.length - 2] ?? 0;
      return { isUsingDemoData: false, currentOER: last, oerChange: last - prev, trendValues: vals, trendLabels: labels };
    }
    // Use collected values if available, otherwise demo
    const oer = collectedValues?.expenseRatio ?? 38.2;
    return { isUsingDemoData: true, currentOER: oer, oerChange: -0.8, trendValues: DEMO_TREND, trendLabels: DEMO_MONTHS };
  }, [snapshots, projects, collectedValues]);

  const zone = currentOER < 35
    ? { label: 'Excellent', color: '#2dd4bf', bg: 'bg-teal-400/10 border-teal-400/20 text-teal-400' }
    : currentOER <= 45
    ? { label: 'Efficient', color: '#2dd4bf', bg: 'bg-teal-400/10 border-teal-400/20 text-teal-400' }
    : { label: 'Review', color: '#f87171', bg: 'bg-red-400/10 border-red-400/20 text-red-400' };

  // Position marker on gradient bar (0% = left = good, 100% = right = bad)
  const markerPct = Math.min(Math.max(((currentOER - 25) / 35) * 100, 0), 100);

  const isDecreasing = oerChange < 0;

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">OER Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Operating Expense Ratio</h1>
        </div>
        <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 hover:border-teal-500/40 hover:text-teal-400 transition-all flex items-center gap-2 self-start md:self-auto">
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
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Current OER</span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${zone.bg}`}>
                {zone.label}
              </span>
            </div>

            {/* Big number */}
            <div className="flex items-end gap-3">
              <span className="text-5xl font-bold text-teal-400 tabular-nums tracking-tighter">
                {currentOER.toFixed(1)}%
              </span>
            </div>

            {/* Change indicator */}
            <div className={`flex items-center gap-1.5 text-sm font-bold ${isDecreasing ? 'text-teal-400' : 'text-red-400'}`}>
              {isDecreasing
                ? <ArrowDownRight className="w-4 h-4" />
                : <ArrowUpRight className="w-4 h-4" />
              }
              {isDecreasing ? '' : '+'}{oerChange.toFixed(1)}% vs Last Period
              <span className="text-[10px] font-normal text-slate-500 ml-1">(lower is better)</span>
            </div>

            {/* Gradient bar */}
            <div className="space-y-2 pt-2">
              <div className="relative h-3 rounded-full overflow-hidden"
                style={{ background: 'linear-gradient(to right, #2dd4bf 0%, #fbbf24 50%, #f87171 100%)' }}>
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#091015] shadow"
                  style={{ left: `${markerPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-500">
                <span>Excellent &lt;35%</span>
                <span>Efficient 35–45%</span>
                <span>Review &gt;45%</span>
              </div>
            </div>

            {/* Zone legend */}
            <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/[0.06]">
              {[
                { label: 'Excellent', range: '<35%', color: '#2dd4bf' },
                { label: 'Efficient', range: '35–45%', color: '#fbbf24' },
                { label: 'Review', range: '>45%', color: '#f87171' },
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
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">OER Historical Trend</span>
              <div className="flex items-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-teal-400 inline-block" /> Portfolio OER</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-teal-400/30 inline-block border-t border-dashed border-teal-400/50" /> 35% Target</span>
              </div>
            </div>
            <TrendChart values={trendValues} labels={trendLabels} />
          </div>
        </div>
      </div>

      {/* ── Expense Ratio Collection Terminal ── */}
      <ExpenseRatioCollectionTerminal
        onValuesChange={handleCollectionChange}
      />

      {/* ── Bottom: Expense Breakdown ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Expense Breakdown</span>
          <span className="text-[10px] text-slate-600">% of Gross Rental Income</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ExpenseChart />
          <div className="space-y-2">
            {EXPENSE_CATEGORIES.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <span className="text-sm text-slate-300">{cat.name}</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: cat.color }}>{cat.pct}%</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-2 mt-1 border-t border-white/10">
              <span className="text-sm font-bold text-white">Total Operating Expenses</span>
              <span className="text-sm font-bold text-teal-400 tabular-nums">
                {EXPENSE_CATEGORIES.reduce((s, c) => s + c.pct, 0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
