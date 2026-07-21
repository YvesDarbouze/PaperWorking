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
  teal: '#454955',
  brandPrimary: '#454955',
  amber: '#fbbf24',
  red: '#F06543',
  canvas: '#0d0a0b',
  surface: 'rgba(24,33,39,0.7)',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#9E9DA0',
  textMuted: '#64748b',
  textVariant: '#9E9DA0',
  tooltipBg: '#1e1b20',
  tooltipBorder: 'rgba(69,73,85,0.2)',
} as const;

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

function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'object' && 'seconds' in v) return new Date(v.seconds * 1000);
  try { return new Date(v); } catch { return null; }
}

// ─── Loading skeleton ─────────────────────────────────────────
function ChartSkeleton({ height }: { height: number }) {
  return <div className="animate-pulse rounded-xl bg-white/5" style={{ height }} />;
}

// ─── Honest empty state ───────────────────────────────────────
function EmptyChart({ message, height }: { message: string; height: number }) {
  return (
    <div
      className="flex items-center justify-center text-center px-6"
      style={{ height, color: T.textMuted, fontSize: 13 }}
    >
      {message}
    </div>
  );
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
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(69,73,85,0.12)' }}>
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
    return { xLabels: [] as string[], values: [] as number[] };
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
        lineStyle: { color: T.teal, width: 2.5, shadowColor: 'rgba(69,73,85,0.5)', shadowBlur: 8 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69,73,85,0.28)' },
              { offset: 1, color: 'rgba(69,73,85,0.01)' },
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
      />
      <div className="p-4">
        {loading ? (
          <ChartSkeleton height={280} />
        ) : xLabels.length === 0 ? (
          <EmptyChart message="No portfolio snapshots yet — add properties with values to start tracking." height={280} />
        ) : (
          <ReactECharts option={option} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />
        )}
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
    if (projects.length === 0) return { data: [] as { value: number; name: string; itemStyle: { color: string } }[], totalDeals: 0 };
    const counts: Record<string, number> = {};
    for (const p of projects) {
      const type = p.dispositionType === 'RENT'
        ? (p.subStrategy === 'BRRRR' ? 'BRRRR' : 'Rent')
        : p.dispositionType === 'LEASE' ? 'Lease' : 'Fix & Flip';
      counts[type] = (counts[type] ?? 0) + 1;
    }
    const palette = [T.teal, T.brandPrimary, T.amber, '#fb923c', '#454955'];
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
      <CardHeader icon={<PieChart className="w-3.5 h-3.5" style={{ color: T.brandPrimary }} />} title="Asset Allocation" />
      <div className="p-4">
        {loading ? (
          <ChartSkeleton height={240} />
        ) : data.length === 0 ? (
          <EmptyChart message="No projects yet." height={240} />
        ) : (
          <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />
        )}
      </div>
    </GlassCard>
  );
}

