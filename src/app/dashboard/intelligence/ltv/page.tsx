'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '@/lib/intelligence/selectors';

/* ═══════════════════════════════════════════════════════════════
   LTV Risk Analysis Page
   12-column grid:
     Left  4/12: Current LTV card + Radial SVG circle gauge
     Right 8/12: ECharts dual-line Trajectory Projection chart
   Bottom: LTV by Property table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

/* ── Radial SVG Circle Gauge ── */
function LTVGauge({ value }: { value: number }) {
  // value is a percentage 0–100
  const cx = 50, cy = 50, r = 38;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * r;
  // Gauge goes from -135deg to +135deg (270 deg sweep)
  const sweepDeg = 270;
  const dashTotal = (sweepDeg / 360) * circumference;
  const fillDash  = (Math.min(value, 100) / 100) * dashTotal;

  // Rotation offset: start at 135deg from top (-90 - 135 = -225deg from positive x axis, i.e. 135deg clockwise from top)
  const rotation = 135; // degrees

  const zoneColor =
    value < 65  ? '#454955' :
    value < 80  ? '#f59e0b' :
                  '#F06543';

  // Threshold tick positions on the circle
  // 65% of 270deg sweep = 175.5deg from start angle
  const startAngleDeg = 135; // degrees clockwise from top (positive y axis)
  const tickAngle65  = startAngleDeg + (65 / 100) * sweepDeg;
  const tickAngle80  = startAngleDeg + (80 / 100) * sweepDeg;
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const tickOuter = (deg: number) => ({ x: cx + (r + 4) * Math.cos(toRad(deg)), y: cy + (r + 4) * Math.sin(toRad(deg)) });
  const tickInner = (deg: number) => ({ x: cx + (r - 4) * Math.cos(toRad(deg)), y: cy + (r - 4) * Math.sin(toRad(deg)) });

  const t65o = tickOuter(tickAngle65);
  const t65i = tickInner(tickAngle65);
  const t80o = tickOuter(tickAngle80);
  const t80i = tickInner(tickAngle80);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: `rotate(${rotation}deg)` }}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashTotal} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Fill arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={zoneColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${fillDash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.7s ease, stroke 0.4s ease' }}
          />
          {/* Threshold ticks */}
          <line x1={t65i.x} y1={t65i.y} x2={t65o.x} y2={t65o.y} stroke="#f59e0b" strokeWidth="1.5" />
          <line x1={t80i.x} y1={t80i.y} x2={t80o.x} y2={t80o.y} stroke="#F06543" strokeWidth="1.5" />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums" style={{ color: zoneColor }}>
            {value.toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#6B6870] font-semibold uppercase tracking-wider mt-0.5">LTV</span>
        </div>
      </div>

      {/* Zone labels */}
      <div className="grid grid-cols-3 gap-1 w-full mt-2">
        {[
          { label: 'Safe',   range: '< 65%',   color: '#454955', active: value < 65 },
          { label: 'Target', range: '65–80%',  color: '#f59e0b', active: value >= 65 && value < 80 },
          { label: 'High',   range: '> 80%',   color: '#F06543', active: value >= 80 },
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

/* ── Dual-Line Trajectory Chart ── */
function TrajectoryChart({
  labels,
  loanData,
  valueData,
  splitIndex,
}: {
  labels: string[];
  loanData: number[];
  valueData: number[];
  splitIndex: number;
}) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
      formatter: (params: any[]) =>
        `${params[0].axisValue}<br/>` +
        params
          .map((p: any) => `<span style="color:${p.color}">─</span> ${p.seriesName}: <b>$${Number(p.value).toLocaleString()}</b>`)
          .join('<br/>'),
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
      axisLabel: { color: '#64748b', fontSize: 9, interval: 2 },
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
        name: 'Property Value',
        type: 'line',
        data: valueData,
        smooth: true,
        lineStyle: { width: 2.5, color: '#454955' },
        itemStyle: { color: '#454955' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69, 73, 85,0.12)' },
              { offset: 1, color: 'transparent' },
            ],
          },
        },
        symbol: 'none',
        markArea: {
          silent: true,
          data: [[
            { xAxis: labels[splitIndex], itemStyle: { color: 'rgba(255,255,255,0.02)' } },
            { xAxis: labels[labels.length - 1] },
          ]],
        },
      },
      {
        name: 'Loan Balance',
        type: 'line',
        data: loanData,
        smooth: true,
        lineStyle: { width: 2, color: 'rgba(148,163,184,0.6)', type: 'dashed' },
        itemStyle: { color: 'rgba(148,163,184,0.6)' },
        symbol: 'none',
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(22,19,24,0.4)' }}>
      <div className="flex flex-col items-center justify-center gap-4 text-center border border-dashed border-white/10 rounded-xl p-12 min-h-[300px]">
        <ArrowUpRight className="w-12 h-12 text-slate-600" strokeWidth={1} />
        <div>
          <p className="text-sm font-semibold text-[#C0BEC2] mb-1">Awaiting Portfolio Data</p>
          <p className="text-xs text-[#6B6870] max-w-xs leading-relaxed">
            Import deal data or complete Purchase phase tasks to generate LTV Risk analytics.
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

export default function LTVIntelligencePage() {
  useAllDealsSync();
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');

  // Rule 5: scope threaded consistently to all three selectors
  const selectorScope = scope === 'My Share' ? 'myShare' : 'property';
  const ltvSeriesResult = useMetricSeries('LTV', undefined, { scope: selectorScope });
  const ltvCurrentResult = useMetricCurrent('LTV', { scope: selectorScope });
  const portfolioInputsResult = usePortfolioInputs({ scope: selectorScope });

  const propertiesTableData = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return [];
    }
    const projects = portfolioInputsResult.data.projects;
    const validProjects = projects.filter((p) => (p.financials?.purchasePrice ?? (0)) > 0);
    return validProjects.map((p) => {
      const value = p.financials?.arv ?? p.financials?.estimatedARV ?? p.financials?.purchasePrice ?? (0);
      const loan = p.financials?.loanAmount ?? (0);
      const ltv = value > 0 ? (loan / value) * 100 : 0;
      return {
        address: p.address || p.propertyName || 'Unknown Property',
        value,
        loan,
        ltv,
        status: ltv < 65 ? 'Safe' : ltv < 80 ? 'Target' : 'High Risk',
      };
    });
  }, [portfolioInputsResult]);

  const { isUsingDemoData, currentLtv, ltvChange, chartLabels, loanSeries, valueSeries, splitIndex } = useMemo(() => {
    if (ltvSeriesResult.status === 'ready' && ltvCurrentResult.status === 'ready' && portfolioInputsResult.status === 'ready') {
      const snapshots = portfolioInputsResult.data.snapshots;
      const sorted = [...snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const ltvVals  = sorted.map((s) => s.ltv ?? 0);
      const loanVals = sorted.map((s) => s.loanAmount ?? 0);
      const valVals  = sorted.map((s) => s.propertyValue ?? 0);
      const labels   = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last = ltvCurrentResult.data;
      const prev = ltvVals[ltvVals.length - 2] ?? last;
      return {
        isUsingDemoData: false,
        currentLtv: last,
        ltvChange: last - prev,
        chartLabels: labels,
        loanSeries: loanVals,
        valueSeries: valVals,
        splitIndex: sorted.length - 1,
      };
    }
    return {
      isUsingDemoData: false,
      currentLtv: 0,
      ltvChange: 0,
      chartLabels: [],
      loanSeries: [],
      valueSeries: [],
      splitIndex: 0,
    };
  }, [ltvSeriesResult, ltvCurrentResult, portfolioInputsResult]);

  const fmtDollar = (n: number) => `$${n.toLocaleString()}`;
  const ltvStatusLabel = (ltv: number) =>
    ltv < 65 ? 'Safe' : ltv < 80 ? 'Target' : 'High Risk';
  const ltvStatusColor = (ltv: number) =>
    ltv < 65 ? '#454955' : ltv < 80 ? '#f59e0b' : '#F06543';

  if (
    ltvCurrentResult.status === 'loading' ||
    ltvSeriesResult.status === 'loading' ||
    portfolioInputsResult.status === 'loading'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 flex items-center justify-center" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <p className="text-sm text-[#9E9DA0]">Loading LTV data...</p>
      </div>
    );
  }

  if (
    portfolioInputsResult.status === 'insufficient' ||
    ltvCurrentResult.status === 'insufficient' ||
    ltvSeriesResult.status === 'insufficient'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">LTV Risk Analysis</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">LTV Risk Analysis</h1>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">LTV Risk Analysis</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">LTV Risk Analysis</h1>
          <p className="text-sm text-[#6B6870] mt-1">Loan-to-Value — equity cushion &amp; refinance readiness</p>
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

        {/* ── Left 4/12: Hero + Gauge ── */}
        <div className="md:col-span-4 space-y-4">

          {/* Hero LTV Card */}
          <div className="rounded-xl border border-white/10 p-6 relative overflow-hidden" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">
                Loan-to-Value (LTV)
              </span>
              <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${ltvChange <= 0 ? 'text-[#6E7480]' : 'text-amber-400'}`}>
                {ltvChange >= 0 ? '+' : ''}{ltvChange.toFixed(1)}% vs Last Month
                <ArrowUpRight className={`w-3.5 h-3.5 ${ltvChange > 0 ? '' : 'rotate-180'}`} />
              </div>
            </div>
            <div className="text-[10px] text-[#6B6870] mb-4">
              {ltvChange <= 0 ? 'LTV decreasing — equity building' : 'LTV increasing — monitor leverage'}
            </div>

            {/* Radial Gauge */}
            <LTVGauge value={currentLtv} />
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-white/10 p-5" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-3">
              Portfolio Snapshot
            </span>
            <div className="space-y-3">
              {[
                { label: 'Avg LTV',        value: `${currentLtv.toFixed(1)}%` },
                { label: 'Total Loan',     value: fmtDollar(loanSeries[splitIndex] ?? (0)) },
                { label: 'Total Value',    value: fmtDollar(valueSeries[splitIndex] ?? (0)) },
                { label: 'Implied Equity', value: fmtDollar(Math.max(0, (valueSeries[splitIndex] ?? (0)) - (loanSeries[splitIndex] ?? (0)))) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-[#6B6870]">{item.label}</span>
                  <span className="text-sm font-bold text-white tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right 8/12: Trajectory Projection Chart ── */}
        <div className="md:col-span-8">
          <div className="rounded-xl border border-white/10 p-6 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">
                Trajectory Projection
              </span>
              <div className="flex items-center gap-3 text-[10px] text-[#6B6870] font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-0.5 inline-block rounded" style={{ background: '#454955' }} />
                  Property Value
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-0.5 inline-block rounded" style={{ borderTop: '2px dashed rgba(148,163,184,0.6)' }} />
                  Loan Balance
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 mb-4">
              Shaded area = projected months. Convergence indicates target exit LTV.
            </p>
            <TrajectoryChart
              labels={chartLabels}
              loanData={loanSeries}
              valueData={valueSeries}
              splitIndex={splitIndex}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom: LTV by Property Table ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">
            LTV by Property
          </span>
          <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
            {propertiesTableData.length} properties
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">Address</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">Property Value</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">Loan Balance</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">LTV%</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">Status</th>
              </tr>
            </thead>
            <tbody>
              {propertiesTableData.map((prop) => {
                const color = ltvStatusColor(prop.ltv);
                const label = ltvStatusLabel(prop.ltv);
                return (
                  <tr key={prop.address} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">{prop.address}</td>
                    <td className="py-3 px-3 text-right text-[#C0BEC2] tabular-nums">{fmtDollar(prop.value)}</td>
                    <td className="py-3 px-3 text-right text-[#C0BEC2] tabular-nums">{fmtDollar(prop.loan)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold tabular-nums" style={{ color }}>
                        {prop.ltv.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          color,
                          background: prop.ltv < 65
                            ? 'rgba(69, 73, 85,0.1)'
                            : prop.ltv < 80
                            ? 'rgba(245,158,11,0.1)'
                            : 'rgba(239,68,68,0.1)',
                        }}
                      >
                        {label}
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
