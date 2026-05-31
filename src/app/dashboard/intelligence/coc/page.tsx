'use client';

import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowUpRight, Download } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { CashDeployedTerminal } from '@/components/intelligence/CashDeployedTerminal';
import { CoCIntelligenceCard } from '@/components/intelligence/CoCIntelligenceCard';

/* ═══════════════════════════════════════════════════════════════
   Cash-on-Cash Return Intelligence Page
   Left 4/12: Hero card + scenario cards
   Right 8/12: Area line chart with reference lines
   Bottom: CoC by Investment Tranche table
   ═══════════════════════════════════════════════════════════════ */

const DEMO_TREND   = [6.8, 7.1, 7.4, 7.6, 7.9, 8.1, 8.2, 8.42];
const DEMO_MONTHS  = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

const DEMO_TRANCHES = [
  { tranche: '421 Oak St, Brooklyn',       equityIn: 185000, annualCF: 15600, coc: 8.43, target: 8.0 },
  { tranche: '1248 Oakwood Ave, Queens',   equityIn: 220000, annualCF: 16500, coc: 7.5,  target: 8.0 },
  { tranche: '77 Prospect Heights, BK',    equityIn: 410000, annualCF: 38750, coc: 9.45, target: 8.0 },
  { tranche: '310 Atlantic Ave, Brooklyn', equityIn: 130000, annualCF: 8840,  coc: 6.8,  target: 8.0 },
];

function CoCTrendChart({ values, labels }: { values: number[]; labels: string[] }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#182127',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#dae4ec', fontSize: 11 },
      formatter: (params: any[]) =>
        params[0].axisValue + '<br/>' +
        `<span style="color:#2dd4bf">─</span> CoC Return: <b>${params[0].value}%</b>`,
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
        lineStyle: { width: 2.5, color: '#2dd4bf' },
        itemStyle: { color: '#2dd4bf' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(45,212,191,0.20)' },
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
              lineStyle: { color: '#2dd4bf', type: 'dashed', width: 1, opacity: 0.7 },
              label: { formatter: 'Target (8%)', color: '#2dd4bf', fontSize: 9, position: 'insideEndTop' },
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
    textClass: 'text-slate-400',
    numClass: 'text-slate-300',
    active: false,
  },
  {
    label: 'Current',
    coc: 8.42,
    description: 'Live portfolio performance',
    borderClass: 'border-teal-400/40',
    textClass: 'text-teal-400',
    numClass: 'text-teal-400',
    active: true,
  },
  {
    label: 'Aggressive',
    coc: 11.8,
    description: 'Full occupancy, rent optimization',
    borderClass: 'border-white/10',
    textClass: 'text-slate-400',
    numClass: 'text-slate-300',
    active: false,
  },
];

