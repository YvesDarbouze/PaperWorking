'use client';

import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';

/* ═══════════════════════════════════════════════════════════════
   Occupancy Intelligence Page
   Left 4/12: Hero card + donut
   Right 8/12: Stacked bar chart by month
   Bottom: Vacancy Risk Analysis table
   ═══════════════════════════════════════════════════════════════ */

const DEMO_MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
const DEMO_OCCUPANCY = [88, 89, 90, 91, 90, 92, 91, 92, 93, 93, 94, 94.2];

const DEMO_PROPERTIES = [
  { address: '421 Oak St, Brooklyn',       units: 12, occupied: 12, leaseRisk: 'Low'    },
  { address: '1248 Oakwood Ave, Queens',   units: 8,  occupied: 7,  leaseRisk: 'Medium' },
  { address: '77 Prospect Heights, BK',    units: 16, occupied: 14, leaseRisk: 'Low'    },
  { address: '310 Atlantic Ave, Brooklyn', units: 6,  occupied: 6,  leaseRisk: 'Low'    },
  { address: '2100 Bedford Ave, BK',       units: 8,  occupied: 8,  leaseRisk: 'High'   },
];

const RISK_STYLES: Record<string, string> = {
  Low:    'bg-teal-400/10 border-teal-400/20 text-teal-400',
  Medium: 'bg-amber-400/10 border-amber-400/20 text-amber-400',
  High:   'bg-red-400/10 border-red-400/20 text-red-400',
};

