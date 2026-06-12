'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '@/lib/intelligence/selectors';
import { OccupancyCollectionTerminal } from '@/components/intelligence/OccupancyCollectionTerminal';
import type { OccupancyValues, UnitOccupancy } from '@/components/intelligence/OccupancyCollectionTerminal';

/* ═══════════════════════════════════════════════════════════════
   Occupancy Intelligence Page
   Left 4/12: Hero card + donut
   Right 8/12: Stacked bar chart by month
   Bottom: Vacancy Risk Analysis table
   ═══════════════════════════════════════════════════════════════ */

const defaultMonths = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
const defaultOccupancy = [88, 89, 90, 91, 90, 92, 91, 92, 93, 93, 94, 94.2];

const defaultProperties = [
  { address: '421 Oak St, Brooklyn',       units: 12, occupied: 12, leaseRisk: 'Low'    },
  { address: '1248 Oakwood Ave, Queens',   units: 8,  occupied: 7,  leaseRisk: 'Medium' },
  { address: '77 Prospect Heights, BK',    units: 16, occupied: 14, leaseRisk: 'Low'    },
  { address: '310 Atlantic Ave, Brooklyn', units: 6,  occupied: 6,  leaseRisk: 'Low'    },
  { address: '2100 Bedford Ave, BK',       units: 8,  occupied: 8,  leaseRisk: 'High'   },
];

const RISK_STYLES: Record<string, string> = {
  Low:    'bg-[#6E7480]/10 border-[#6E7480]/20 text-[#6E7480]',
  Medium: 'bg-amber-400/10 border-amber-400/20 text-amber-400',
  High:   'bg-red-400/10 border-red-400/20 text-red-400',
};

