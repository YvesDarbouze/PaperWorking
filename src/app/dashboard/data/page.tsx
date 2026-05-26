'use client';

import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  TrendingUp,
  PieChart,
  BarChart3,
  Activity,
  DollarSign,
  ArrowUpRight,
  Download,
} from 'lucide-react';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { useProjectStore } from '@/store/projectStore';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import type { Project } from '@/types/schema';

// ─── Design tokens ────────────────────────────────────────────
const T = {
  teal: '#2dd4bf',
  purple: '#818cf8',
  amber: '#fbbf24',
  red: '#f87171',
  canvas: '#0b141a',
  surface: 'rgba(24,33,39,0.7)',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#dae4ec',
  textMuted: '#64748b',
  textVariant: '#bacac5',
  tooltipBg: '#182127',
  tooltipBorder: 'rgba(45,212,191,0.2)',
} as const;

// ─── Demo / fallback data ─────────────────────────────────────
const DEMO_ROI_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DEMO_ROI_VALUES = [920000, 940000, 910000, 970000, 985000, 1020000, 1050000, 1080000, 1100000, 1150000, 1190000, 1240000];

const DEMO_ALLOCATION = [
  { value: 45, name: 'Fix & Flip', itemStyle: { color: T.teal } },
  { value: 35, name: 'Buy & Hold', itemStyle: { color: T.purple } },
  { value: 20, name: 'BRRRR', itemStyle: { color: T.amber } },
];

const DEMO_CAP_MARKETS = ['Indianapolis', 'Memphis', 'Birmingham', 'Kansas City', 'Nashville'];
const DEMO_CAP_VALUES = [8.1, 7.8, 7.2, 6.9, 6.4];

const DEMO_COC_PERIODS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const DEMO_COC_VALUES = [6.2, 7.1, 6.8, 8.2, 7.9, 8.4, 9.1, 8.8, 9.4];

const DEMO_VELOCITY_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const DEMO_VELOCITY_OPENED = [1, 2, 1, 2];
const DEMO_VELOCITY_CLOSED = [0, 1, 0, 1];

const DEMO_WATERFALL_LABELS = ['Gross Rent', 'Operating Exp.', 'Debt Service', 'Net Cash Flow'];
const DEMO_WATERFALL_VALUES = [1200000, -342000, -189000, 669000];

const PERIOD_TABS = [
  { id: 'ytd', label: 'YTD' },
  { id: '6m', label: '6M' },
  { id: '3m', label: '3M' },
  { id: '30d', label: '30D' },
  { id: '12m', label: '12M' },
  { id: 'all', label: 'All Time' },
] as const;

type PeriodId = typeof PERIOD_TABS[number]['id'];
type Scope = 'property' | 'myShare';

// ─── Shared ECharts defaults ──────────────────────────────────
const TOOLTIP_BASE = {
  backgroundColor: T.tooltipBg,
  borderColor: T.tooltipBorder,
  borderWidth: 1,
  textStyle: { color: T.textPrimary, fontSize: 12, fontFamily: 'JetBrains Mono, monospace' },
  extraCssText: 'border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.4)',
};

