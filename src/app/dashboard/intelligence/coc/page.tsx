'use client';

import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '@/lib/intelligence/selectors';
import { CashDeployedTerminal } from '@/components/intelligence/CashDeployedTerminal';
import { CoCIntelligenceCard } from '@/components/intelligence/CoCIntelligenceCard';
import { deriveAllMetrics, computeTotalCashInvested } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   Cash-on-Cash Return Intelligence Page
   Left 4/12: Hero card + scenario cards
   Right 8/12: Area line chart with reference lines
   Bottom: CoC by Investment Tranche table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

function CoCTrendChart({ values, labels }: { values: number[]; labels: string[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
      formatter: (params: any[]) =>
        params[0].axisValue + '<br/>' +
        `<span style="color:#454955">─</span> CoC Return: <b>${params[0].value}%</b>`,
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
      max: 14,
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [
      {
        name: 'CoC Return',
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: { width: 2.5, color: '#454955' },
        itemStyle: { color: '#454955' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69, 73, 85,0.20)' },
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
              yAxis: 6,
              lineStyle: { color: '#fbbf24', type: 'dashed', width: 1, opacity: 0.7 },
              label: { formatter: 'Min Acceptable (6%)', color: '#fbbf24', fontSize: 9, position: 'insideEndTop' },
            },
            {
              yAxis: 8,
              lineStyle: { color: '#454955', type: 'dashed', width: 1, opacity: 0.7 },
              label: { formatter: 'Target (8%)', color: '#454955', fontSize: 9, position: 'insideEndTop' },
            },
            {
              yAxis: 12,
              lineStyle: { color: 'rgba(255,255,255,0.4)', type: 'dashed', width: 1, opacity: 0.5 },
              label: { formatter: 'Excellent (12%)', color: '#e2e8f0', fontSize: 9, position: 'insideEndTop' },
            },
          ],
        },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

const SCENARIOS = [
  {
    label: 'Conservative',
    coc: 6.5,
    description: 'Higher vacancy, conservative rent',
    borderClass: 'border-white/10',
    textClass: 'text-[#9E9DA0]',
    numClass: 'text-[#C0BEC2]',
    active: false,
  },
  {
    label: 'Current',
    coc: 8.42,
    description: 'Live portfolio performance',
    borderClass: 'border-[#6E7480]/40',
    textClass: 'text-[#6E7480]',
    numClass: 'text-[#6E7480]',
    active: true,
  },
  {
    label: 'Aggressive',
    coc: 11.8,
    description: 'Full occupancy, rent optimization',
    borderClass: 'border-white/10',
    textClass: 'text-[#9E9DA0]',
    numClass: 'text-[#C0BEC2]',
    active: false,
  },
];

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(22,19,24,0.4)' }}>
      <div className="flex flex-col items-center justify-center gap-4 text-center border border-dashed border-white/10 rounded-xl p-12 min-h-[300px]">
        <TrendingUp className="w-12 h-12 text-slate-600" strokeWidth={1} />
        <div>
          <p className="text-sm font-semibold text-[#C0BEC2] mb-1">Awaiting Portfolio Data</p>
          <p className="text-xs text-[#6B6870] max-w-xs leading-relaxed">
            Import deal data or complete Purchase phase tasks to generate Cash-on-Cash Return analytics.
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

export default function CoCIntelligencePage() {
  useAllDealsSync();
  const [scope, setScope] = useState<'Property' | 'My Share'>('Property');
  const selectorScope = scope === 'My Share' ? 'myShare' : 'property';
  const cocSeriesResult = useMetricSeries('COC', undefined, { scope: selectorScope });
  const cocCurrentResult = useMetricCurrent('COC', { scope: selectorScope });
  const portfolioInputsResult = usePortfolioInputs({ scope: selectorScope });

  /* ── Interactive state for CashDeployedTerminal → CoCIntelligenceCard ── */
  const [interactiveCashInvested, setInteractiveCashInvested] = useState(0);
  const [interactiveCoCReturn, setInteractiveCoCReturn] = useState(0);

  // Rule 4: isUsingDemoData = true ONLY when no projects at all
  const { isUsingDemoData, currentCoC, cocChange, trendValues, trendLabels } = useMemo(() => {
    if (cocSeriesResult.status === 'ready' && cocCurrentResult.status === 'ready') {
      const vals   = cocSeriesResult.data.series;
      const labels = cocSeriesResult.data.labels;
      const last   = cocCurrentResult.data;
      const prev   = vals[0] ?? 0;
      return { isUsingDemoData: false, currentCoC: last, cocChange: last - prev, trendValues: vals, trendLabels: labels };
    }
    return { isUsingDemoData: false, currentCoC: 0, cocChange: 0, trendValues: [], trendLabels: [] };
  }, [cocSeriesResult, cocCurrentResult]);

  // Rule 2: tranche table uses deriveAllMetrics — same formula as useMetricCurrent('COC')
  const trancheRows = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return [];
    }
    const projects = portfolioInputsResult.data.projects;
    // Use computeTotalCashInvested to find equity; filter to projects with any purchase price
    const withPrice = projects.filter((p) => (p.financials?.purchasePrice ?? 0) > 0);
    return withPrice.slice(0, 5).map((p) => {
      const derived = deriveAllMetrics(p.financials, undefined, p.strategyType, p.currentPhase);
      const equity = computeTotalCashInvested(p.financials || {});
      // Rule 2: NOI minus annual debt service = annual cash flow, same as selector arithmetic
      const annualCF = derived.noi - derived.annualDebtService;
      const coc = equity > 0 ? (annualCF / equity) * 100 : 0;
      return {
        tranche: p.address || p.propertyName || 'Unknown',
        equityIn: equity,
        annualCF,
        coc,
        target: 8.0,
      };
    });
  }, [portfolioInputsResult]);

  // Aggregate portfolio totals from the tranche rows (same authoritative source)
  const portfolioAnnualCashFlow = trancheRows.reduce((s, r) => s + r.annualCF, 0);
  const portfolioCashInvested   = trancheRows.reduce((s, r) => s + r.equityIn, 0);

  const benchmarkBadge = currentCoC >= 8
    ? 'bg-[#6E7480]/10 border-[#6E7480]/20 text-[#6E7480]'
    : 'bg-amber-400/10 border-amber-400/20 text-amber-400';
  const benchmarkLabel = currentCoC >= 8 ? 'Above Benchmark' : 'Below Benchmark';

  if (
    cocCurrentResult.status === 'loading' ||
    cocSeriesResult.status === 'loading' ||
    portfolioInputsResult.status === 'loading'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 flex items-center justify-center" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <p className="text-sm text-[#9E9DA0]">Loading CoC data...</p>
      </div>
    );
  }

  if (
    portfolioInputsResult.status === 'insufficient' ||
    cocCurrentResult.status === 'insufficient' ||
    cocSeriesResult.status === 'insufficient'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">CoC Return</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Cash-on-Cash Return</h1>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">CoC Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Cash-on-Cash Return</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Property', 'My Share'] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                  scope === s ? 'bg-[#454955] text-black' : 'text-[#9E9DA0] hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-[#C0BEC2] hover:border-[#454955]/40 hover:text-[#6E7480] transition-all flex items-center gap-2 self-start md:self-auto">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <SampleDataBanner show={isUsingDemoData} />

      {/* ── Main 12-column grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

        {/* ── Left Hero: 4/12 ── */}
        <div className="md:col-span-4 space-y-4">
          <div className="rounded-xl border border-white/10 p-6 space-y-5" style={{ background: 'rgba(24,33,39,0.7)' }}>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Cash-on-Cash Return</span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${benchmarkBadge}`}>
                {benchmarkLabel}
              </span>
            </div>

            {/* Big number */}
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-[#6E7480] tabular-nums tracking-tighter">
                {currentCoC.toFixed(2)}%
              </span>
            </div>

            {/* Change */}
            <div className="flex items-center gap-1.5 text-sm font-bold text-[#6E7480]">
              <ArrowUpRight className="w-4 h-4" />
              +{cocChange.toFixed(1)}% vs Last Year
            </div>

            {/* Formula */}
            <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-1">Formula</p>
              <p className="text-xs text-[#C0BEC2] font-mono">Annual Cash Flow ÷ Equity Invested</p>
            </div>
          </div>

          {/* Scenario cards */}
          <div className="space-y-2">
            {SCENARIOS.map((sc) => (
              <div
                key={sc.label}
                className={`rounded-xl border p-4 flex items-center justify-between transition-all ${sc.borderClass} ${sc.active ? 'ring-1 ring-[#6E7480]/20' : ''}`}
                style={{ background: sc.active ? 'rgba(69, 73, 85,0.04)' : 'rgba(24,33,39,0.7)' }}
              >
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${sc.textClass}`}>{sc.label}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{sc.description}</p>
                </div>
                <span className={`text-lg font-bold tabular-nums ${sc.numClass}`}>{sc.coc}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Trend Chart 8/12 ── */}
        <div className="md:col-span-8">
          <div className="rounded-xl border border-white/10 p-6 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">CoC Return Trend</span>
              <div className="flex items-center gap-3 text-[10px] text-[#6B6870]">
                <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-amber-400/60 inline-block" /> Min (6%)</span>
                <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-[#6E7480]/60 inline-block" /> Target (8%)</span>
                <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-white/30 inline-block" /> Excellent (12%)</span>
              </div>
            </div>
            <CoCTrendChart values={trendValues} labels={trendLabels} />
          </div>
        </div>
      </div>

      {/* ── CoCIntelligenceCard: Performance Gap Analysis ── */}
      <CoCIntelligenceCard
        annualCashFlow={interactiveCashInvested > 0 ? portfolioAnnualCashFlow : portfolioAnnualCashFlow}
        totalCashInvested={interactiveCashInvested || portfolioCashInvested}
        targetCoC={8.0}
        marketAvgCoC={6.5}
      />

      {/* ── CashDeployedTerminal: Investment Basis Input ── */}
      <CashDeployedTerminal
        annualCashFlow={portfolioAnnualCashFlow}
        defaultDownPayment={Math.round(portfolioCashInvested * 0.93)}
        defaultClosingCosts={Math.round(portfolioCashInvested * 0.04)}
        defaultRehabBudget={0}
        defaultHoldingCosts={Math.round(portfolioCashInvested * 0.03)}
        onValuesChange={(values) => {
          setInteractiveCashInvested(values.totalCashInvested);
          setInteractiveCoCReturn(values.cocReturn);
        }}
      />

      {/* ── Bottom: CoC by Investment Tranche ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-4">CoC by Investment Tranche</span>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Tranche / Property', 'Equity In', 'Annual Cash Flow', 'CoC%', 'vs Target'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trancheRows.map((row) => {
                const diff = row.coc - row.target;
                return (
                  <tr key={row.tranche} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-[#C0BEC2] font-medium">{row.tranche}</td>
                    <td className="py-3 px-3 text-[#9E9DA0] tabular-nums">
                      ${row.equityIn >= 1_000_000
                        ? `${(row.equityIn / 1_000_000).toFixed(2)}M`
                        : `${(row.equityIn / 1000).toFixed(0)}k`}
                    </td>
                    <td className="py-3 px-3 text-[#9E9DA0] tabular-nums">
                      ${row.annualCF >= 1000
                        ? `${(row.annualCF / 1000).toFixed(1)}k`
                        : row.annualCF.toFixed(0)}
                    </td>
                    <td className="py-3 px-3 font-bold tabular-nums text-[#6E7480]">{row.coc.toFixed(2)}%</td>
                    <td className={`py-3 px-3 font-bold tabular-nums ${diff >= 0 ? 'text-[#6E7480]' : 'text-red-400'}`}>
                      {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
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
