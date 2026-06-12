'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '@/lib/intelligence/selectors';
import { DebtServiceInputForm } from '@/components/intelligence/DebtServiceInputForm';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   Cash Flow Detail — Diverging Trend Page
   Top row hero card (full width)
   Main chart: full-width diverging bar (inflow above / outflow below zero)
   Second row: Cash Flow by Category donut + Stats table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

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
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
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
      textStyle: { color: '#9E9DA0', fontSize: 10 },
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
        formatter: (v: number) => `$${(Math.abs(v) / 1000).toFixed(0)}k`,
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
        itemStyle: { color: '#454955', borderRadius: [3, 3, 0, 0] },
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
function CategoryDonut({
  rentIncome,
  otherIncome,
  expenses,
  debtService,
}: {
  rentIncome: number;
  otherIncome: number;
  expenses: number;
  debtService: number;
}) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
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
          { value: rentIncome, name: 'Rent Income',    itemStyle: { color: '#454955' } },
          { value: otherIncome,  name: 'Other Income',   itemStyle: { color: '#454955' } },
          { value: expenses, name: 'Expenses',       itemStyle: { color: 'rgba(239,68,68,0.55)' } },
          { value: debtService, name: 'Debt Interest',  itemStyle: { color: 'rgba(245,158,11,0.55)' } },
        ].map((d) => ({ ...d, value: Math.abs(d.value) })),
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 200, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(22,19,24,0.4)' }}>
      <div className="flex flex-col items-center justify-center gap-4 text-center border border-dashed border-white/10 rounded-xl p-12 min-h-[300px]">
        <TrendingUp className="w-12 h-12 text-slate-600" strokeWidth={1} />
        <div>
          <p className="text-sm font-semibold text-[#C0BEC2] mb-1">Awaiting Portfolio Data</p>
          <p className="text-xs text-[#6B6870] max-w-xs leading-relaxed">
            Import deal data or complete Purchase phase tasks to generate Cash Flow analytics.
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