const AXIS_LABEL_STYLE = { color: T.textMuted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' };

// ─── Formatters ───────────────────────────────────────────────
function fmtK(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

function fmtPct(v: number | null, decimals = 2): string {
  if (v === null) return '—';
  return `${v.toFixed(decimals)}%`;
}

// ─── Loading skeleton ─────────────────────────────────────────
function ChartSkeleton({ height }: { height: number }) {
  return <div className="animate-pulse rounded-xl bg-white/5" style={{ height }} />;
}

// ─── Glass card wrapper ───────────────────────────────────────
function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 overflow-hidden ${className}`}
      style={{ background: T.surface, backdropFilter: 'blur(24px)' }}
    >
      {children}
    </div>
  );
}

// ─── Card header ──────────────────────────────────────────────
function CardHeader({
  icon,
  title,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(45,212,191,0.12)' }}>
          {icon}
        </div>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: T.textVariant }}>
          {title}
        </span>
      </div>
      {badge && <div>{badge}</div>}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <GlassCard className="flex flex-col gap-1 px-5 py-5">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: T.textMuted }}>
        {label}
      </span>
      <span className="text-2xl font-mono font-semibold tracking-tight" style={{ color: T.textPrimary }}>
        {value}
      </span>
      {sub && <span className="text-[10px] font-mono" style={{ color: T.textMuted }}>{sub}</span>}
    </GlassCard>
  );
}

// ─── ROI Trend chart ──────────────────────────────────────────
function RoiTrendChart({
  snapshots,
  loading,
}: {
  snapshots: ReturnType<typeof usePortfolioMetricSnapshots>['snapshots'];
  loading: boolean;
}) {
  const { xLabels, values } = useMemo(() => {
    const valid = snapshots.filter((s) => s.propertyValue !== null);
    if (valid.length >= 3) {
      return {
        xLabels: valid.map((s) =>
          new Date(s.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        ),
        values: valid.map((s) => s.propertyValue as number),
      };
    }
    return { xLabels: DEMO_ROI_MONTHS, values: DEMO_ROI_VALUES };
  }, [snapshots]);

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 24, bottom: 40, left: 64 },
    tooltip: { ...TOOLTIP_BASE, trigger: 'axis', formatter: (params: { dataIndex: number; value: number }[]) => `${xLabels[params[0].dataIndex]}<br/><b>${fmtK(params[0].value)}</b>` },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: AXIS_LABEL_STYLE,
      axisLine: { lineStyle: { color: T.textMuted } },
      axisTick: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...AXIS_LABEL_STYLE, formatter: (v: number) => fmtK(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: 0.35,
        symbol: 'none',
        lineStyle: { color: T.teal, width: 2.5, shadowColor: 'rgba(45,212,191,0.5)', shadowBlur: 8 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(45,212,191,0.28)' },
              { offset: 1, color: 'rgba(45,212,191,0.01)' },
            ],
          },
        },
      },
    ],
  };

  return (
    <GlassCard className="col-span-12 lg:col-span-8">
      <CardHeader
        icon={<TrendingUp className="w-3.5 h-3.5" style={{ color: T.teal }} />}
        title="Portfolio Value Trend"
        badge={
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(45,212,191,0.15)', color: T.teal }}>
            +14.2% YTD
          </span>
        }
      />
      <div className="p-4">
        {loading ? <ChartSkeleton height={280} /> : <ReactECharts option={option} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />}
      </div>
    </GlassCard>
  );
}

// ─── Portfolio Allocation donut ───────────────────────────────
function AllocationChart({
  projects,
  loading,
}: {
  projects: Project[];
  loading: boolean;
}) {
  const { data, totalDeals } = useMemo(() => {
    if (projects.length === 0) return { data: DEMO_ALLOCATION, totalDeals: 8 };
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const type = (p as { dealType?: string }).dealType ?? 'Other';
      counts[type] = (counts[type] ?? 0) + 1;
    }
    const palette = [T.teal, T.purple, T.amber, '#fb923c', '#a78bfa'];
    const entries = Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      itemStyle: { color: palette[i % palette.length] },
    }));
    return { data: entries, totalDeals: projects.length };
  }, [projects]);

  const option = {
    backgroundColor: 'transparent',
    tooltip: { ...TOOLTIP_BASE, formatter: (p: { name: string; value: number; percent: number }) => `${p.name}<br/><b>${p.value} deal${p.value !== 1 ? 's' : ''}</b> (${p.percent}%)` },
    legend: {
      orient: 'vertical',
      right: 8,
      top: 'center',
      textStyle: { color: T.textVariant, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
    },
    series: [
      {
        type: 'pie',
        radius: ['46%', '72%'],
        center: ['36%', '50%'],
        data,
        label: {
          show: true,
          position: 'center',
          formatter: () => `{a|${totalDeals}}\n{b|deals}`,
          rich: {
            a: { fontSize: 26, fontWeight: 700, color: T.textPrimary, fontFamily: 'JetBrains Mono, monospace', lineHeight: 34 },
            b: { fontSize: 11, color: T.textMuted, fontFamily: 'JetBrains Mono, monospace' },
          },
        },
        labelLine: { show: false },
        emphasis: { scale: true, scaleSize: 4 },
      },
    ],
  };

  return (
    <GlassCard className="col-span-12 lg:col-span-4">
      <CardHeader icon={<PieChart className="w-3.5 h-3.5" style={{ color: T.purple }} />} title="Asset Allocation" />
      <div className="p-4">
        {loading ? <ChartSkeleton height={240} /> : <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />}
      </div>
    </GlassCard>
  );
}

// ─── Cap Rate by Market horizontal bar ───────────────────────
function CapRateChart({ loading }: { loading: boolean }) {
  const option = {
    backgroundColor: 'transparent',
    grid: { top: 12, right: 64, bottom: 16, left: 110 },
    tooltip: { ...TOOLTIP_BASE, trigger: 'axis', formatter: (p: { name: string; value: number }[]) => `${p[0].name}<br/><b>${p[0].value.toFixed(1)}%</b>` },
    xAxis: {
      type: 'value',
      axisLabel: { ...AXIS_LABEL_STYLE, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      max: 10,
    },
    yAxis: {
      type: 'category',
      data: DEMO_CAP_MARKETS,
      axisLabel: AXIS_LABEL_STYLE,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: DEMO_CAP_VALUES,
        barMaxWidth: 20,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: 'rgba(45,212,191,0.6)' },
              { offset: 1, color: T.teal },
            ],
          },
        },
        label: { show: true, position: 'right', formatter: (p: { value: number }) => `${p.value}%`, color: T.textMuted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
      },
    ],
  };

  return (
    <GlassCard className="col-span-12 lg:col-span-6">
      <CardHeader icon={<BarChart3 className="w-3.5 h-3.5" style={{ color: T.teal }} />} title="Cap Rate by Market" />
      <div className="p-4">
        {loading ? <ChartSkeleton height={240} /> : <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />}
      </div>
    </GlassCard>
  );
}

// ─── Cash-on-Cash Trend area line ─────────────────────────────
function CocTrendChart({
  snapshots,
  loading,
}: {
  snapshots: ReturnType<typeof usePortfolioMetricSnapshots>['snapshots'];
  loading: boolean;
}) {
  const { xLabels, values } = useMemo(() => {
    const valid = snapshots.filter((s) => s.cashOnCashReturn !== null);
    if (valid.length >= 4) {
      return {
        xLabels: valid.map((s) =>
          new Date(s.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        ),
        values: valid.map((s) => parseFloat((s.cashOnCashReturn as number).toFixed(2))),
      };
    }
    return { xLabels: DEMO_COC_PERIODS, values: DEMO_COC_VALUES };
  }, [snapshots]);

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 24, bottom: 40, left: 56 },
    tooltip: { ...TOOLTIP_BASE, trigger: 'axis', formatter: (p: { dataIndex: number; value: number }[]) => `${xLabels[p[0].dataIndex]}<br/><b>${p[0].value.toFixed(1)}% CoC</b>` },
    xAxis: {
      type: 'category',
      data: xLabels,
      axisLabel: AXIS_LABEL_STYLE,
      axisLine: { lineStyle: { color: T.textMuted } },
      axisTick: { show: false },
      boundaryGap: false,
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...AXIS_LABEL_STYLE, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: 0.3,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: { color: T.purple, width: 2.5, shadowColor: 'rgba(129,140,248,0.4)', shadowBlur: 6 },
        itemStyle: { color: T.purple, borderColor: T.canvas, borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(129,140,248,0.30)' },
              { offset: 1, color: 'rgba(129,140,248,0.01)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: 8 }],
          lineStyle: { color: T.amber, width: 1.5, type: 'dashed' },
          label: { formatter: '8% target', color: T.amber, fontSize: 10, fontFamily: 'JetBrains Mono, monospace' },
        },
      },
    ],
  };

  return (
    <GlassCard className="col-span-12 lg:col-span-6">
      <CardHeader icon={<ArrowUpRight className="w-3.5 h-3.5" style={{ color: T.purple }} />} title="Cash-on-Cash Trend" />
      <div className="p-4">
        {loading ? <ChartSkeleton height={240} /> : <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />}
      </div>
    </GlassCard>
  );
}

// ─── Deal Velocity grouped bar ────────────────────────────────
function DealVelocityChart({ loading }: { loading: boolean }) {
  const option = {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 24, bottom: 40, left: 40 },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['Opened', 'Closed'],
      textStyle: { color: T.textVariant, fontSize: 11 },
      top: 0,
      right: 0,
    },
    xAxis: {
      type: 'category',
      data: DEMO_VELOCITY_QUARTERS,
      axisLabel: AXIS_LABEL_STYLE,
      axisLine: { lineStyle: { color: T.textMuted } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: AXIS_LABEL_STYLE,
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    series: [
      {
        name: 'Opened',
        type: 'bar',
        data: DEMO_VELOCITY_OPENED,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: T.teal },
      },
      {
        name: 'Closed',
        type: 'bar',
        data: DEMO_VELOCITY_CLOSED,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: T.amber },
      },
    ],
  };

  return (
    <GlassCard className="col-span-12 lg:col-span-4">
      <CardHeader icon={<Activity className="w-3.5 h-3.5" style={{ color: T.amber }} />} title="Deal Velocity" />
      <div className="p-4">
        {loading ? <ChartSkeleton height={240} /> : <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />}
      </div>
    </GlassCard>
  );
}

// ─── Revenue Waterfall ────────────────────────────────────────
function WaterfallChart({
  snapshots,
  loading,
}: {
  snapshots: ReturnType<typeof usePortfolioMetricSnapshots>['snapshots'];
  loading: boolean;
}) {
  const { labels, barValues, barColors } = useMemo(() => {
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    let grossRent = 0, opEx = 0, debtSvc = 0, netCf = 0;

    if (
      latest &&
      latest.grossRentalIncome !== null &&
      latest.totalOperatingExpenses !== null &&
      latest.annualDebtService !== null &&
      latest.annualCashFlow !== null
    ) {
      grossRent = latest.grossRentalIncome;
      opEx = -Math.abs(latest.totalOperatingExpenses);
      debtSvc = -Math.abs(latest.annualDebtService ?? 0);
      netCf = latest.annualCashFlow;
    } else {
      [grossRent, opEx, debtSvc, netCf] = DEMO_WATERFALL_VALUES;
    }

    const vals = [grossRent, opEx, debtSvc, netCf];
    const colors = vals.map((v, i) =>
      i === vals.length - 1 ? T.teal : v >= 0 ? 'rgba(45,212,191,0.7)' : '#f87171'
    );

    return { labels: DEMO_WATERFALL_LABELS, barValues: vals, barColors: colors };
  }, [snapshots]);

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 24, right: 24, bottom: 40, left: 80 },
    tooltip: {
      ...TOOLTIP_BASE,
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (p: { name: string; value: number }[]) => `${p[0].name}<br/><b>${fmtK(p[0].value)}</b>`,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: AXIS_LABEL_STYLE,
      axisLine: { lineStyle: { color: T.textMuted } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...AXIS_LABEL_STYLE, formatter: (v: number) => fmtK(v) },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    series: [
      {
        type: 'bar',
        data: barValues.map((v, i) => ({ value: v, itemStyle: { color: barColors[i], borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] } })),
        barMaxWidth: 60,
        label: {
          show: true,
          position: (p: { value: number }) => (p.value >= 0 ? 'top' : 'bottom'),
          formatter: (p: { value: number }) => fmtK(p.value),
          color: T.textVariant,
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
        },
      },
    ],
  };

  return (
    <GlassCard className="col-span-12 lg:col-span-8">
      <CardHeader icon={<DollarSign className="w-3.5 h-3.5" style={{ color: T.teal }} />} title="Revenue Waterfall" />
      <div className="p-4">
        {loading ? <ChartSkeleton height={280} /> : <ReactECharts option={option} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />}
      </div>
    </GlassCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default function DataPage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const [period, setPeriod] = useState<PeriodId>('ytd');
  const [scope, setScope] = useState<Scope>('property');

  const periodTypeMap: Record<PeriodId, 'monthly' | 'quarterly' | 'annual' | undefined> = {
    '30d': 'monthly',
    '3m': 'monthly',
    '6m': 'monthly',
    ytd: 'monthly',
    '12m': 'monthly',
    all: undefined,
  };

  const { snapshots, loading } = usePortfolioMetricSnapshots(periodTypeMap[period], projects, scope);

  const kpis = useMemo(() => {
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const totalARV = projects.reduce((sum, p) => {
      const arv = (p as { financials?: { estimatedARV?: number } }).financials?.estimatedARV ?? 0;
      return sum + arv;
    }, 0);
    return {
      arv: totalARV > 0 ? fmtK(totalARV) : '$2.1M',
      noi: latest?.monthlyCashFlow != null ? fmtK(latest.monthlyCashFlow) : '$40.2k',
      capRate: latest?.capRate != null ? fmtPct(latest.capRate) : '5.85%',
      dscr: latest?.dscr != null ? `${latest.dscr.toFixed(2)}x` : '1.42x',
    };
  }, [projects, snapshots]);

  return (
    <div className="min-h-full px-6 py-8 overflow-y-auto" style={{ background: T.canvas }}>

      {/* ── Header ── */}
      <header className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] mb-1" style={{ color: T.textMuted }}>
            Portfolio Analytics
          </p>
          <h1 className="text-4xl font-extralight tracking-tight" style={{ color: T.textPrimary }}>
            Market Data
          </h1>
          <p className="text-sm mt-2" style={{ color: T.textMuted }}>
            Real-time REI metrics across your entire portfolio
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Scope toggle */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {(['property', 'myShare'] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors"
                style={{
                  background: scope === s ? 'rgba(45,212,191,0.15)' : 'transparent',
                  color: scope === s ? T.teal : T.textMuted,
                }}
              >
                {s === 'property' ? 'Property' : 'My Share'}
              </button>
            ))}
          </div>

          {/* Period tabs */}
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id)}
                className="px-3 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors"
                style={{
                  background: period === tab.id ? 'rgba(45,212,191,0.15)' : 'transparent',
                  color: period === tab.id ? T.teal : T.textMuted,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export */}
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-[11px] font-bold uppercase tracking-widest transition-colors hover:border-white/20"
            style={{ color: T.textMuted }}
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </header>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total Portfolio ARV" value={kpis.arv} sub="as-repaired value" />
        <KpiCard label="Monthly NOI" value={kpis.noi} sub="net operating income" />
        <KpiCard label="Avg Cap Rate" value={kpis.capRate} sub="portfolio weighted" />
        <KpiCard label="Avg DSCR" value={kpis.dscr} sub="debt service coverage" />
      </div>

      {/* ── Chart Grid ── */}
      <div className="grid grid-cols-12 gap-5">
        <RoiTrendChart snapshots={snapshots} loading={loading} />
        <AllocationChart projects={projects} loading={loading} />
        <CapRateChart loading={loading} />
        <CocTrendChart snapshots={snapshots} loading={loading} />
        <DealVelocityChart loading={loading} />
        <WaterfallChart snapshots={snapshots} loading={loading} />
      </div>
    </div>
  );
}