export default function CoCIntelligencePage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const { snapshots } = usePortfolioMetricSnapshots('monthly');

  /* ── Interactive state for CashDeployedTerminal → CoCIntelligenceCard ── */
  const [interactiveCashInvested, setInteractiveCashInvested] = useState(0);
  const [interactiveCoCReturn, setInteractiveCoCReturn] = useState(0);

  /* ── Derive annual cash flow from portfolio ── */
  const portfolioAnnualCashFlow = useMemo(() => {
    if (snapshots && snapshots.length > 0) {
      const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
      const latestCF = sorted[sorted.length - 1]?.annualCashFlow;
      if (latestCF && latestCF > 0) return latestCF;
    }
    const withCF = projects.filter(p => (p.financials?.netCashFlow ?? 0) > 0);
    if (withCF.length > 0) {
      return withCF.reduce((sum, p) => sum + (p.financials?.netCashFlow ?? 0), 0);
    }
    return 1722; // seed
  }, [snapshots, projects]);

  /* ── Derive total cash invested from portfolio ── */
  const portfolioCashInvested = useMemo(() => {
    const withInvested = projects.filter(p => (p.financials?.totalCashInvested ?? 0) > 0);
    if (withInvested.length > 0) {
      return withInvested.reduce((sum, p) => sum + (p.financials?.totalCashInvested ?? 0), 0);
    }
    return 60000; // seed
  }, [projects]);

  const { isUsingDemoData, currentCoC, cocChange, trendValues, trendLabels } = useMemo(() => {
    if (snapshots && snapshots.length >= 2) {
      const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-12);
      const vals   = sorted.map((s) => s.cashOnCashReturn ?? 0);
      const labels = sorted.map((s) => s.date.toLocaleDateString('en-US', { month: 'short' }));
      const last   = vals[vals.length - 1] ?? 0;
      const prev   = vals[0] ?? 0; // vs Last Year = first in window
      return { isUsingDemoData: false, currentCoC: last, cocChange: last - prev, trendValues: vals, trendLabels: labels };
    }
    return { isUsingDemoData: true, currentCoC: 8.42, cocChange: 1.2, trendValues: DEMO_TREND, trendLabels: DEMO_MONTHS };
  }, [snapshots, projects]);

  const trancheRows = useMemo(() => {
    const withEquity = projects.filter((p) => (p.financials?.totalCashInvested ?? 0) > 0);
    if (withEquity.length >= 3) {
      return withEquity.slice(0, 5).map((p) => {
        const equity = p.financials?.totalCashInvested ?? 0;
        const annualCF = (p.financials?.monthlyGrossRent ?? 0) * 12 - ((p.financials?.operatingExpenseTaxes ?? 0) + (p.financials?.operatingExpenseInsurance ?? 0)) * 12;
        const coc = equity > 0 ? (annualCF / equity) * 100 : 0;
        return {
          tranche: p.address || p.propertyName || 'Unknown',
          equityIn: equity,
          annualCF,
          coc,
          target: 8.0,
        };
      });
    }
    return DEMO_TRANCHES;
  }, [projects]);

  const benchmarkBadge = currentCoC >= 8
    ? 'bg-teal-400/10 border-teal-400/20 text-teal-400'
    : 'bg-amber-400/10 border-amber-400/20 text-amber-400';
  const benchmarkLabel = currentCoC >= 8 ? 'Above Benchmark' : 'Below Benchmark';

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-teal-400 transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-teal-400">CoC Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Cash-on-Cash Return</h1>
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

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Cash-on-Cash Return</span>
              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${benchmarkBadge}`}>
                {benchmarkLabel}
              </span>
            </div>

            {/* Big number */}
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-teal-400 tabular-nums tracking-tighter">
                {currentCoC.toFixed(2)}%
              </span>
            </div>

            {/* Change */}
            <div className="flex items-center gap-1.5 text-sm font-bold text-teal-400">
              <ArrowUpRight className="w-4 h-4" />
              +{cocChange.toFixed(1)}% vs Last Year
            </div>

            {/* Formula */}
            <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Formula</p>
              <p className="text-xs text-slate-300 font-mono">Annual Cash Flow ÷ Equity Invested</p>
            </div>
          </div>

          {/* Scenario cards */}
          <div className="space-y-2">
            {SCENARIOS.map((sc) => (
              <div
                key={sc.label}
                className={`rounded-xl border p-4 flex items-center justify-between transition-all ${sc.borderClass} ${sc.active ? 'ring-1 ring-teal-400/20' : ''}`}
                style={{ background: sc.active ? 'rgba(45,212,191,0.04)' : 'rgba(24,33,39,0.7)' }}
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
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">CoC Return Trend</span>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-amber-400/60 inline-block" /> Min (6%)</span>
                <span className="flex items-center gap-1"><span className="w-3 border-t border-dashed border-teal-400/60 inline-block" /> Target (8%)</span>
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
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 block mb-4">CoC by Investment Tranche</span>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Tranche / Property', 'Equity In', 'Annual Cash Flow', 'CoC%', 'vs Target'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trancheRows.map((row) => {
                const diff = row.coc - row.target;
                return (
                  <tr key={row.tranche} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-slate-300 font-medium">{row.tranche}</td>
                    <td className="py-3 px-3 text-slate-400 tabular-nums">
                      ${row.equityIn >= 1_000_000
                        ? `${(row.equityIn / 1_000_000).toFixed(2)}M`
                        : `${(row.equityIn / 1000).toFixed(0)}k`}
                    </td>
                    <td className="py-3 px-3 text-slate-400 tabular-nums">
                      ${row.annualCF >= 1000
                        ? `${(row.annualCF / 1000).toFixed(1)}k`
                        : row.annualCF.toFixed(0)}
                    </td>
                    <td className="py-3 px-3 font-bold tabular-nums text-teal-400">{row.coc.toFixed(2)}%</td>
                    <td className={`py-3 px-3 font-bold tabular-nums ${diff >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
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