// ─── Cap Rate by Market ───────────────────────────────────────
// Derived from projects with actualRentalIncome + estimatedCurrentValue/ARV.
function CapRateChart({ projects, loading }: { projects: Project[]; loading: boolean }) {
  const { markets, values } = useMemo(() => {
    const marketMap: Record<string, { sum: number; count: number }> = {};

    for (const p of projects) {
      const annualNOI = (p.financials?.actualRentalIncome ?? 0) * 12;
      const value =
        (p.financials as any)?.estimatedCurrentValue ??
        p.financials?.estimatedARV ??
        0;
      if (annualNOI <= 0 || value <= 0) continue;

      const capRate = (annualNOI / value) * 100;
      // Extract city: "123 Main St, Dallas, TX 75001" → "Dallas"
      const parts = p.address.split(',');
      const city = (parts[1] ?? parts[0] ?? '').trim().replace(/\s+\w{2}\s+\d+.*$/, '').trim();
      if (!city) continue;

      if (!marketMap[city]) marketMap[city] = { sum: 0, count: 0 };
      marketMap[city].sum += capRate;
      marketMap[city].count++;
    }

    const entries = Object.entries(marketMap)
      .map(([city, { sum, count }]) => ({ city, capRate: sum / count }))
      .sort((a, b) => b.capRate - a.capRate)
      .slice(0, 8);

    return {
      markets: entries.map((e) => e.city),
      values: entries.map((e) => parseFloat(e.capRate.toFixed(1))),
    };
  }, [projects]);

  const option = {
    backgroundColor: 'transparent',
    grid: { top: 12, right: 64, bottom: 16, left: 110 },
    tooltip: { ...TOOLTIP_BASE, trigger: 'axis', formatter: (p: { name: string; value: number }[]) => `${p[0].name}<br/><b>${p[0].value.toFixed(1)}%</b>` },
    xAxis: {
      type: 'value',
      axisLabel: { ...AXIS_LABEL_STYLE, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
    },
    yAxis: {
      type: 'category',
      data: markets,
      axisLabel: AXIS_LABEL_STYLE,
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: values,
        barMaxWidth: 20,
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: 'rgba(69,73,85,0.6)' },
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
        {loading ? (
          <ChartSkeleton height={240} />
        ) : markets.length === 0 ? (
          <EmptyChart message="No cap rate data — add rental income and property values to your projects." height={240} />
        ) : (
          <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />
        )}
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
    return { xLabels: [] as string[], values: [] as number[] };
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
        lineStyle: { color: T.brandPrimary, width: 2.5, shadowColor: 'rgba(69,73,85,0.4)', shadowBlur: 6 },
        itemStyle: { color: T.brandPrimary, borderColor: T.canvas, borderWidth: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(69,73,85,0.30)' },
              { offset: 1, color: 'rgba(69,73,85,0.01)' },
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
      <CardHeader icon={<ArrowUpRight className="w-3.5 h-3.5" style={{ color: T.brandPrimary }} />} title="Cash-on-Cash Trend" />
      <div className="p-4">
        {loading ? (
          <ChartSkeleton height={240} />
        ) : xLabels.length === 0 ? (
          <EmptyChart message="Not enough CoC history yet — needs at least 4 monthly snapshots." height={240} />
        ) : (
          <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />
        )}
      </div>
    </GlassCard>
  );
}

// ─── Deal Velocity grouped bar ────────────────────────────────
// Opened = createdAt in quarter; Closed = Sold/Rented/closed_won + updatedAt in quarter.
function DealVelocityChart({ projects, loading }: { projects: Project[]; loading: boolean }) {
  const { quarters, opened, closed } = useMemo(() => {
    const now = new Date();
    const qs: { label: string; start: Date; end: Date }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const q = Math.floor(d.getMonth() / 3) + 1;
      const yr = d.getFullYear();
      qs.push({
        label: `Q${q} '${String(yr).slice(2)}`,
        start: new Date(yr, (q - 1) * 3, 1),
        end: new Date(yr, q * 3, 0, 23, 59, 59),
      });
    }
    const unique = qs.filter((q, i, arr) => i === arr.findIndex((x) => x.label === q.label));

    const openedCounts = unique.map((q) =>
      projects.filter((p) => {
        const d = toDate(p.createdAt);
        return d && d >= q.start && d <= q.end;
      }).length
    );
    const closedCounts = unique.map((q) =>
      projects.filter((p) => {
        if (!['Sold', 'closed_won', 'Rented'].includes(p.status)) return false;
        const d = toDate(p.updatedAt);
        return d && d >= q.start && d <= q.end;
      }).length
    );
    return { quarters: unique.map((q) => q.label), opened: openedCounts, closed: closedCounts };
  }, [projects]);

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
      data: quarters,
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
        data: opened,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: T.teal },
      },
      {
        name: 'Closed',
        type: 'bar',
        data: closed,
        barMaxWidth: 28,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: T.amber },
      },
    ],
  };

  return (
    <GlassCard className="col-span-12 lg:col-span-4">
      <CardHeader icon={<Activity className="w-3.5 h-3.5" style={{ color: T.amber }} />} title="Deal Velocity" />
      <div className="p-4">
        {loading ? (
          <ChartSkeleton height={240} />
        ) : projects.length === 0 ? (
          <EmptyChart message="No projects yet." height={240} />
        ) : (
          <ReactECharts option={option} style={{ height: 240 }} opts={{ renderer: 'canvas' }} />
        )}
      </div>
    </GlassCard>
  );
}

// ─── Revenue Waterfall ────────────────────────────────────────
const WATERFALL_LABELS = ['Gross Rent', 'Operating Exp.', 'Debt Service', 'Net Cash Flow'];

function WaterfallChart({
  snapshots,
  loading,
}: {
  snapshots: ReturnType<typeof usePortfolioMetricSnapshots>['snapshots'];
  loading: boolean;
}) {
  const { barValues, barColors, hasData } = useMemo(() => {
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    if (
      latest &&
      latest.grossRentalIncome !== null &&
      latest.totalOperatingExpenses !== null &&
      latest.annualCashFlow !== null
    ) {
      const grossRent = latest.grossRentalIncome;
      const opEx = -Math.abs(latest.totalOperatingExpenses);
      const debtSvc = -Math.abs(latest.annualDebtService ?? 0);
      const netCf = latest.annualCashFlow;
      const vals = [grossRent, opEx, debtSvc, netCf];
      const colors = vals.map((v, i) =>
        i === vals.length - 1 ? T.teal : v >= 0 ? 'rgba(69,73,85,0.7)' : T.red
      );
      return { barValues: vals, barColors: colors, hasData: true };
    }

    return { barValues: [] as number[], barColors: [] as string[], hasData: false };
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
      data: WATERFALL_LABELS,
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
        {loading ? (
          <ChartSkeleton height={280} />
        ) : !hasData ? (
          <EmptyChart message="No cash flow data yet — add rental income and expense data to your projects." height={280} />
        ) : (
          <ReactECharts option={option} style={{ height: 280 }} opts={{ renderer: 'canvas' }} />
        )}
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
    const totalARV = projects.reduce((sum, p) => sum + (p.financials?.estimatedARV ?? 0), 0);
    return {
      arv: totalARV > 0 ? fmtK(totalARV) : '—',
      noi: latest?.monthlyCashFlow != null ? fmtK(latest.monthlyCashFlow) : '—',
      capRate: latest?.capRate != null ? fmtPct(latest.capRate) : '—',
      dscr: latest?.dscr != null ? `${latest.dscr.toFixed(2)}x` : '—',
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
                  background: scope === s ? 'rgba(69,73,85,0.15)' : 'transparent',
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
                  background: period === tab.id ? 'rgba(69,73,85,0.15)' : 'transparent',
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
        <CapRateChart projects={projects} loading={loading} />
        <CocTrendChart snapshots={snapshots} loading={loading} />
        <DealVelocityChart projects={projects} loading={loading} />
        <WaterfallChart snapshots={snapshots} loading={loading} />
      </div>
    </div>
  );
}
