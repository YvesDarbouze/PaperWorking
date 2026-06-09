'use client';

import React, { useState, useMemo, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { ArrowUpRight, Download, TrendingUp } from 'lucide-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { IRRExitAssumptionsTerminal } from '@/components/intelligence/IRRExitAssumptionsTerminal';
import type { IRRAssumptions } from '@/components/intelligence/IRRExitAssumptionsTerminal';
import { IRRScenarioComparisonCard } from '@/components/intelligence/IRRScenarioComparisonCard';

/* ═══════════════════════════════════════════════════════════════
   IRR Intelligence — Stitch screen: 730ea3ab98c047189ac5010c875ecffd
   Bento grid:
     Left 5/12:  Hero IRR metric card (big number + benchmark bar)
     Right 7/12: Grouped bar chart — Scenarios vs Actual performance
     Bottom row: Sensitivity table + Key drivers
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Quarter' | 'Year' | 'All Time';
type Scope = 'Property' | 'My Share';

const DEMO_SCENARIOS = [
  { label: '3-Year Hold', actual: 8.2,  projected: 12.4 },
  { label: '5-Year Hold', actual: 12.1, projected: 18.4 },
  { label: '7-Year Hold', actual: 15.8, projected: 22.7 },
  { label: '10-Year Hold', actual: 0,   projected: 26.1 },
];

const DEMO_SENSITIVITY = [
  { variable: 'Exit Cap Rate',  base: '5.85%', bear: '6.80%', bull: '5.10%', irrImpact: '±3.2%' },
  { variable: 'Rent Growth',    base: '3.0%',  bear: '1.0%',  bull: '5.0%',  irrImpact: '±2.1%' },
  { variable: 'Vacancy Rate',   base: '5.0%',  bear: '12.0%', bull: '2.0%',  irrImpact: '±1.8%' },
  { variable: 'Hold Period',    base: '5 yrs', bear: '3 yrs', bull: '7 yrs', irrImpact: '±4.6%' },
  { variable: 'Rehab Cost',     base: '$65k',  bear: '$90k',  bull: '$55k',  irrImpact: '±1.5%' },
];

function ScenariosChart({ scenarios }: { scenarios: typeof DEMO_SCENARIOS }) {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 12 },
      formatter: (params: any[]) =>
        `${params[0].name}<br/>` +
        params.map((p: any) => `<span style="color:${p.color}">■</span> ${p.seriesName}: <b>${p.value}%</b>`).join('<br/>'),
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#9E9DA0', fontSize: 11 },
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 6,
    },
    grid: { top: 40, right: 16, bottom: 24, left: 0, containLabel: true },
    xAxis: {
      type: 'category',
      data: scenarios.map((s) => s.label),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 10, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [
      {
        name: 'Actual',
        type: 'bar',
        data: scenarios.map((s) => ({
          value: s.actual || null,
          itemStyle: { color: '#454955' },
        })),
        barMaxWidth: 32,
        barGap: '20%',
      },
      {
        name: 'Projected',
        type: 'bar',
        data: scenarios.map((s) => ({
          value: s.projected,
          itemStyle: {
            color: 'transparent',
            borderColor: '#454955',
            borderWidth: 1.5,
            borderType: 'dashed',
          },
        })),
        barMaxWidth: 32,
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 240, width: '100%' }} opts={{ renderer: 'canvas' }} />;
}

export default function IRRIntelligencePage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope] = useState<Scope>('Property');
  const { snapshots } = usePortfolioMetricSnapshots('annual');

  /* ── Reactive state from Exit Assumptions Terminal ── */
  const [assumptions, setAssumptions] = useState<IRRAssumptions | null>(null);
  const handleAssumptionsChange = useCallback((v: IRRAssumptions) => setAssumptions(v), []);

  const handleExportCSV = useCallback(() => {
    try {
      const headers = ['Variable', 'Base Case', 'Bear Case', 'Bull Case', 'IRR Impact'];
      const rows = DEMO_SENSITIVITY.map(row => [
        row.variable,
        row.base,
        row.bear,
        row.bull,
        row.irrImpact
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `irr_sensitivity_analysis.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('IRR Sensitivity CSV exported successfully!');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      toast.error('Failed to export CSV. Please try again.');
    }
  }, []);

  /* ── Portfolio-derived defaults ── */
  const portfolioDefaults = useMemo(() => {
    const withPrice = projects.filter(p => (p.financials?.purchasePrice ?? 0) > 0);
    if (withPrice.length > 0) {
      const avgPrice = withPrice.reduce((s, p) => s + (p.financials?.purchasePrice ?? 0), 0) / withPrice.length;
      const avgLoan = withPrice.reduce((s, p) => s + (p.financials?.loanAmount ?? 0), 0) / withPrice.length;
      const avgCashInvested = withPrice.reduce((s, p) => s + (p.financials?.financingCashInvested ?? 0), 0) / withPrice.length;
      return {
        totalCashInvested: Math.round(avgCashInvested || 60000),
        purchasePrice: Math.round(avgPrice),
        loanAmount: Math.round(avgLoan || avgPrice * 0.785),
        loanRate: (withPrice[0]?.financials?.loanInterestRate ?? 7),
        loanTermYears: (withPrice[0]?.financials?.loanTermYears ?? 30),
      };
    }
    return {
      totalCashInvested: 60000,
      purchasePrice: 279000,
      loanAmount: 223200,
      loanRate: 6.5,
      loanTermYears: 30,
    };
  }, [projects]);

  /* ── Scenario card inputs (derived from interactive or defaults) ── */
  const scenarioInputs = useMemo(() => ({
    totalCashInvested: assumptions?.totalCashInvested ?? portfolioDefaults.totalCashInvested,
    annualCashFlow: assumptions?.annualCashFlow ?? -4443.31,
    purchasePrice: assumptions?.purchasePrice ?? portfolioDefaults.purchasePrice,
    loanAmount: assumptions?.loanAmount ?? portfolioDefaults.loanAmount,
    loanRate: assumptions?.loanRate ?? portfolioDefaults.loanRate,
    loanTermYears: assumptions?.loanTermYears ?? portfolioDefaults.loanTermYears,
    sellingCostsPercent: assumptions?.sellingCostsPercent ?? 8,
  }), [assumptions, portfolioDefaults]);

  const { isUsingDemoData, currentIRR, projectedGain, realizedToDate, benchmarkPct } = useMemo(() => {
    const latestSnap = snapshots?.[snapshots.length - 1];
    const irr = latestSnap?.irr ?? null;

    if (irr) {
      const totalValue = projects.reduce((s, p) => s + (p.financials?.arv ?? p.financials?.estimatedARV ?? 0), 0);
      const totalCost  = projects.reduce((s, p) => s + ((p.financials?.purchasePrice ?? 0) + (p.financials?.rehabBudget ?? 0)), 0);
      return {
        isUsingDemoData: false,
        currentIRR: irr,
        projectedGain: totalValue - totalCost,
        realizedToDate: irr * 0.45,
        benchmarkPct: 75,
      };
    }

    return { isUsingDemoData: true, currentIRR: assumptions?.irr !== null ? (assumptions?.irr ?? 0.184) * 100 : 18.4, projectedGain: 4_200_000, realizedToDate: 8.2, benchmarkPct: 75 };
  }, [snapshots, projects, assumptions]);

  const fmt = (v: number) => v >= 1_000_000 ? `+$${(v / 1_000_000).toFixed(1)}M` : `+$${(v / 1000).toFixed(0)}k`;

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">IRR Intelligence</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">IRR Intelligence</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Property', 'My Share'] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  scope === s ? 'bg-[#454955] text-black' : 'text-[#9E9DA0] hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['Quarter', 'Year', 'All Time'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  period === p ? 'border border-[#454955]/60 text-[#6E7480] bg-[#454955]/10' : 'text-[#9E9DA0] hover:text-slate-200'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-[#C0BEC2] hover:border-[#454955]/40 hover:text-[#6E7480] transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <SampleDataBanner show={isUsingDemoData} />

      {/* ── Bento Row 1: Hero + Scenarios Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Hero Metric Card */}
        <div className="lg:col-span-5 rounded-3xl border border-white/10 p-8 relative overflow-hidden" style={{ background: 'rgba(24,33,39,0.7)' }}>
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <TrendingUp className="w-24 h-24 text-[#6E7480]" />
          </div>

          <p className="text-xs text-[#6B6870] font-semibold uppercase tracking-widest mb-1">Scenario: 5-Year Hold</p>
          <p className="text-sm text-[#9E9DA0] mb-4">Projected Internal Rate of Return</p>

          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-[64px] font-bold text-[#6E7480] tabular-nums leading-none tracking-tighter">
              {currentIRR.toFixed(1)}
            </span>
            <span className="text-2xl font-medium text-[#6E7480]">%</span>
          </div>

          <div className="flex items-center gap-6 mb-8">
            <div>
              <p className="text-xs text-[#6B6870] uppercase tracking-widest">Projected Gain</p>
              <p className="text-xl font-bold text-white tabular-nums">{fmt(projectedGain)}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div>
              <p className="text-xs text-[#6B6870] uppercase tracking-widest">Realized to Date</p>
              <p className="text-xl font-bold text-white tabular-nums">{realizedToDate.toFixed(1)}%</p>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs text-[#6B6870] uppercase tracking-widest">Benchmark Comparison</span>
              <span className="text-xs font-bold text-[#6E7480] flex items-center gap-0.5">
                +3.2% vs Portfolio Avg
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${benchmarkPct}%`,
                  background: 'linear-gradient(90deg, #0d9488, #454955)',
                  boxShadow: '0 0 12px rgba(69, 73, 85,0.3)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Scenarios Bar Chart */}
        <div className="lg:col-span-7 rounded-3xl border border-white/10 p-8" style={{ background: 'rgba(24,33,39,0.7)' }}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">IRR Scenarios</h3>
              <p className="text-xs text-[#6B6870] mt-1">Comparing projected hold horizons vs. actual performance</p>
            </div>
          </div>
          <ScenariosChart scenarios={DEMO_SCENARIOS} />
        </div>
      </div>

      {/* ── IRR Exit Assumptions + Scenario Comparison Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Exit Assumptions Terminal */}
        <IRRExitAssumptionsTerminal
          defaults={{
            totalCashInvested: portfolioDefaults.totalCashInvested,
            annualCashFlow: -4443.31,
            holdYears: 5,
            purchasePrice: portfolioDefaults.purchasePrice,
            appreciationPercent: 3,
            loanAmount: portfolioDefaults.loanAmount,
            loanRate: portfolioDefaults.loanRate,
            loanTermYears: portfolioDefaults.loanTermYears,
            sellingCostsPercent: 8,
          }}
          onValuesChange={handleAssumptionsChange}
        />

        {/* Scenario Comparison Card */}
        <IRRScenarioComparisonCard
          inputs={scenarioInputs}
          holdPeriods={[3, 5, 7, 10]}
          hurdleRate={0.12}
        />
      </div>

      {/* ── Sensitivity Analysis ── */}
      <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#9E9DA0]">Sensitivity Analysis</span>
          <span className="text-[10px] text-[#6B6870]">Impact on IRR per variable shift</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Variable', 'Base Case', 'Bear Case', 'Bull Case', 'IRR Impact'].map((h) => (
                  <th key={h} className="text-left pb-3 text-[11px] font-bold uppercase tracking-widest text-[#6B6870] pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_SENSITIVITY.map((row, i) => (
                <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-6 font-semibold text-white">{row.variable}</td>
                  <td className="py-3 pr-6 font-mono text-[#C0BEC2] tabular-nums">{row.base}</td>
                  <td className="py-3 pr-6 font-mono text-red-400 tabular-nums">{row.bear}</td>
                  <td className="py-3 pr-6 font-mono text-[#6E7480] tabular-nums">{row.bull}</td>
                  <td className="py-3 pr-6">
                    <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-2 py-0.5 font-mono tabular-nums">
                      {row.irrImpact}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
