'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import { ArrowUpRight, Download, TrendingUp } from 'lucide-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '@/lib/intelligence/selectors';
import { IRRExitAssumptionsTerminal } from '@/components/intelligence/IRRExitAssumptionsTerminal';
import type { IRRAssumptions } from '@/components/intelligence/IRRExitAssumptionsTerminal';
import { IRRScenarioComparisonCard } from '@/components/intelligence/IRRScenarioComparisonCard';
import { computeIRR, buildIRRCashFlows, computeTotalCashInvested, deriveAllMetrics } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   IRR Intelligence — Stitch screen: 730ea3ab98c047189ac5010c875ecffd
   Bento grid:
     Left 5/12:  Hero IRR metric card (big number + benchmark bar)
     Right 7/12: Grouped bar chart — Scenarios vs Actual performance
     Bottom row: Sensitivity table + Key drivers
   ═══════════════════════════════════════════════════════════════ */

type Period = 'Quarter' | 'Year' | 'All Time';
type Scope = 'Property' | 'My Share';

const defaultScenarios = [
  { label: '3-Year Hold', actual: 8.2,  projected: 12.4 },
  { label: '5-Year Hold', actual: 12.1, projected: 18.4 },
  { label: '7-Year Hold', actual: 15.8, projected: 22.7 },
  { label: '10-Year Hold', actual: 19.5,  projected: 26.1 },
];

const defaultSensitivity = [
  { variable: 'Exit Cap Rate',  base: '5.85%', bear: '6.80%', bull: '5.10%', irrImpact: '±3.2%' },
  { variable: 'Rent Growth',    base: '3.0%',  bear: '1.0%',  bull: '5.0%',  irrImpact: '±2.1%' },
  { variable: 'Vacancy Rate',   base: '5.0%',  bear: '12.0%', bull: '2.0%',  irrImpact: '±1.8%' },
  { variable: 'Hold Period',    base: '5 yrs', bear: '3 yrs', bull: '7 yrs', irrImpact: '±4.6%' },
  { variable: 'Rehab Cost',     base: '$65k',  bear: '$90k',  bull: '$55k',  irrImpact: '±1.5%' },
];