function StackedBarChart({ months, occupancyPcts }: { months: string[]; occupancyPcts: number[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
      formatter: (params: any[]) => {
        const month = params[0].axisValue;
        const occ = params[0].value;
        const vac = params[1]?.value ?? (100 - occ);
        return `${month}<br/><span style="color:#2dd4bf">■</span> Occupied: <b>${occ.toFixed(1)}%</b><br/><span style="color:#f87171">■</span> Vacant: <b>${(100 - occ).toFixed(1)}%</b>`;
      },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#bacac5', fontSize: 10 },
      data: ['Occupied', 'Vacant'],
    },
    grid: { top: 36, right: 16, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [
      {
        name: 'Occupied',
        type: 'bar',
        stack: 'total',
        data: occupancyPcts.map((v) => ({
          value: v,
          itemStyle: { color: '#2dd4bf' },
        })),
        barMaxWidth: 32,
        itemStyle: { borderRadius: [0, 0, 0, 0] },
      },
      {
        name: 'Vacant',
        type: 'bar',
        stack: 'total',
        data: occupancyPcts.map((v) => ({
          value: parseFloat((100 - v).toFixed(1)),
          itemStyle: { color: 'rgba(248,113,113,0.25)' },
        })),
        barMaxWidth: 32,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

function SmallDonut({ occupiedPct }: { occupiedPct: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const stroke = circ * (occupiedPct / 100);
  const gap = circ - stroke;
  return (
    <svg width={80} height={80} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="#2dd4bf"
        strokeWidth="10"
        strokeDasharray={`${stroke} ${gap}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="43" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#2dd4bf">
        {occupiedPct.toFixed(0)}%
      </text>
    </svg>
  );
}

export default function OccupancyIntelligencePage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const { snapshots } = usePortfolioMetricSnapshots('monthly');

  const { currentOcc, occChange, occupiedUnits, totalUnits, trendPcts, trendMonths } = useMemo(() => {
    if (snapshots && snapshots.length >= 2) {
      const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-12);
      const pcts   = sorted.map((s) => (s.occupancyRate ?? 0) * 100);
      const labels = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last   = pcts[pcts.length - 1] ?? 94.2;
      const prev   = pcts[pcts.length - 2] ?? 93;
      const occ    = sorted[sorted.length - 1]?.occupiedUnits ?? 47;
      const tot    = sorted[sorted.length - 1]?.numberOfUnits ?? 50;
      return {
        currentOcc: last,
        occChange: last - prev,
        occupiedUnits: occ,
        totalUnits: tot,
        trendPcts: pcts,
        trendMonths: labels,
      };
    }
    const totalU = projects.reduce((s, p) => s + (p.numberOfUnits ?? 0), 0) || 50;
    const occupiedU = Math.round(totalU * 0.942);
    return {
      currentOcc: 94.2,
      occChange: 1.8,
      occupiedUnits: occupiedU,
      totalUnits: totalU,
      trendPcts: DEMO_OCCUPANCY,
      trendMonths: DEMO_MONTHS,
    };
  }, [snapshots, projects]);

  const propertyRows = useMemo(() => {
    const withUnits = projects.filter((p) => (p.numberOfUnits ?? 0) > 0);
    if (withUnits.length >= 3) {
      return withUnits.slice(0, 5).map((p) => {
        const units = p.numberOfUnits ?? 0;
        const occ   = p.occupiedUnits ?? units;
        const vRate = units > 0 ? ((units - occ) / units) * 100 : 0;
        const risk  = vRate === 0 ? 'Low' : vRate < 15 ? 'Medium' : 'High';
        return { address: p.address || p.propertyName || 'Unknown', units, occupied: occ, leaseRisk: risk };
      });
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
            <span className="text-teal-400">Occupancy Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Occupancy Intelligence</h1>
        </div>
        <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-slate-300 hover:border-teal-500/40 hover:text-teal-400 transition-all flex items-center gap-2 self-start md:self-auto">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* ── Main 12-column grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

        {/* ── Left Hero: 4/12 ── */}
        <div className="md:col-span-4">
          <div className="rounded-xl border border-white/10 p-6 space-y-5 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>

            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Current Occupancy</span>

            {/* Big number + donut row */}
            <div className="flex items-center gap-4">
              <SmallDonut occupiedPct={currentOcc} />
              <div>
                <div className="text-4xl font-bold text-teal-400 tabular-nums tracking-tighter">
                  {currentOcc.toFixed(1)}%
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm font-bold text-teal-400">
                  <ArrowUpRight className="w-4 h-4" />
                  +{occChange.toFixed(1)}% vs Last Month
                </div>
              </div>
            </div>

            {/* Occupied / Total */}
            <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Units</p>
              <p className="text-xl font-bold text-white tabular-nums">
                {occupiedUnits} <span className="text-slate-500 font-normal text-sm">of</span> {totalUnits} units occupied
              </p>
            </div>

            {/* Mini occupancy progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Occupancy Rate</span>
                <span className="text-teal-400 font-bold">{currentOcc.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all"
                  style={{ width: `${currentOcc}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600">
                <span>0%</span>
                <span>Vacant: {(100 - currentOcc).toFixed(1)}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Stacked Bar 8/12 ── */}
        <div className="md:col-span-8">
          <div className="rounded-xl border border-white/10 p-6 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Occupancy by Month</span>
            </div>
            <StackedBarChart months={trendMonths} occupancyPcts={trendPcts} />
          </div>
        </div>
      </div>

      {/* ── Bottom: Vacancy Risk Analysis ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-4">Vacancy Risk Analysis</span>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Address', 'Units', 'Occupied', 'Vacancy Rate', 'Lease Expiry Risk'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propertyRows.map((row) => {
                const vacRate = row.units > 0 ? ((row.units - row.occupied) / row.units) * 100 : 0;
                return (
                  <tr key={row.address} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-slate-300 font-medium">{row.address}</td>
                    <td className="py-3 px-3 text-slate-400 tabular-nums">{row.units}</td>
                    <td className="py-3 px-3 text-slate-400 tabular-nums">{row.occupied}</td>
                    <td className={`py-3 px-3 font-bold tabular-nums ${vacRate === 0 ? 'text-teal-400' : vacRate < 15 ? 'text-amber-400' : 'text-red-400'}`}>
                      {vacRate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${RISK_STYLES[row.leaseRisk] ?? RISK_STYLES.Medium}`}>
                        {row.leaseRisk}
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
