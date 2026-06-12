'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { NOIWaterfallHero } from '@/components/intelligence/NOIWaterfallHero';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '@/lib/intelligence/selectors';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   NOI Detail — Trend & Composition Page
   12-column grid:
     Left  4/12: Hero NOI card + NOI composition stacked bars
     Right 8/12: ECharts area line chart — 12-month NOI trend
   Bottom: NOI Components table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

const defaultNoi        = 482910;
const defaultNoiChange = 12.4;

const defaultLabels = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
const defaultNoiTrend = [398000, 411000, 419000, 428000, 435000, 441000, 448000, 455000, 461000, 469000, 476000, 482910];

// Composition values
const defaultGrossRent  = 612000;
const defaultOtherInc   = 48000;
const defaultOpExp      = 177090;
// NOI = 612000 + 48000 - 177090 = 482910

/* ── NOI Composition Stacked Horizontal Bars ── */
function NOIComposition({
  grossRent,
  otherIncome,
  opExpenses,
  noi,
}: {
  grossRent: number;
  otherIncome: number;
  opExpenses: number;
  noi: number;
}) {
  const totalIncome = grossRent + otherIncome;
  const maxVal = totalIncome;

  const bars = [
    { label: 'Gross Rent',     value: grossRent,  color: '#454955', pct: (grossRent / maxVal) * 100 },
    { label: 'Other Income',   value: otherIncome, color: '#454955', pct: (otherIncome / maxVal) * 100 },
    { label: 'Operating Exp.', value: -opExpenses, color: '#F06543', pct: (opExpenses / maxVal) * 100 },
    { label: 'Net NOI',        value: noi,         color: '#454955', pct: (noi / maxVal) * 100, highlight: true },
  ];

  return (
    <div className="space-y-3.5">
      {bars.map((bar) => (
        <div key={bar.label}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${bar.highlight ? 'text-[#6E7480]' : 'text-[#9E9DA0]'}`}>
              {bar.label}
            </span>
            <span className={`text-sm font-bold tabular-nums ${bar.value < 0 ? 'text-red-400' : bar.highlight ? 'text-[#6E7480]' : 'text-white'}`}>
              {bar.value < 0 ? '-' : ''}${Math.abs(bar.value).toLocaleString()}
            </span>
          </div>
          <div
            className="h-2.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${bar.pct}%`,
                background: bar.value < 0 ? 'rgba(239,68,68,0.6)' : bar.highlight ? '#454955' : bar.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── NOI Area Trend Chart ── */
function NOITrendChart({ values, labels }: { values: number[]; labels: string[] }) {
  const lastVal  = values[values.length - 1];
  const lastIdx  = values.length - 1;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
      formatter: (params: any[]) =>
        `${params[0].axisValue}<br/>` +
        `<span style="color:#454955">─</span> NOI: <b>$${Number(params[0].value).toLocaleString()}</b>`,
    },
    grid: { top: 24, right: 16, bottom: 24, left: 0, containLabel: true },
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
        name: 'NOI',
        type: 'line',
        data: values,
        smooth: true,
        lineStyle: { width: 2.5, color: '#454955' },
        itemStyle: {
          color: (params: any) =>
            params.dataIndex === lastIdx ? '#454955' : 'transparent',
          borderWidth: (params: any) => (params.dataIndex === lastIdx ? 3 : 0),
          borderColor: '#454955',
        },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69, 73, 85,0.20)' },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
        symbol: (value: number, params: any) => (params.dataIndex === lastIdx ? 'circle' : 'none'),
        symbolSize: 9,
        markPoint: {
          data: [{ coord: [lastIdx, lastVal] }],
          symbol: 'circle',
          symbolSize: 9,
          itemStyle: { color: '#454955', borderColor: '#0d0a0b', borderWidth: 2 },
          label: { show: false },
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
            Import deal data or complete Purchase phase tasks to generate Net Operating Income analytics.
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

export default function NOIIntelligencePage() {
  useAllDealsSync();
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');

  const noiCurrentResult = useMetricCurrent('NOI', { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const noiSeriesResult = useMetricSeries('NOI', undefined, { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const portfolioInputsResult = usePortfolioInputs({ scope: scope === 'My Share' ? 'myShare' : 'property' });

  if (
    noiCurrentResult.status === 'loading' ||
    noiSeriesResult.status === 'loading' ||
    portfolioInputsResult.status === 'loading'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 flex items-center justify-center" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <p className="text-sm text-[#9E9DA0]">Loading NOI data...</p>
      </div>
    );
  }

  if (
    portfolioInputsResult.status === 'insufficient' ||
    noiCurrentResult.status === 'insufficient' ||
    noiSeriesResult.status === 'insufficient'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">NOI Detail</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">NOI Detail</h1>
          <p className="text-sm text-[#6B6870] mt-1">Net Operating Income — trend &amp; composition</p>
        </div>
        <EmptyState />
      </div>
    );
  }

  const {
    isUsingDemoData,
    currentNoi,
    noiChange,
    trendValues,
    trendLabels,
    grossRent,
    otherIncome,
    opExpenses,
    vacancyRate,
  } = useMemo(() => {
    // Rule 4: demo ONLY when no projects at all
    if (portfolioInputsResult.status === 'insufficient') {
      return {
        isUsingDemoData: true,
        currentNoi: defaultNoi,
        noiChange: defaultNoiChange,
        trendValues: defaultNoiTrend,
        trendLabels: defaultLabels,
        grossRent: defaultGrossRent,
        otherIncome: defaultOtherInc,
        opExpenses: defaultOpExp,
        vacancyRate: 0,
      };
    }
    if (
      noiSeriesResult.status === 'ready' &&
      noiCurrentResult.status === 'ready' &&
      portfolioInputsResult.status === 'ready' &&
      portfolioInputsResult.data.snapshots.length >= 2
    ) {
      const sorted = [...portfolioInputsResult.data.snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const noiVals = sorted.map((s) => s.noi ?? 0);
      const labels  = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last    = noiCurrentResult.data;
      const prev    = noiVals[noiVals.length - 2] ?? last;
      const pctChg  = prev !== 0 ? ((last - prev) / Math.abs(prev)) * 100 : 0;
      const latestSnap = sorted[sorted.length - 1];
      const vr = latestSnap.vacancyRate ?? 0;
      const gr = (latestSnap.grossRentalIncome ?? 0) * 12;
      const oe = (latestSnap.totalOperatingExpenses ?? 0) * 12;

      // Rule 2: otherIncome from snapshot: grossOperatingIncome - grossRentalIncome
      // gives the "other income" component stored in the snapshot; honest 0 if not tracked.
      // grossOperatingIncome = grossRentalIncome + otherIncome (per snapshotService.ts line 144)
      const goi = (latestSnap.grossOperatingIncome ?? 0) * 12;
      const oi  = Math.max(0, goi - gr);   // honest 0 when grossOperatingIncome not stored

      return {
        isUsingDemoData: false,
        currentNoi: last,
        noiChange: pctChg,
        trendValues: noiVals,
        trendLabels: labels,
        grossRent: gr,
        otherIncome: oi,  // honest 0 if not stored, not a back-calculated fiction
        opExpenses: oe,
        vacancyRate: vr,
      };
    }
    // Projects exist but no history yet — show live NOI without chart
    if (noiCurrentResult.status === 'ready') {
      return {
        isUsingDemoData: false,
        currentNoi: noiCurrentResult.data,
        noiChange: 0,
        trendValues: [],
        trendLabels: [],
        grossRent: 0,
        otherIncome: 0,
        opExpenses: 0,
        vacancyRate: 0,
      };
    }
    return {
      isUsingDemoData: false,
      currentNoi: 0,
      noiChange: 0,
      trendValues: [],
      trendLabels: [],
      grossRent: 0,
      otherIncome: 0,
      opExpenses: 0,
      vacancyRate: 0,
    };
  }, [noiSeriesResult, noiCurrentResult, portfolioInputsResult]);

  const fmt = (n: number) => `$${n.toLocaleString()}`;

  const derivedComponents = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return {
        grossRentalIncome: 0,
        otherIncome: 0,
        vacancyLoss: 0,
        propertyTaxes: 0,
        insurance: 0,
        utilities: 0,
        propertyManagement: 0,
        maintenance: 0,
        hoa: 0,
        totalOperatingExpenses: 0,
        noi: 0,
      };
    }
    const projects = portfolioInputsResult.data.projects;
    let gr = 0, oi = 0, vl = 0, pt = 0, ins = 0, ut = 0, pm = 0, mt = 0, h = 0, oe = 0, n = 0;

    for (const p of projects) {
      const financials = p.financials || {};
      const factor = scope === 'My Share' ? (financials.ownershipPercentage ?? 100) / 100 : 1;
      const comp = deriveAllMetrics(financials, undefined, p.strategyType, p.currentPhase).noiComponents;

      gr += comp.grossRentalIncome * factor;
      oi += comp.otherIncome * factor;
      vl += comp.vacancyLoss * factor;
      pt += comp.propertyTaxes * factor;
      ins += comp.insurance * factor;
      ut += comp.utilities * factor;
      pm += comp.propertyManagement * factor;
      mt += comp.maintenance * factor;
      h += comp.hoa * factor;
      oe += comp.totalOperatingExpenses * factor;
      n += comp.noi * factor;
    }

    return {
      grossRentalIncome: Math.round(gr),
      otherIncome: Math.round(oi),
      vacancyLoss: Math.round(vl),
      propertyTaxes: Math.round(pt),
      insurance: Math.round(ins),
      utilities: Math.round(ut),
      propertyManagement: Math.round(pm),
      maintenance: Math.round(mt),
      hoa: Math.round(h),
      totalOperatingExpenses: Math.round(oe),
      noi: Math.round(n),
    };
  }, [portfolioInputsResult, scope]);

  // NOI components table rows
  const incomeRows = [
    { label: 'Gross Rental Income', value: derivedComponents.grossRentalIncome, type: 'income' as const },
    { label: 'Parking / Other',     value: derivedComponents.otherIncome,         type: 'income' as const },
  ];
  const expenseRows = [
    { label: 'Property Taxes',      value: derivedComponents.propertyTaxes,      type: 'expense' as const },
    { label: 'Insurance',           value: derivedComponents.insurance,          type: 'expense' as const },
    { label: 'Utilities',           value: derivedComponents.utilities,          type: 'expense' as const },
    { label: 'Property Management', value: derivedComponents.propertyManagement, type: 'expense' as const },
    { label: 'Maintenance',         value: derivedComponents.maintenance,         type: 'expense' as const },
    { label: 'HOA',                 value: derivedComponents.hoa,                 type: 'expense' as const },
  ];

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">NOI Detail</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">NOI Detail</h1>
          <p className="text-sm text-[#6B6870] mt-1">Net Operating Income — trend &amp; composition</p>
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

      {/* ── Main 12-column grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

        {/* ── Left 4/12: Hero + Composition ── */}
        <div className="md:col-span-4 space-y-4">

          {/* Hero NOI Card */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">
                Annual NOI
              </span>
              <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${noiChange >= 0 ? 'text-[#6E7480]' : 'text-red-400'}`}>
                {noiChange >= 0 ? '+' : ''}{noiChange.toFixed(1)}%
                <ArrowUpRight className={`w-3.5 h-3.5 ${noiChange < 0 ? 'rotate-180' : ''}`} />
              </div>
            </div>

            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-5xl font-bold text-[#6E7480] tabular-nums tracking-tighter leading-none">
                {fmt(currentNoi)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded border border-[#6E7480]/20 bg-[#6E7480]/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7480] animate-pulse" />
                <span className="text-[9px] font-extrabold tracking-widest text-[#6E7480]">LIVE</span>
              </div>
              <span className="text-xs text-[#6B6870]">Portfolio-wide</span>
            </div>
          </div>

          {/* NOI Composition Bars */}
          <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-4">
              NOI Composition
            </span>
            <NOIComposition
              grossRent={grossRent}
              otherIncome={otherIncome}
              opExpenses={opExpenses}
              noi={currentNoi}
            />
          </div>
        </div>

        {/* ── Right 8/12: Trend Chart ── */}
        <div className="md:col-span-8">
          <div className="rounded-xl border border-white/10 p-6 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">
                12-Month NOI Trend
              </span>
            </div>
            <NOITrendChart values={trendValues} labels={trendLabels} />

            {/* Summary stats row */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/[0.06]">
              {[
                { label: 'Peak NOI',  value: fmt(Math.max(...trendValues)) },
                { label: 'Low NOI',   value: fmt(Math.min(...trendValues)) },
                { label: 'Avg NOI',   value: fmt(Math.round(trendValues.reduce((a, b) => a + b, 0) / trendValues.length)) },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <span className="text-[10px] text-[#6B6870] font-semibold uppercase tracking-widest block">{stat.label}</span>
                  <span className="text-sm font-bold text-white tabular-nums mt-0.5">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── NOI Waterfall Hero (Stitch Design Integration) ── */}
      <NOIWaterfallHero
        noiComponents={derivedComponents}
      />

      {/* ── Bottom: NOI Components Table ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-5">
          NOI Components Breakdown
        </span>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">Line Item</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">Annual Amount</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">% of Gross Income</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">Type</th>
              </tr>
            </thead>
            <tbody>
              {/* Income section */}
              <tr>
                <td colSpan={4} className="py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6E7480]/70 border-b border-white/[0.04]">
                  Income Sources
                </td>
              </tr>
              {incomeRows.map((row) => {
                const totalGross = grossRent + otherIncome;
                const pct = ((row.value / totalGross) * 100).toFixed(1);
                return (
                  <tr key={row.label} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">{row.label}</td>
                    <td className="py-3 px-3 text-right text-[#6E7480] tabular-nums font-bold">{fmt(row.value)}</td>
                    <td className="py-3 px-3 text-right text-[#9E9DA0] tabular-nums">{pct}%</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-[#6E7480] bg-[#6E7480]/10">
                        Income
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Expenses section */}
              <tr>
                <td colSpan={4} className="py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-red-400/70 border-b border-white/[0.04]">
                  Operating Expenses
                </td>
              </tr>
              {expenseRows.map((row) => {
                const totalGross = grossRent + otherIncome;
                const pct = ((row.value / totalGross) * 100).toFixed(1);
                return (
                  <tr key={row.label} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">{row.label}</td>
                    <td className="py-3 px-3 text-right text-red-400/80 tabular-nums font-bold">({fmt(row.value)})</td>
                    <td className="py-3 px-3 text-right text-[#9E9DA0] tabular-nums">{pct}%</td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10">
                        Expense
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Net NOI row */}
              <tr className="border-t-2 border-[#6E7480]/20">
                <td className="py-4 px-3 font-extrabold text-[#6E7480] text-base">Net Operating Income</td>
                <td className="py-4 px-3 text-right text-[#6E7480] tabular-nums font-extrabold text-base">{fmt(currentNoi)}</td>
                <td className="py-4 px-3 text-right text-[#6E7480]/70 tabular-nums font-bold">
                  {(((grossRent + otherIncome - opExpenses) / (grossRent + otherIncome)) * 100).toFixed(1)}%
                </td>
                <td className="py-4 px-3 text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-[#6E7480] bg-[#6E7480]/15">
                    NET NOI
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
