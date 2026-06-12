'use client';

import React, { useMemo, useState, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import { SampleDataBanner } from '@/components/intelligence/SampleDataBanner';
import { ArrowDownRight, ArrowUpRight, Download, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useMetricSeries, useMetricCurrent, usePortfolioInputs } from '@/lib/intelligence/selectors';
import { GRMTriageTerminal } from '@/components/intelligence/GRMTriageTerminal';
import { GRMComparisonCard } from '@/components/intelligence/GRMComparisonCard';
import { useAuth } from '@/context/AuthContext';
import { useQueries } from '@tanstack/react-query';

/* ═══════════════════════════════════════════════════════════════
   GRM Intelligence Page
   Left 4/12: Hero card + context metrics
   Right 8/12: Grouped bar chart (portfolio vs market)
   Bottom: GRM by Property table
   ═══════════════════════════════════════════════════════════════ */

const defaultProperties = [
  { address: '421 Oak St, Brooklyn',      value: 485000,  annualRent: 52800, grm: 9.2,  marketGRM: 10.5, signal: 'Buy'    },
  { address: '1248 Oakwood Ave, Queens',  value: 620000,  annualRent: 59400, grm: 10.4, marketGRM: 10.5, signal: 'Hold'   },
  { address: '77 Prospect Heights, BK',   value: 890000,  annualRent: 72000, grm: 12.4, marketGRM: 10.5, signal: 'Review' },
  { address: '310 Atlantic Ave, Brooklyn',value: 340000,  annualRent: 40800, grm: 8.3,  marketGRM: 10.5, signal: 'Buy'    },
  { address: '2100 Bedford Ave, BK',      value: 575000,  annualRent: 55200, grm: 10.4, marketGRM: 10.5, signal: 'Hold'   },
];

const SIGNAL_STYLES: Record<string, string> = {
  Buy:    'bg-[#6E7480]/10 border-[#6E7480]/20 text-[#6E7480]',
  Hold:   'bg-slate-400/10 border-slate-400/20 text-[#9E9DA0]',
  Review: 'bg-amber-400/10 border-amber-400/20 text-amber-400',
};

function GroupedBarChart({ properties, whatIfGRM }: { properties: typeof defaultProperties; whatIfGRM?: number | null }) {
  const labels = properties.map((p) => p.address.split(',')[0]);
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#1e1b20',
      borderColor: 'rgba(255,255,255,0.1)',
      textStyle: { color: '#9E9DA0', fontSize: 11 },
    },
    legend: {
      top: 0,
      right: 0,
      textStyle: { color: '#9E9DA0', fontSize: 10 },
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
        itemStyle: { color: '#454955', borderRadius: [3, 3, 0, 0] },
        barMaxWidth: 28,
        label: {
          show: true,
          position: 'top',
          color: '#94a3b8',
          fontSize: 9,
          formatter: (p: any) => `${p.value}x`,
        },
        markLine: whatIfGRM != null && isFinite(whatIfGRM) && whatIfGRM > 0 ? {
          silent: true,
          symbol: ['none', 'none'],
          data: [
            {
              yAxis: Number(whatIfGRM.toFixed(1)),
              lineStyle: { color: '#fb923c', type: 'dashed', width: 2 },
              label: { show: true, position: 'insideEndTop', color: '#fb923c', fontSize: 10, formatter: `What-If (${whatIfGRM.toFixed(1)}x)` }
            }
          ]
        } : undefined
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

function EmptyState() {
  return (
    <div className="rounded-2xl border border-white/10 p-8" style={{ background: 'rgba(22,19,24,0.4)' }}>
      <div className="flex flex-col items-center justify-center gap-4 text-center border border-dashed border-white/10 rounded-xl p-12 min-h-[300px]">
        <TrendingUp className="w-12 h-12 text-slate-600" strokeWidth={1} />
        <div>
          <p className="text-sm font-semibold text-[#C0BEC2] mb-1">Awaiting Portfolio Data</p>
          <p className="text-xs text-[#6B6870] max-w-xs leading-relaxed">
            Import deal data or complete Purchase phase tasks to generate Gross Rent Multiplier analytics.
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

type Period = 'Quarter' | 'Year' | 'All Time';
type Scope = 'Property' | 'My Share';

export default function GRMIntelligencePage() {
  useAllDealsSync();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('Year');
  const [scope, setScope]   = useState<Scope>('Property');

  const grmCurrentResult = useMetricCurrent('GRM', { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const grmSeriesResult = useMetricSeries('GRM', undefined, { scope: scope === 'My Share' ? 'myShare' : 'property' });
  const portfolioInputsResult = usePortfolioInputs({ scope: scope === 'My Share' ? 'myShare' : 'property' });

  const projects = portfolioInputsResult.status === 'ready' ? portfolioInputsResult.data.projects : [];

  const uniqueZipCodes = useMemo(() => {
    const zips = new Set<string>();
    for (const p of projects) {
      if (p.zipCode) {
        zips.add(p.zipCode.trim());
      }
    }
    return Array.from(zips);
  }, [projects]);

  const marketStatsQueries = useQueries({
    queries: uniqueZipCodes.map((zip) => ({
      queryKey: ['market-stats', zip],
      queryFn: async () => {
        const token = await user?.getIdToken();
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`/api/reil/market-stats?zipCode=${zip}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to fetch stats for ${zip}`);
        return res.json();
      },
      enabled: !!user && !!zip,
      staleTime: 5 * 60 * 1000,
    })),
  });

  const zipToMarketGRM = useMemo(() => {
    const mapping: Record<string, number> = {};
    uniqueZipCodes.forEach((zip, idx) => {
      const query = marketStatsQueries[idx];
      if (query?.status === 'success' && query.data?.stats) {
        const stats = query.data.stats;
        const price = stats.saleData?.medianPrice || 0;
        const rent = stats.rentalData?.medianPrice || 0;
        if (price > 0 && rent > 0) {
          mapping[zip] = price / (rent * 12);
        }
      }
    });
    return mapping;
  }, [uniqueZipCodes, marketStatsQueries]);

  if (
    grmCurrentResult.status === 'loading' ||
    grmSeriesResult.status === 'loading' ||
    portfolioInputsResult.status === 'loading'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 flex items-center justify-center" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <p className="text-sm text-[#9E9DA0]">Loading GRM data...</p>
      </div>
    );
  }

  if (
    portfolioInputsResult.status === 'insufficient' ||
    grmCurrentResult.status === 'insufficient' ||
    grmSeriesResult.status === 'insufficient'
  ) {
    return (
      <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">GRM Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Gross Rent Multiplier</h1>
        </div>
        <EmptyState />
      </div>
    );
  }

  /* ── Interactive state from GRMTriageTerminal ── */
  const [triageGRM, setTriageGRM] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const initialGRMRef = useRef<number | null>(null);

  const handleValuesChange = useCallback((values: any) => {
    if (initialGRMRef.current === null) {
      initialGRMRef.current = values.grm;
    } else if (Math.abs(values.grm - initialGRMRef.current) > 0.01) {
      setHasInteracted(true);
    }
    setTriageGRM(values.grm);
  }, []);

  const whatIfGRM = useMemo(() => {
    if (hasInteracted && triageGRM > 0) {
      return triageGRM;
    }
    return null;
  }, [hasInteracted, triageGRM]);

  const { isUsingDemoData, currentGRM, grmChange } = useMemo(() => {
    if (
      grmSeriesResult.status === 'ready' &&
      grmCurrentResult.status === 'ready' &&
      portfolioInputsResult.status === 'ready' &&
      portfolioInputsResult.data.snapshots.length >= 2
    ) {
      const sorted = [...portfolioInputsResult.data.snapshots]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-12);
      const vals   = sorted.map((s) => s.grossRentMultiplier ?? (0)).filter(Boolean);
      if (vals.length >= 2) {
        const last = grmCurrentResult.data;
        const prev = vals[vals.length - 2] ?? last;
        return { isUsingDemoData: false, currentGRM: last, grmChange: last - prev };
      }
    }
    return { isUsingDemoData: true, currentGRM: 9.2, grmChange: -0.3 };
  }, [grmSeriesResult, grmCurrentResult, portfolioInputsResult]);

  const isDecreasing = grmChange < 0;

  const propertyRows = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return [];
    }
    const projects = portfolioInputsResult.data.projects;
    return projects.map((p) => {
      const financials = p.financials || {};
      const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
      const value = financials.estimatedCurrentValue ?? financials.estimatedARV ?? purchasePrice;
      const annualRent = (financials.monthlyGrossRent ?? 0) * 12;
      const grm = annualRent > 0 ? value / annualRent : 0;
      const marketGRM = zipToMarketGRM[p.zipCode?.trim()] ?? 10.5;
      const signal = grm === 0 ? 'Review' : grm < marketGRM * 0.9 ? 'Buy' : grm < marketGRM * 1.1 ? 'Hold' : 'Review';
      return {
        address: p.address || p.propertyName || 'Unknown Property',
        value,
        annualRent,
        grm,
        marketGRM,
        signal,
      };
    });
  }, [portfolioInputsResult, zipToMarketGRM]);

  /* ── Deals for GRMComparisonCard ── */
  const comparisonDeals = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return [];
    }
    const projects = portfolioInputsResult.data.projects;
    return projects.map((p) => {
      const financials = p.financials || {};
      const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
      const rent = (financials.monthlyGrossRent ?? 0) * 12;
      const grm = rent > 0 ? purchasePrice / rent : 0;
      return {
        id: p.id || p.address || 'unknown',
        address: p.address || p.propertyName || 'Unknown Property',
        propertyPrice: purchasePrice,
        grossAnnualRent: rent,
        grm,
      };
    });
  }, [portfolioInputsResult]);

  /* ── Portfolio-derived defaults for triage ── */
  const portfolioDefaults = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return { price: 0, rent: 0 }; // honest: no data yet
    }
    const projects = portfolioInputsResult.data.projects;
    const withPrice = projects.filter(p => (p.financials?.purchasePrice ?? (0)) > 0);
    if (withPrice.length > 0) {
      const avgPrice = withPrice.reduce((s, p) => s + (p.financials?.purchasePrice ?? (0)), 0) / withPrice.length;
      const avgRent = withPrice.reduce((s, p) => s + (p.financials?.monthlyGrossRent ?? (0)), 0) / withPrice.length;
      return { price: Math.round(avgPrice), rent: Math.round(avgRent) };
    }
    return { price: 0, rent: 0 }; // honest: no priced projects yet
  }, [portfolioInputsResult]);

  const contextMetricsData = useMemo(() => {
    if (portfolioInputsResult.status !== 'ready') {
      return { totalPropertyValue: 0, totalAnnualRent: 0, averageMarketGRM: 10.5 };
    }
    const projects = portfolioInputsResult.data.projects;
    let valSum = 0;
    let rentSum = 0;
    let marketGrmWeightSum = 0;
    let marketGrmValSum = 0;

    for (const p of projects) {
      const financials = p.financials || {};
      const factor = scope === 'My Share' ? (financials.ownershipPercentage ?? 100) / 100 : 1;
      const purchasePrice = financials.purchasePrice ?? financials.targetPrice ?? financials.targetPurchasePrice ?? 0;
      const propValue = financials.estimatedCurrentValue ?? financials.estimatedARV ?? purchasePrice;
      const rent = (financials.monthlyGrossRent ?? 0) * 12;

      valSum += propValue * factor;
      rentSum += rent * factor;

      const mGrm = zipToMarketGRM[p.zipCode?.trim()] ?? 10.5;
      marketGrmValSum += mGrm * propValue * factor;
      marketGrmWeightSum += propValue * factor;
    }

    const avgMarketGrm = marketGrmWeightSum > 0 ? marketGrmValSum / marketGrmWeightSum : 10.5;

    return {
      totalPropertyValue: valSum,
      totalAnnualRent: rentSum,
      averageMarketGRM: avgMarketGrm,
    };
  }, [portfolioInputsResult, zipToMarketGRM, scope]);

  const contextMetrics = useMemo(() => {
    const { totalPropertyValue, totalAnnualRent, averageMarketGRM } = contextMetricsData;
    return [
      {
        label: 'Current Value',
        value: totalPropertyValue >= 1_000_000
          ? `$${(totalPropertyValue / 1_000_000).toFixed(1)}M`
          : `$${(totalPropertyValue / 1000).toFixed(0)}k`,
      },
      {
        label: 'Annual Rent',
        value: totalAnnualRent >= 1_000_000
          ? `$${(totalAnnualRent / 1_000_000).toFixed(1)}M`
          : `$${(totalAnnualRent / 1000).toFixed(0)}k`,
      },
      { label: 'Portfolio GRM', value: `${currentGRM.toFixed(1)}x` },
      { label: 'Market GRM', value: `${averageMarketGRM.toFixed(1)}x` },
    ];
  }, [contextMetricsData, currentGRM]);

  return (
    <div className="min-h-full px-6 lg:px-8 py-8 space-y-6" style={{ background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[#6B6870] font-semibold uppercase tracking-widest">
            <Link href="/dashboard/reports" className="hover:text-[#6E7480] transition-colors">Reports</Link>
            <span>›</span>
            <span className="text-[#6E7480]">GRM Intelligence</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Gross Rent Multiplier</h1>
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
        <div className="md:col-span-4 space-y-4">
          <div className="rounded-xl border border-white/10 p-6 space-y-5" style={{ background: 'rgba(24,33,39,0.7)' }}>

            <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Current GRM</span>

            {/* Big number */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-5xl font-bold tabular-nums tracking-tighter transition-all" style={{ color: whatIfGRM != null ? '#fb923c' : '#6E7480' }}>
                {(whatIfGRM ?? currentGRM).toFixed(1)}
              </span>
              <span className="text-[#6B6870] text-sm">x</span>
              {whatIfGRM != null && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest uppercase" style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}>
                  WHAT-IF
                </span>
              )}
            </div>

            {/* Indicator row */}
            <div className="flex items-center gap-2">
              {whatIfGRM != null ? (
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
              <span className="text-xs text-[#6B6870]">
                Lower is better (Market: {contextMetricsData.averageMarketGRM.toFixed(1)}x)
              </span>
            </div>

            {/* Change indicator */}
            <div className={`flex items-center gap-1.5 text-sm font-bold ${isDecreasing ? 'text-[#6E7480]' : 'text-red-400'}`}>
              {isDecreasing
                ? <ArrowDownRight className="w-4 h-4" />
                : <ArrowUpRight className="w-4 h-4" />
              }
              {isDecreasing ? '' : '+'}{grmChange.toFixed(1)} vs Last Period
              <span className="text-[10px] font-normal text-[#6B6870] ml-1">(lower is better)</span>
            </div>

            {/* Formula */}
            <div className="px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B6870] mb-1">Formula</p>
              <p className="text-xs text-[#C0BEC2] font-mono">Property Value ÷ Annual Gross Rent</p>
            </div>
          </div>

          {/* Context metrics */}
          <div className="rounded-xl border border-white/10 p-5" style={{ background: 'rgba(24,33,39,0.7)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-3">Context</span>
            <div className="grid grid-cols-2 gap-3">
              {contextMetrics.map((m) => (
                <div key={m.label} className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#6B6870] mb-1">{m.label}</p>
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
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870]">Portfolio vs Market GRM</span>
            </div>
            <GroupedBarChart properties={propertyRows} whatIfGRM={whatIfGRM} />
            <p className="text-[10px] text-slate-600 mt-2">Bars below market GRM represent alpha — buying at a discount to market rent multiples.</p>
          </div>
        </div>
      </div>

      {/* ── GRM Comparison + Triage Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Multi-Property Deal Compare */}
        <GRMComparisonCard deals={comparisonDeals} marketGRM={contextMetricsData.averageMarketGRM} />

        {/* A-Phase Triage Terminal */}
        <GRMTriageTerminal
          defaultPropertyPrice={portfolioDefaults.price}
          defaultMonthlyRent={portfolioDefaults.rent}
          marketGRM={contextMetricsData.averageMarketGRM}
          maxAcceptableGRM={13}
          onValuesChange={handleValuesChange}
        />
      </div>

      {/* ── Bottom: GRM by Property Table ── */}
      <div className="rounded-xl border border-white/10 p-6" style={{ background: 'rgba(24,33,39,0.7)' }}>
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B6870] block mb-4">GRM by Property</span>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                {['Address', 'Value', 'Annual Rent', 'GRM', 'vs Market', 'Signal'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[#6B6870]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {propertyRows.map((row) => {
                const diff = row.grm - row.marketGRM;
                return (
                  <tr key={row.address} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-[#C0BEC2] font-medium">{row.address}</td>
                    <td className="py-3 px-3 text-[#9E9DA0] tabular-nums">
                      {row.value >= 1_000_000 ? `$${(row.value / 1_000_000).toFixed(2)}M` : `$${(row.value / 1000).toFixed(0)}k`}
                    </td>
                    <td className="py-3 px-3 text-[#9E9DA0] tabular-nums">
                      ${(row.annualRent / 1000).toFixed(1)}k
                    </td>
                    <td className="py-3 px-3 text-[#6E7480] font-bold tabular-nums">{row.grm.toFixed(1)}x</td>
                    <td className={`py-3 px-3 font-bold tabular-nums ${diff <= 0 ? 'text-[#6E7480]' : 'text-red-400'}`}>
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
