'use client';

import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowDownRight, ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { GRMTriageTerminal } from '@/components/intelligence/GRMTriageTerminal';
import { GRMComparisonCard } from '@/components/intelligence/GRMComparisonCard';

/* ═══════════════════════════════════════════════════════════════
   GRM Intelligence Page
   Left 4/12: Hero card + context metrics
   Right 8/12: Grouped bar chart (portfolio vs market)
   Bottom: GRM by Property table
   ═══════════════════════════════════════════════════════════════ */

const DEMO_PROPERTIES = [
  { address: '421 Oak St, Brooklyn',      value: 485000,  annualRent: 52800, grm: 9.2,  marketGRM: 10.5, signal: 'Buy'    },
  { address: '1248 Oakwood Ave, Queens',  value: 620000,  annualRent: 59400, grm: 10.4, marketGRM: 10.5, signal: 'Hold'   },
  { address: '77 Prospect Heights, BK',   value: 890000,  annualRent: 72000, grm: 12.4, marketGRM: 10.5, signal: 'Review' },
  { address: '310 Atlantic Ave, Brooklyn',value: 340000,  annualRent: 40800, grm: 8.3,  marketGRM: 10.5, signal: 'Buy'    },
  { address: '2100 Bedford Ave, BK',      value: 575000,  annualRent: 55200, grm: 10.4, marketGRM: 10.5, signal: 'Hold'   },
];

const SIGNAL_STYLES: Record<string, string> = {
  Buy:    'bg-teal-400/10 border-teal-400/20 text-teal-400',
  Hold:   'bg-slate-400/10 border-slate-400/20 text-slate-400',
  Review: 'bg-amber-400/10 border-amber-400/20 text-amber-400',
};