function StackedBarChart({ months, occupancyPcts, whatIfOccupancyRate }: { months: string[]; occupancyPcts: number[]; whatIfOccupancyRate?: number | null }) {
  const markLineData: object[] = [];
  if (whatIfOccupancyRate != null && isFinite(whatIfOccupancyRate) && whatIfOccupancyRate > 0) {
    markLineData.push({
      yAxis: Number(whatIfOccupancyRate.toFixed(1)),
      lineStyle: { color: '#fb923c', type: 'dashed', width: 2 },
      label: { show: true, position: 'insideEndTop', color: '#fb923c', fontSize: 10, formatter: `What-If (${whatIfOccupancyRate.toFixed(1)}%)` }
    });
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
      formatter: (params: any[]) => {
        const month = params[0].axisValue;
        const occ = params[0].value;
        const vac = params[1]?.value ?? (100 - occ);
        return `${month}<br/><span style="color:#454955">■</span> Occupied: <b>${occ.toFixed(1)}%</b><br/><span style="color:#F06543">■</span> Vacant: <b>${(100 - occ).toFixed(1)}%</b>`;
      },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#9E9DA0', fontSize: 10 },
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
          itemStyle: { color: '#454955' },
        })),
        barMaxWidth: 32,
        itemStyle: { borderRadius: [0, 0, 0, 0] },
        markLine: markLineData.length > 0 ? {
          silent: true,
          symbol: ['none', 'none'],
          data: markLineData,
        } : undefined,
      },
      {
        name: 'Vacant',
        type: 'bar',
        stack: 'total',
        data: occupancyPcts.map((v) => ({
          value: parseFloat((100 - v).toFixed(1)),
          itemStyle: { color: 'rgba(240, 101, 67,0.25)' },
        })),
        barMaxWidth: 32,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

function SmallDonut({ occupiedPct, whatIfActive }: { occupiedPct: number; whatIfActive?: boolean }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const stroke = circ * (occupiedPct / 100);
  const gap = circ - stroke;
  const color = whatIfActive ? '#fb923c' : '#454955';
  return (
    <svg width={80} height={80} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${stroke} ${gap}`}
        strokeLinecap="round"
        transform="rotate(-90 40 40)"
        className="transition-all duration-500"
      />
      <text x="40" y="43" textAnchor="middle" fontSize="12" fontWeight="bold" fill={color} className="transition-all">
        {occupiedPct.toFixed(0)}%
      </text>
    </svg>
  );
}

export default function OccupancyIntelligencePage() {
  useAllDealsSync();
  const occupancyCurrentResult = useMetricCurrent('OCCUPANCY');
  const occupancySeriesResult = useMetricSeries('OCCUPANCY');
  const portfolioInputsResult = usePortfolioInputs();

  /* ── Reactive state from Collection Terminal ── */
  const [collectedValues, setCollectedValues] = useState<OccupancyValues | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const initialOccRef = useRef<number | null>(null);

  const handleCollectionChange = useCallback((v: OccupancyValues) => {
    if (initialOccRef.current === null) {
      initialOccRef.current = v.occupancyRate;
    } else if (Math.abs(v.occupancyRate - initialOccRef.current) > 0.01) {
      setHasInteracted(true);
    }
    setCollectedValues(v);
  }, []);

  const portfolioDefaults = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return { totalDays: 365 };
    }
    const projects = portfolioInputsResult.data.projects;
    const units: UnitOccupancy[] = [];
    projects.forEach((p, idx) => {
      const uCount = p.numberOfUnits ?? 0;
      if (uCount > 0) {
        const oCount = p.occupiedUnits ?? uCount;
        for (let i = 0; i < uCount; i++) {
          const isOccupied = i < oCount;
          units.push({
            id: `${p.id || idx}-${i}`,
            unitLabel: `${p.propertyName || 'Property'} - Unit ${i+1}`,
            tenantName: isOccupied ? 'Tenant' : '',
            baseStart: isOccupied ? '2025-06-01' : '',
            leaseStart: isOccupied ? '2025-06-01' : '',
            leaseEnd: isOccupied ? '2026-05-31' : '',
            vacantDays: isOccupied ? 0 : 365,
            status: isOccupied ? 'occupied' : 'vacant',
          } as any);
        }
      }
    });
    return {
      units: units.length > 0 ? units : undefined,
      totalDays: 365,
    };
  }, [portfolioInputsResult]);

  const { isUsingDemoData, currentOcc, occChange, occupiedUnits, totalUnits, trendPcts, trendMonths } = useMemo(() => {
    if (
      occupancySeriesResult.status === 'ready' &&
      occupancyCurrentResult.status === 'ready' &&
      portfolioInputsResult.status === 'ready' &&
      portfolioInputsResult.data.snapshots.length >= 2
    ) {
      const sorted = [...portfolioInputsResult.data.snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const pcts = sorted.map((s) => {
        const rate = s.occupancyRate ?? (0);
        return rate <= (1) ? rate * 100 : rate;
      });
      const labels = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last = occupancyCurrentResult.data;
      const prev = pcts[pcts.length - 2] ?? last;
      const lastSnap = sorted[sorted.length - 1];
      const occ = lastSnap?.occupiedUnits ?? (0);
      const tot = lastSnap?.numberOfUnits ?? (0);
      return {
        isUsingDemoData: false,
        currentOcc: last,
        occChange: last - prev,
        occupiedUnits: occ,
        totalUnits: tot,
        trendPcts: pcts,
        trendMonths: labels,
      };
    }

    const totalU = portfolioInputsResult.status === 'ready'
      ? portfolioInputsResult.data.projects.reduce((s, p) => s + (p.numberOfUnits ?? (0)), 0)
      : (50);
    const totalUOr50 = totalU || (50);
    const occupiedU = Math.round(totalUOr50 * 0.942);

    return {
      isUsingDemoData: true,
      currentOcc: collectedValues?.occupancyRate ?? (94.2),
      occChange: (1.8),
      occupiedUnits: collectedValues?.occupiedUnitCount ?? occupiedU,
      totalUnits: collectedValues?.totalUnitCount ?? totalUOr50,
      trendPcts: defaultOccupancy,
      trendMonths: defaultMonths,
    };
  }, [occupancySeriesResult, occupancyCurrentResult, portfolioInputsResult, collectedValues]);

  const whatIfOccupancy = useMemo(() => {
    if (hasInteracted && collectedValues) {
      return {
        occupancyRate: collectedValues.occupancyRate,
        occupiedUnitCount: collectedValues.occupiedUnitCount,
        totalUnitCount: collectedValues.totalUnitCount,
      };
    }
    return null;
  }, [hasInteracted, collectedValues]);

  const displayOcc = whatIfOccupancy?.occupancyRate ?? currentOcc;
  const displayOccupied = whatIfOccupancy?.occupiedUnitCount ?? occupiedUnits;
  const displayTotal = whatIfOccupancy?.totalUnitCount ?? totalUnits;

  const propertyRows = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return defaultProperties;
    }
    const projectsList = portfolioInputsResult.data.projects;
    const withUnits = projectsList.filter((p) => (p.numberOfUnits ?? (0)) > 0);
    if (withUnits.length >= 3) {
      return withUnits.slice(0, 5).map((p) => {
        const units = p.numberOfUnits ?? (0);
        const occ   = p.occupiedUnits ?? units;
        const vRate = units > (0) ? ((units - occ) / units) * 100 : (0);
        const risk  = vRate === (0) ? 'Low' : vRate < (15) ? 'Medium' : 'High';
        return { address: p.address || p.propertyName || 'Unknown', units, occupied: occ, leaseRisk: risk };
      });
    }
    return defaultProperties;
  }, [portfolioInputsResult]);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">Occupancy Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Occupancy Intelligence</h1>
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
        <div className="md:col-span-4">
          <div className="rounded-xl border border-white/10 p-6 space-y-5 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>

            <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Current Occupancy</span>

            {/* Big number + donut row */}
            <div className="flex items-center gap-4">
              <SmallDonut occupiedPct={displayOcc} whatIfActive={whatIfOccupancy != null} />
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-4xl font-bold tabular-nums tracking-tighter transition-all" style={{ color: whatIfOccupancy != null ? '#fb923c' : '#6E7480' }}>
                    {displayOcc.toFixed(1)}%
                  </div>
                  {whatIfOccupancy != null && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest uppercase" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
                      WHAT-IF
                    </span>
                  )}
                </div>
                {whatIfOccupancy != null ? (
                  <div className="px-2 py-0.5 rounded border border-orange-400/20 bg-orange-400/10 flex items-center gap-1.5 mt-1 self-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <span className="text-[9px] font-extrabold tracking-widest text-orange-400">HYPOTHETICAL</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1 text-sm font-bold text-[#6E7480]">
                    <ArrowUpRight className="w-4 h-4" />
                    +{occChange.toFixed(1)}% vs Last Month
                  </div>
                )}
              </div>
            </div>

            {/* Occupied / Total */}
            <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-1">Units</p>
              <p className="text-xl font-bold tabular-nums transition-all" style={{ color: whatIfOccupancy != null ? '#fb923c' : '#ffffff' }}>
                {displayOccupied} <span className="text-[#6B6870] font-normal text-sm">of</span> {displayTotal} units occupied
              </p>
            </div>

            {/* Mini occupancy progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-[#6B6870]">
                <span>Occupancy Rate</span>
                <span className="font-bold transition-all" style={{ color: whatIfOccupancy != null ? '#fb923c' : '#6E7480' }}>{displayOcc.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${displayOcc}%`,
                    backgroundColor: whatIfOccupancy != null ? '#fb923c' : '#6E7480',
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-600">
                <span>0%</span>
                <span>Vacant: {(100 - displayOcc).toFixed(1)}%</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Stacked Bar 8/12 ── */}
        <div className="md:col-span-8">
          <div className="rounded-xl border border-white/10 p-6 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Occupancy by Month</span>
            </div>
            <StackedBarChart months={trendMonths} occupancyPcts={trendPcts} whatIfOccupancyRate={whatIfOccupancy?.occupancyRate} />
          </div>
        </div>
      </div>

      {/* ── Occupancy Collection Terminal ── */}
      <OccupancyCollectionTerminal
        defaults={portfolioDefaults}
        onValuesChange={handleCollectionChange}
      />

      {/* ── Bottom: Vacancy Risk Analysis ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-4">Vacancy Risk Analysis</span>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Address', 'Units', 'Occupied', 'Vacancy Rate', 'Lease Expiry Risk'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propertyRows.map((row) => {
                const vacRate = row.units > 0 ? ((row.units - row.occupied) / row.units) * 100 : 0;
                return (
                  <tr key={row.address} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-[#C0BEC2] font-medium">{row.address}</td>
                    <td className="py-3 px-3 text-[#9E9DA0] tabular-nums">{row.units}</td>
                    <td className="py-3 px-3 text-[#9E9DA0] tabular-nums">{row.occupied}</td>
                    <td className={`py-3 px-3 font-bold tabular-nums ${vacRate === 0 ? 'text-[#6E7480]' : vacRate < 15 ? 'text-amber-400' : 'text-red-400'}`}>
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