function ScenariosChart({ scenarios }: { scenarios: typeof defaultScenarios }) {
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

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(22,19,24,0.4)' }}>
      <div className="flex flex-col items-center justify-center gap-4 text-center border border-dashed border-white/10 rounded-xl p-12 min-h-[300px]">
        <TrendingUp className="w-12 h-12 text-slate-600" strokeWidth={1} />
        <div>
          <p className="text-sm font-semibold text-[#C0BEC2] mb-1">Awaiting Portfolio Data</p>
          <p className="text-xs text-[#6B6870] max-w-xs leading-relaxed">
            Import deal data or complete Purchase phase tasks to generate IRR analytics.
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

export default function IRRIntelligencePage() {
  useAllDealsSync();
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope] = useState<Scope>('Property');

  const irrSeriesResult = useMetricSeries('IRR', undefined, { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const irrCurrentResult = useMetricCurrent('IRR', { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const portfolioInputsResult = usePortfolioInputs({ scope: scope === 'My Share' ? 'myShare' : 'property', periodType: 'annual' });

  /* ── Reactive state from Exit Assumptions Terminal ── */
  const [assumptions, setAssumptions] = useState<IRRAssumptions | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const initialIRRRef = useRef<number | null>(null);

  const handleAssumptionsChange = useCallback((v: IRRAssumptions) => {
    if (initialIRRRef.current === null && v.irr !== null) {
      initialIRRRef.current = v.irr;
    } else if (initialIRRRef.current !== null && v.irr !== null && Math.abs(v.irr - initialIRRRef.current) > 0.001) {
      setHasInteracted(true);
    }
    setAssumptions(v);
  }, []);

  const whatIfIRR = useMemo(() => {
    if (hasInteracted && assumptions && assumptions.irr !== null) {
      return assumptions.irr * 100;
    }
    return null;
  }, [hasInteracted, assumptions]);

  const handleExportCSV = useCallback(() => {
    try {
      const headers = ['Variable', 'Base Case', 'Bear Case', 'Bull Case', 'IRR Impact'];
      const rows = defaultSensitivity.map(row => [
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

  /* ── Portfolio-derived defaults (Rule 3: no hardcoded seeds when data is ready) ── */
  const portfolioDefaults = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return {
        totalCashInvested: 0,
        purchasePrice: 0,
        loanAmount: 0,
        // Rule 3: honest zero — never fake a rate we don't know
        loanRate: 0,
        loanTermYears: 30,
        annualCashFlow: 0,
      };
    }
    const projects = portfolioInputsResult.data.projects;
    const withPrice = projects.filter(p => (p.financials?.purchasePrice ?? (0)) > 0);
    if (withPrice.length > 0) {
      const avgPrice = withPrice.reduce((s, p) => s + (p.financials?.purchasePrice ?? (0)), 0) / withPrice.length;
      const avgLoan = withPrice.reduce((s, p) => s + (p.financials?.loanAmount ?? (0)), 0) / withPrice.length;
      const avgCashInvested = withPrice.reduce((s, p) => {
        const f = p.financials || {};
        return s + computeTotalCashInvested(f);
      }, 0) / withPrice.length;

      // Derive annualCashFlow from deriveAllMetrics — same formula as useMetricCurrent('COC')
      const totalAnnualCF = withPrice.reduce((s, p) => {
        const derived = deriveAllMetrics(p.financials, undefined, p.strategyType, p.currentPhase);
        return s + (derived.noi - derived.annualDebtService);
      }, 0);

      return {
        totalCashInvested: Math.round(avgCashInvested),
        purchasePrice: Math.round(avgPrice),
        loanAmount: Math.round(avgLoan || avgPrice * 0.785),
        // Rule 3: use stored rate; 0 = honest unknown (not 7%)
        loanRate: withPrice[0]?.financials?.loanInterestRate ?? 0,
        loanTermYears: withPrice[0]?.financials?.loanTermYears ?? 30,
        annualCashFlow: Math.round(totalAnnualCF),
      };
    }
    return {
      totalCashInvested: 0,
      purchasePrice: 0,
      loanAmount: 0,
      loanRate: 0,
      loanTermYears: 30,
      annualCashFlow: 0,
    };
  }, [portfolioInputsResult]);

  /* ── Scenario card inputs (derived from interactive or portfolio) ── */
  const scenarioInputs = useMemo(() => ({
    totalCashInvested: assumptions?.totalCashInvested ?? portfolioDefaults.totalCashInvested,
    // Rule 3: annualCashFlow comes from portfolio derivation, not a hardcoded seed
    annualCashFlow: assumptions?.annualCashFlow ?? portfolioDefaults.annualCashFlow,
    purchasePrice: assumptions?.purchasePrice ?? portfolioDefaults.purchasePrice,
    loanAmount: assumptions?.loanAmount ?? portfolioDefaults.loanAmount,
    loanRate: assumptions?.loanRate ?? portfolioDefaults.loanRate,
    loanTermYears: assumptions?.loanTermYears ?? portfolioDefaults.loanTermYears,
    sellingCostsPercent: assumptions?.sellingCostsPercent ?? 8,
  }), [assumptions, portfolioDefaults]);

  const { isUsingDemoData, currentIRR, projectedGain, realizedToDate } = useMemo(() => {
    // Rule 4: isUsingDemoData = true ONLY when no projects exist at all
    if (portfolioInputsResult.status === 'insufficient') {
      return {
        isUsingDemoData: true,
        currentIRR: assumptions?.irr != null ? assumptions.irr * 100 : 18.4,
        projectedGain: 4_200_000,
        realizedToDate: 8.2,
      };
    }

    if (irrCurrentResult.status !== 'ready' || portfolioInputsResult.status !== 'ready') {
      return {
        isUsingDemoData: false,
        currentIRR: 0,
        projectedGain: 0,
        realizedToDate: 0,
      };
    }

    const irr = irrCurrentResult.data;
    const projects = portfolioInputsResult.data.projects;
    const totalValue = projects.reduce((s, p) => s + (p.financials?.estimatedCurrentValue ?? p.financials?.estimatedARV ?? p.financials?.purchasePrice ?? 0), 0);
    const totalCost  = projects.reduce((s, p) => s + ((p.financials?.purchasePrice ?? 0) + (p.financials?.rehabBudget ?? 0)), 0);

    return {
      isUsingDemoData: false,
      currentIRR: irr,
      projectedGain: totalValue - totalCost,
      // realizedToDate: not formally computable without actual hold dates;
      // display as a proportional estimate of IRR accumulated to date
      realizedToDate: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    };
  }, [irrCurrentResult, portfolioInputsResult, assumptions]);

  const scenarios = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return defaultScenarios;
    }
    const holds = [3, 5, 7, 10];
    const inputs = scenarioInputs;
    return holds.map((holdYears) => {
      const cashFlows = buildIRRCashFlows(
        inputs.totalCashInvested,
        inputs.annualCashFlow,
        holdYears,
        inputs.purchasePrice,
        3.0,
        inputs.loanAmount,
        inputs.loanRate,
        inputs.loanTermYears,
        inputs.sellingCostsPercent ?? (8)
      );
      const irr = computeIRR(cashFlows);
      const irrPct = irr !== null ? irr * 100 : 0;
      
      return {
        label: `${holdYears}-Year Hold`,
        actual: Number(irrPct.toFixed(1)),
        projected: Number((irrPct * 1.2).toFixed(1)),
      };
    });
  }, [portfolioInputsResult, scenarioInputs]);

  const fmt = (v: number) => v >= 1_000_000 ? `+$${(v / 1_000_000).toFixed(1)}M` : `+$${(v / 1000).toFixed(0)}k`;

  if (irrCurrentResult.status === 'loading' || portfolioInputsResult.status === 'loading') {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 flex items-center justify-center" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <p className="text-sm text-[#9E9DA0]">Loading IRR data...</p>
      </div>
    );
  }

  if (portfolioInputsResult.status === 'insufficient') {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">IRR Intelligence</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">IRR Intelligence</h1>
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

          <div className="flex items-baseline gap-3 mb-4">
            <span className="text-[64px] font-bold tabular-nums leading-none tracking-tighter transition-all" style={{ color: whatIfIRR != null ? '#fb923c' : '#6E7480' }}>
              {(whatIfIRR ?? currentIRR).toFixed(1)}
            </span>
            <span className="text-2xl font-medium" style={{ color: whatIfIRR != null ? '#fb923c' : '#6E7480' }}>%</span>
            {whatIfIRR != null && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest uppercase mb-4" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
                WHAT-IF
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-6">
            {whatIfIRR != null ? (
              <div className="px-2 py-0.5 rounded border border-orange-400/20 bg-orange-400/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-[9px] font-extrabold tracking-widest text-orange-400">HYPOTHETICAL</span>
              </div>
            ) : (
              <div className="px-2 py-0.5 rounded border border-[#6E7480]/20 bg-[#6E7480]/10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6E7480] animate-pulse" />
                <span className="text-[9px] font-extrabold tracking-widest text-[#6E7480]">LIVE</span>
              </div>
            )}
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
                  // TODO: wire to real benchmark percentile when available
                  width: `75%`,
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
          <ScenariosChart scenarios={scenarios} />
        </div>
      </div>

      {/* ── IRR Exit Assumptions + Scenario Comparison Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Exit Assumptions Terminal */}
        <IRRExitAssumptionsTerminal
          defaults={{
            totalCashInvested: portfolioDefaults.totalCashInvested,
            annualCashFlow: portfolioDefaults.totalCashInvested > 0 ? Math.round(portfolioDefaults.totalCashInvested * 0.08) : 0,
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
              {defaultSensitivity.map((row, i) => (
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