function GroupedBarChart({ properties }: { properties: typeof DEMO_PROPERTIES }) {
  const labels = properties.map((p) => p.address.split(',')[0]);
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#bacac5', fontSize: 10 },
      data: ['Portfolio GRM', 'Market GRM'],
    },
    grid: { top: 36, right: 16, bottom: 32, left: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 9, interval: 0, overflow: 'truncate', width: 80 },
    },
    yAxis: {
      type: 'value',
      min: 6,
      max: 14,
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => `${v}x` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [
      {
        name: 'Portfolio GRM',
        type: 'bar',
        data: properties.map((p) => p.grm),
        itemStyle: { color: '#20B2AA', borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 28,
        label: {
          show: true,
          position: 'top',
          color: '#94a3b8',
          fontSize: 9,
          formatter: (p: any) => `${p.value}x`,
        },
      },
      {
        name: 'Market GRM',
        type: 'bar',
        data: properties.map((p) => p.marketGRM),
        itemStyle: {
          color: 'transparent',
          borderColor: '#64748b',
          borderWidth: 1.5,
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 28,
        label: {
          show: true,
          position: 'top',
          color: '#64748b',
          fontSize: 9,
          formatter: (p: any) => `${p.value}x`,
        },
      },
    ],
  };
  return <ReactECharts option={option} style={{ height: 260, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

export default function GRMIntelligencePage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const { snapshots } = usePortfolioMetricSnapshots('monthly');

  /* ── Interactive state from GRMTriageTerminal ── */
  const [triageGRM, setTriageGRM] = useState(0);

  const { isUsingDemoData, currentGRM, grmChange } = useMemo(() => {
    if (snapshots && snapshots.length >= 2) {
      const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-12);
      const vals   = sorted.map((s) => s.grossRentMultiplier ?? 0).filter(Boolean);
      if (vals.length >= 2) {
        const last = vals[vals.length - 1];
        const prev = vals[vals.length - 2];
        return { isUsingDemoData: false, currentGRM: last, grmChange: last - prev };
      }
    }
    return { isUsingDemoData: true, currentGRM: 9.2, grmChange: -0.3 };
  }, [snapshots, projects]);

  const isDecreasing = grmChange < 0;

  const propertyRows = useMemo(() => {
    const withData = projects.filter((p) => p.financials?.grossRentMultiplier ?? p.financials?.purchasePrice);
    if (withData.length >= 3) {
      return withData.slice(0, 5).map((p) => {
        const grm = p.financials?.grossRentMultiplier ?? 0;
        const annualRent = (p.financials?.monthlyGrossRent ?? 0) * 12;
        const value = p.financials?.estimatedARV ?? p.financials?.purchasePrice ?? 0;
        const signal = grm < 9.5 ? 'Buy' : grm < 11 ? 'Hold' : 'Review';
        return {
          address: p.address || p.propertyName || 'Unknown',
          value,
          annualRent,
          grm,
          marketGRM: 10.5,
          signal,
        };
      });
    }
    return DEMO_PROPERTIES;
  }, [projects]);

  /* ── Deals for GRMComparisonCard ── */
  const comparisonDeals = useMemo(() => {
    const withData = projects.filter((p) => {
      const price = p.financials?.purchasePrice ?? p.financials?.targetPurchasePrice ?? 0;
      const rent = (p.financials?.monthlyGrossRent ?? 0) * 12;
      return price > 0 && rent > 0;
    });
    if (withData.length >= 2) {
      return withData.slice(0, 6).map((p) => ({
        id: p.id || p.address || 'unknown',
        address: p.address || p.propertyName || 'Unknown',
        propertyPrice: p.financials?.purchasePrice ?? p.financials?.targetPurchasePrice ?? 0,
        grossAnnualRent: (p.financials?.monthlyGrossRent ?? 0) * 12,
        grm: p.financials?.grossRentMultiplier,
      }));
    }
    return [
      { id: '1', address: '421 Oak St, Brooklyn', propertyPrice: 485000, grossAnnualRent: 52800 },
      { id: '2', address: '1248 Oakwood Ave, Queens', propertyPrice: 620000, grossAnnualRent: 59400 },
      { id: '3', address: '77 Prospect Heights, BK', propertyPrice: 890000, grossAnnualRent: 72000 },
      { id: '4', address: '310 Atlantic Ave, Brooklyn', propertyPrice: 340000, grossAnnualRent: 40800 },
    ];
  }, [projects]);

  /* ── Portfolio-derived defaults for triage ── */
  const portfolioDefaults = useMemo(() => {
    const withPrice = projects.filter(p => (p.financials?.purchasePrice ?? 0) > 0);
    if (withPrice.length > 0) {
      const avgPrice = withPrice.reduce((s, p) => s + (p.financials?.purchasePrice ?? 0), 0) / withPrice.length;
      const avgRent = withPrice.reduce((s, p) => s + (p.financials?.monthlyGrossRent ?? 0), 0) / withPrice.length;
      return { price: Math.round(avgPrice), rent: Math.round(avgRent) };
    }
    return { price: 279000, rent: 1950 }; // seed
  }, [projects]);

  const contextMetrics = [
    { label: 'Current Value',  value: '$485k' },
    { label: 'Annual Rent',    value: '$52.8k' },
    { label: 'Portfolio GRM',  value: `${currentGRM.toFixed(1)}x` },
    { label: 'Market GRM',     value: '10.5x' },
  ];

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">GRM Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Gross Rent Multiplier</h1>
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

            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Current GRM</span>

            {/* Big number */}
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold text-teal-400 tabular-nums tracking-tighter">
                {currentGRM.toFixed(1)}
              </span>
              <span className="text-slate-500 text-sm">x</span>
            </div>

            {/* Change indicator */}
            <div className={`flex items-center gap-1.5 text-sm font-bold ${isDecreasing ? 'text-teal-400' : 'text-red-400'}`}>
              {isDecreasing
                ? <ArrowDownRight className="w-4 h-4" />
                : <ArrowUpRight className="w-4 h-4" />
              }
              {isDecreasing ? '' : '+'}{grmChange.toFixed(1)} vs Last Period
              <span className="text-[10px] font-normal text-slate-500 ml-1">(lower is better)</span>
            </div>

            {/* Formula */}
            <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Formula</p>
              <p className="text-xs text-slate-300 font-mono">Property Value ÷ Annual Gross Rent</p>
            </div>
          </div>

          {/* Context metrics */}
          <div className="rounded-xl border border-white/10 p-5" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-3">Context</span>
            <div className="grid grid-cols-2 gap-3">
              {contextMetrics.map((m) => (
                <div key={m.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">{m.label}</p>
                  <p className="text-base font-bold text-white tabular-nums">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Grouped Bar Chart 8/12 ── */}
        <div className="md:col-span-8">
          <div className="rounded-xl border border-white/10 p-6 h-full" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Portfolio vs Market GRM</span>
            </div>
            <GroupedBarChart properties={propertyRows} />
            <p className="text-[10px] text-slate-600 mt-2">Bars below market GRM represent alpha — buying at a discount to market rent multiples.</p>
          </div>
        </div>
      </div>

      {/* ── GRM Comparison + Triage Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Multi-Property Deal Compare */}
        <GRMComparisonCard deals={comparisonDeals} marketGRM={10.5} />

        {/* A-Phase Triage Terminal */}
        <GRMTriageTerminal
          defaultPropertyPrice={portfolioDefaults.price}
          defaultMonthlyRent={portfolioDefaults.rent}
          marketGRM={10.5}
          maxAcceptableGRM={13}
          onValuesChange={(values) => setTriageGRM(values.grm)}
        />
      </div>

      {/* ── Bottom: GRM by Property Table ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-4">GRM by Property</span>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Address', 'Value', 'Annual Rent', 'GRM', 'vs Market', 'Signal'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propertyRows.map((row) => {
                const diff = row.grm - row.marketGRM;
                return (
                  <tr key={row.address} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-slate-300 font-medium">{row.address}</td>
                    <td className="py-3 px-3 text-slate-400 tabular-nums">
                      {row.value >= 1_000_000 ? `$${(row.value / 1_000_000).toFixed(2)}M` : `$${(row.value / 1000).toFixed(0)}k`}
                    </td>
                    <td className="py-3 px-3 text-slate-400 tabular-nums">
                      ${(row.annualRent / 1000).toFixed(1)}k
                    </td>
                    <td className="py-3 px-3 text-teal-400 font-bold tabular-nums">{row.grm.toFixed(1)}x</td>
                    <td className={`py-3 px-3 font-bold tabular-nums ${diff <= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}x
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${SIGNAL_STYLES[row.signal] ?? SIGNAL_STYLES.Hold}`}>
                        {row.signal}
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