export default function CashFlowIntelligencePage() {
  useAllDealsSync();
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');

  const cfCurrentResult = useMetricCurrent('CASH_FLOW', { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const cfSeriesResult = useMetricSeries('CASH_FLOW', undefined, { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const portfolioInputsResult = usePortfolioInputs({ scope: scope === 'My Share' ? 'myShare' : 'property' });
  const noiCurrentResult = useMetricCurrent('NOI', { scope: scope === 'My Share' ? 'myShare' : 'property' });
  if (
    cfCurrentResult.status === 'loading' ||
    cfSeriesResult.status === 'loading' ||
    portfolioInputsResult.status === 'loading' ||
    noiCurrentResult.status === 'loading'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 flex items-center justify-center" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <p className="text-sm text-[#9E9DA0]">Loading Cash Flow data...</p>
      </div>
    );
  }

  if (
    portfolioInputsResult.status === 'insufficient' ||
    cfCurrentResult.status === 'insufficient' ||
    cfSeriesResult.status === 'insufficient' ||
    noiCurrentResult.status === 'insufficient'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">Cash Flow Detail</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Cash Flow Detail</h1>
        </div>
        <EmptyState />
      </div>
    );
  }

  const { isUsingDemoData, netCashFlow, cfChange, chartLabels, inflowBars, outflowBars, sparkline, stats } = useMemo(() => {
    if (
      cfSeriesResult.status === 'ready' &&
      cfCurrentResult.status === 'ready' &&
      portfolioInputsResult.status === 'ready' &&
      portfolioInputsResult.data.snapshots.length >= 2
    ) {
      const sorted = [...portfolioInputsResult.data.snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const labels  = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const mcfVals = sorted.map((s) => s.monthlyCashFlow ?? (0));
      const inflows = mcfVals.map((v) => (v > 0 ? v : 0));
      const outflows = mcfVals.map((v) => (v < 0 ? v : 0));
      const last = cfCurrentResult.data;
      const prev = mcfVals[mcfVals.length - 2] ?? last;
      const pctChg = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;
      const spark = mcfVals.slice(-7);
      const ytd   = sorted.reduce((acc, s) => acc + (s.monthlyCashFlow ?? (0)), 0);
      const avg   = ytd / sorted.length;
      const best  = Math.max(...mcfVals);
      const worst = Math.min(...mcfVals);
      return {
        isUsingDemoData: false,
        netCashFlow: last,
        cfChange: pctChg,
        chartLabels: labels,
        inflowBars: inflows,
        outflowBars: outflows,
        sparkline: spark,
        stats: { avg, best, worst, ytd },
      };
    }
    return {
      isUsingDemoData: false,
      netCashFlow: 0,
      cfChange: 0,
      chartLabels: [],
      inflowBars: [],
      outflowBars: [],
      sparkline: [],
      stats: { avg: 0, best: 0, worst: 0, ytd: 0 },
    };
  }, [cfSeriesResult, cfCurrentResult, portfolioInputsResult]);

  /* ── Portfolio NOI (distinct from cash flow) ── */
  const portfolioNoi = useMemo(() => {
    if (noiCurrentResult.status === 'ready') {
      return noiCurrentResult.data;
    }
    return 0; // honest: no data yet, do not seed a demo value
  }, [noiCurrentResult]);

  const categoryBreakdown = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return { rentIncome: 0, otherIncome: 0, expenses: 0, debtService: 0 };
    }
    let rentIncome = 0;
    let otherIncome = 0;
    let expenses = 0;
    let debtService = 0;

    const projects = portfolioInputsResult.data.projects;
    for (const p of projects) {
      const financials = p.financials || {};
      const factor = scope === 'My Share' ? (financials.ownershipPercentage ?? 100) / 100 : 1;
      const derived = deriveAllMetrics(financials, undefined, p.strategyType, p.currentPhase);
      rentIncome += (derived.noiComponents.grossRentalIncome || 0) * factor;
      otherIncome += (derived.noiComponents.otherIncome || 0) * factor;
      expenses += (derived.noiComponents.totalOperatingExpenses || 0) * factor;
      debtService += (derived.annualDebtService || 0) * factor;
    }

    return {
      rentIncome: Math.round(rentIncome),
      otherIncome: Math.round(otherIncome),
      expenses: Math.round(expenses),
      debtService: Math.round(debtService),
    };
  }, [portfolioInputsResult, scope]);

  const monthlyBreakdown = useMemo(() => {
    return {
      rentIncome: categoryBreakdown.rentIncome / 12,
      otherIncome: categoryBreakdown.otherIncome / 12,
      expenses: categoryBreakdown.expenses / 12,
      debtService: categoryBreakdown.debtService / 12,
    };
  }, [categoryBreakdown]);


  const fmt = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString()}`;

  // Fill bar for hero card — map netCashFlow to 0–100% (assume max meaningful CF ~$20k)
  const fillPct = Math.min(Math.max((netCashFlow / 20000) * 100, 0), 100);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">Cash Flow Detail</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Cash Flow Detail</h1>
          <p className="text-sm text-[#6B6870] mt-1">Diverging inflow / outflow trend analysis</p>
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
              >{s}</button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Month', 'Quarter', 'Year', 'Overall'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  period === p ? 'bg-white/10 text-[#6E7480] font-bold' : 'text-[#9E9DA0] hover:text-slate-200'
                }`}
              >{p}</button>
            ))}
          </div>
          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-[#C0BEC2] hover:border-[#454955]/40 hover:text-[#6E7480] transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <SampleDataBanner show={isUsingDemoData} />

      {/* ── Hero Card (full width) ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: primary number */}
          <div className="flex items-center gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Net Cash Flow</span>
                <div className="px-2 py-0.5 rounded border border-[#6E7480]/20 bg-[#6E7480]/10 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6E7480] animate-pulse" />
                  <span className="text-[9px] font-extrabold tracking-widest text-[#6E7480]">LIVE</span>
                </div>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-[#6E7480] tabular-nums tracking-tighter">
                  {fmt(netCashFlow)}
                </span>
                <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${cfChange >= 0 ? 'text-[#6E7480]' : 'text-red-400'}`}>
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
                  const range = maxV - minV || (1);
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
                      fill={isFull ? '#454955' : 'rgba(69, 73, 85,0.25)'}
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Right: fill bar */}
          <div className="flex-1 max-w-xs">
            <div className="flex justify-between text-[10px] text-[#6B6870] font-semibold mb-1.5">
              <span>Monthly Progress</span>
              <span>{fillPct.toFixed(0)}%</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${fillPct}%`, background: '#454955' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Diverging Bar Chart (full width) ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">
            Monthly Cash Flow — Inflow vs Outflow
          </span>
          <div className="flex items-center gap-3 text-[10px] text-[#6B6870] font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block" style={{ background: '#454955' }} />
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
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-3">
            Cash Flow by Category
          </span>
          <CategoryDonut
            rentIncome={monthlyBreakdown.rentIncome}
            otherIncome={monthlyBreakdown.otherIncome}
            expenses={monthlyBreakdown.expenses}
            debtService={monthlyBreakdown.debtService}
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              { label: 'Rent Income',   value: monthlyBreakdown.rentIncome, color: '#454955' },
              { label: 'Other Income',  value: monthlyBreakdown.otherIncome, color: '#454955' },
              { label: 'Expenses',      value: monthlyBreakdown.expenses, color: 'rgba(239,68,68,0.7)' },
              { label: 'Debt Interest', value: monthlyBreakdown.debtService, color: 'rgba(245,158,11,0.7)' },
            ].map((item) => {
              const total = monthlyBreakdown.rentIncome + monthlyBreakdown.otherIncome + monthlyBreakdown.expenses + monthlyBreakdown.debtService;
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-[#9E9DA0]">{item.label}</span>
                  <span className="text-xs font-bold text-white ml-auto tabular-nums">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Table */}
        <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-4">
            Cash Flow Trend Stats
          </span>
          <div className="space-y-3">
            {[
              { label: 'Monthly Average', value: fmt(stats.avg), highlight: false },
              { label: 'Best Month',      value: fmt(stats.best), highlight: true, color: '#454955' },
              { label: 'Worst Month',     value: fmt(stats.worst), highlight: true, color: '#F06543' },
              { label: 'YTD Total',       value: fmt(stats.ytd), highlight: true, color: '#454955' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3 border-b border-white/[0.05]">
                <span className="text-sm text-[#9E9DA0]">{row.label}</span>
                <span
                  className="text-base font-bold tabular-nums"
                  style={{ color: row.highlight ? row.color : '#9E9DA0' }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6B6870]">Trend Direction</span>
              <div className="flex items-center gap-1 text-[#6E7480] text-xs font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Net Positive
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Debt Service Calculator Form ── */}
      <DebtServiceInputForm
        noi={portfolioNoi}
        defaultLoanAmount={223200}
        defaultRate={6.5}
        defaultTerm={30}
      />

    </div>
  );
}
