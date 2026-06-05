'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';

/* ═══════════════════════════════════════════════════════════════
   LTV Risk Analysis Page
   12-column grid:
     Left  4/12: Current LTV card + Radial SVG circle gauge
     Right 8/12: ECharts dual-line Trajectory Projection chart
   Bottom: LTV by Property table
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Month' | 'Quarter' | 'Year' | 'Overall';
type Scope  = 'Property' | 'My Share';

const DEMO_LTV = 68.5;
const DEMO_LTV_CHANGE = -1.2;

// Demo trajectory: loan balance decreasing, property value appreciating — 12 periods
const DEMO_MONTHS_LABELS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
const DEMO_LOAN_BALANCE   = [275000, 272000, 269000, 266000, 263000, 260000, 257000, 254000, 251000, 248000, 245000, 242000];
const DEMO_PROPERTY_VALUE = [485000, 491000, 497000, 503000, 509000, 516000, 522000, 528000, 533000, 538000, 542000, 545000];

// Projection data — 12 more months ahead
const DEMO_PROJ_LABELS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr',
                          'May+1', 'Jun+1', 'Jul+1', 'Aug+1', 'Sep+1', 'Oct+1', 'Nov+1', 'Dec+1', 'Jan+2', 'Feb+2', 'Mar+2', 'Apr+2'];
const DEMO_LOAN_PROJ   = [...DEMO_LOAN_BALANCE,  239000, 236000, 233000, 230000, 227000, 224000, 221000, 218000, 215000, 213000, 211000, 210000];
const DEMO_VALUE_PROJ  = [...DEMO_PROPERTY_VALUE, 549000, 554000, 559000, 564000, 569000, 575000, 581000, 587000, 592000, 597000, 602000, 607000];

const DEMO_PROPERTIES = [
  { address: '421 Oak St, Brooklyn',  value: 545000, loan: 320000, ltv: 58.7, status: 'Safe'     },
  { address: '1248 Oakwood Ave',       value: 420000, loan: 287900, ltv: 68.5, status: 'Target'   },
  { address: '77 Prospect Heights',    value: 890000, loan: 712000, ltv: 80.0, status: 'Target'   },
  { address: '310 Atlantic Ave',       value: 310000, loan: 264000, ltv: 85.2, status: 'High Risk' },
];

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
    value < 65  ? '#20B2AA' :
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
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">LTV</span>
        </div>
      </div>

      {/* Zone labels */}
      <div className="grid grid-cols-3 gap-1 w-full mt-2">
        {[
          { label: 'Safe',   range: '< 65%',   color: '#20B2AA', active: value < 65 },
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
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
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
      textStyle: { color: '#bacac5', fontSize: 10 },
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
        lineStyle: { width: 2.5, color: '#20B2AA' },
        itemStyle: { color: '#20B2AA' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(32, 178, 170,0.12)' },
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

export default function LTVIntelligencePage() {
  useAllDealsSync();
  useProjectStore((s) => s.projects);
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');
  const { snapshots } = usePortfolioMetricSnapshots('monthly');

  const { isUsingDemoData, currentLtv, ltvChange, chartLabels, loanSeries, valueSeries, splitIndex } = useMemo(() => {
    if (snapshots && snapshots.length >= 2) {
      const sorted = [...snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const ltvVals  = sorted.map((s) => s.ltv ?? 0);
      const loanVals = sorted.map((s) => s.loanAmount ?? 0);
      const valVals  = sorted.map((s) => s.propertyValue ?? 0);
      const labels   = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last = ltvVals[ltvVals.length - 1];
      const prev = ltvVals[ltvVals.length - 2];
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
      isUsingDemoData: true,
      currentLtv: DEMO_LTV,
      ltvChange: DEMO_LTV_CHANGE,
      chartLabels: DEMO_PROJ_LABELS,
      loanSeries: DEMO_LOAN_PROJ,
      valueSeries: DEMO_VALUE_PROJ,
      splitIndex: DEMO_LOAN_BALANCE.length - 1,
    };
  }, [snapshots]);

  const fmtDollar = (n: number) => `$${n.toLocaleString()}`;
  const ltvStatusLabel = (ltv: number) =>
    ltv < 65 ? 'Safe' : ltv < 80 ? 'Target' : 'High Risk';
  const ltvStatusColor = (ltv: number) =>
    ltv < 65 ? '#20B2AA' : ltv < 80 ? '#f59e0b' : '#F06543';

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">LTV Risk Analysis</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">LTV Risk Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">Loan-to-Value — equity cushion &amp; refinance readiness</p>
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

        {/* ── Left 4/12: Hero + Gauge ── */}
        <div className="md:col-span-4 space-y-4">

          {/* Hero LTV Card */}
          <div className="rounded-xl border border-white/10 p-6 relative overflow-hidden" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Loan-to-Value (LTV)
              </span>
              <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${ltvChange <= 0 ? 'text-teal-400' : 'text-amber-400'}`}>
                {ltvChange >= 0 ? '+' : ''}{ltvChange.toFixed(1)}% vs Last Month
                <ArrowUpRight className={`w-3.5 h-3.5 ${ltvChange > 0 ? '' : 'rotate-180'}`} />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mb-4">
              {ltvChange <= 0 ? 'LTV decreasing — equity building' : 'LTV increasing — monitor leverage'}
            </div>

            {/* Radial Gauge */}
            <LTVGauge value={currentLtv} />
          </div>

          {/* Quick stats */}
          <div className="rounded-xl border border-white/10 p-5" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-3">
              Portfolio Snapshot
            </span>
            <div className="space-y-3">
              {[
                { label: 'Avg LTV',        value: `${currentLtv.toFixed(1)}%` },
                { label: 'Total Loan',     value: fmtDollar(DEMO_LOAN_BALANCE[DEMO_LOAN_BALANCE.length - 1]) },
                { label: 'Total Value',    value: fmtDollar(DEMO_PROPERTY_VALUE[DEMO_PROPERTY_VALUE.length - 1]) },
                { label: 'Implied Equity', value: fmtDollar(DEMO_PROPERTY_VALUE[DEMO_PROPERTY_VALUE.length - 1] - DEMO_LOAN_BALANCE[DEMO_LOAN_BALANCE.length - 1]) },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{item.label}</span>
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
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Trajectory Projection
              </span>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span className="w-6 h-0.5 inline-block rounded" style={{ background: '#20B2AA' }} />
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
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            LTV by Property
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
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Property Value</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Loan Balance</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">LTV%</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_PROPERTIES.map((prop) => {
                const color = ltvStatusColor(prop.ltv);
                const label = ltvStatusLabel(prop.ltv);
                return (
                  <tr key={prop.address} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 font-semibold text-white">{prop.address}</td>
                    <td className="py-3 px-3 text-right text-slate-300 tabular-nums">{fmtDollar(prop.value)}</td>
                    <td className="py-3 px-3 text-right text-slate-300 tabular-nums">{fmtDollar(prop.loan)}</td>
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
                            ? 'rgba(32, 178, 170,0.1)'
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
