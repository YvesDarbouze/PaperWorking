'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Tooltip,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, Home, Building2 } from 'lucide-react';
import type { ZipDemographics, MarketDataPoint } from '@/types/marketVitals';

// ── Helpers ───────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n.toLocaleString('en-US')}`;
}

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString('en-US');
}

function growthColor(pct: number): string {
  if (pct > 0) return '#16a34a';
  if (pct < 0) return '#dc2626';
  return 'var(--text-secondary)';
}

function growthBg(pct: number): string {
  if (pct > 0) return '#f0fdf4';
  if (pct < 0) return '#fef2f2';
  return 'var(--bg-canvas)';
}

// ── Inline Sparkline ──────────────────────────────────────────

interface SparklineProps {
  data: MarketDataPoint[];
  color: string;
  height?: number;
}

function Sparkline({ data, color, height = 52 }: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div
        style={{ height, background: 'var(--bg-canvas)', borderRadius: 4 }}
        className="w-full flex items-center justify-center"
      >
        <span className="text-[9px]" style={{ color: 'var(--pw-muted)' }}>
          No trend data
        </span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="10%" stopColor={color} stopOpacity={0.18} />
            <stop offset="90%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const pt = payload[0].payload as MarketDataPoint;
            return (
              <div
                className="text-[9px] font-mono px-2 py-1 rounded shadow-sm"
                style={{
                  background: 'var(--pw-surface)',
                  border: '1px solid var(--pw-border)',
                  color: 'var(--text-primary)',
                }}
              >
                {pt.year}: {typeof pt.value === 'number' && pt.value > 10_000
                  ? fmtCurrency(pt.value)
                  : fmtNumber(pt.value)}
              </div>
            );
          }}
          cursor={false}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── KPI Tile ──────────────────────────────────────────────────

interface KPITileProps {
  label: string;
  value: string;
  sub?: string;
  growthPct?: number;
  growthLabel?: string;
  trend: MarketDataPoint[];
  trendColor: string;
  icon: React.ReactNode;
}

function KPITile({
  label,
  value,
  sub,
  growthPct,
  growthLabel,
  trend,
  trendColor,
  icon,
}: KPITileProps) {
  const hasGrowth = growthPct !== undefined;
  const GrowthIcon =
    !hasGrowth ? Minus : growthPct > 0 ? TrendingUp : growthPct < 0 ? TrendingDown : Minus;

  return (
    <div
      className="flex flex-col justify-between p-5 min-h-[160px]"
      style={{ background: 'var(--pw-surface)' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-7 h-7 rounded"
            style={{ background: 'var(--bg-canvas)' }}
          >
            {icon}
          </div>
          <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--pw-muted)' }}>
            {label}
          </p>
        </div>
        {hasGrowth && (
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded shrink-0"
            style={{ background: growthBg(growthPct!), color: growthColor(growthPct!) }}
          >
            <GrowthIcon className="w-2.5 h-2.5" aria-hidden="true" />
            <span className="text-[9px] font-bold">
              {growthPct! >= 0 ? '+' : ''}{growthPct!.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-2">
        <p
          className="text-xl font-normal tracking-tighter"
          style={{ color: 'var(--pw-black)', fontFamily: 'ui-monospace, monospace' }}
        >
          {value}
        </p>
        {sub && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--pw-muted)' }}>
            {sub}
          </p>
        )}
        {growthLabel && (
          <p className="text-[8px] font-bold uppercase tracking-widest mt-1" style={{ color: 'var(--pw-border)' }}>
            {growthLabel}
          </p>
        )}
      </div>

      {/* Sparkline */}
      <div className="mt-3">
        <Sparkline data={trend} color={trendColor} height={48} />
      </div>
    </div>
  );
}

// ── Shimmer skeleton ──────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--pw-border)', background: 'var(--pw-surface)' }}
    >
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--bg-canvas)' }}>
        <div className="h-3 w-32 animate-shimmer rounded" />
      </div>
      <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--bg-canvas)' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 space-y-3" style={{ background: 'var(--pw-surface)' }}>
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 animate-shimmer rounded" />
              <div className="h-4 w-12 animate-shimmer rounded" />
            </div>
            <div className="h-6 w-24 animate-shimmer rounded" />
            <div className="h-12 animate-shimmer rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export interface MarketVitalsCardProps {
  demographics: ZipDemographics | null;
  isLoading?: boolean;
  className?: string;
}

export default function MarketVitalsCard({
  demographics,
  isLoading = false,
  className = '',
}: MarketVitalsCardProps) {
  const tiles = useMemo<KPITileProps[]>(() => {
    if (!demographics) return [];

    const pop = demographics.population;
    const income = demographics.medianHouseholdIncome;
    const latestPop = pop.length > 0 ? pop[pop.length - 1].value : 0;
    const ownerPct = demographics.ownerOccupiedPct ?? 0;
    const renterPct = demographics.renterOccupiedPct ?? 0;

    // Compute 5yr income growth from the trend array
    const incomeSorted = [...income].sort((a, b) => a.year - b.year);
    const latestIncomePoint = incomeSorted[incomeSorted.length - 1];
    const latestIncome = demographics.medianIncomeCurrent || latestIncomePoint?.value || 0;
    const cutoff = (latestIncomePoint?.year ?? 2023) - 5;
    const baselineIncome =
      incomeSorted.find((p) => p.year >= cutoff) ?? incomeSorted[0];
    const incomeGrowth5yr =
      baselineIncome && baselineIncome.value > 0
        ? Math.round(
            ((latestIncome - baselineIncome.value) / baselineIncome.value) * 10000,
          ) / 100
        : 0;

    return [
      {
        label: 'Population',
        value: fmtNumber(latestPop),
        sub: demographics.medianAge ? `Median age ${demographics.medianAge}` : undefined,
        growthPct: demographics.populationGrowth5yr,
        growthLabel: '5-yr growth',
        trend: pop,
        trendColor: demographics.populationGrowth5yr >= 0 ? '#1a73e8' : '#dc2626',
        icon: <Users className="w-3.5 h-3.5" style={{ color: '#1a73e8' }} />,
      },
      {
        label: 'Median HH Income',
        value: fmtCurrency(latestIncome),
        sub: `ACS ${income.length > 0 ? income[income.length - 1].year : '—'}`,
        growthPct: incomeGrowth5yr,
        growthLabel: '5-yr growth',
        trend: income,
        trendColor: incomeGrowth5yr >= 0 ? '#16a34a' : '#dc2626',
        icon: <DollarSign className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />,
      },
      {
        label: 'Median Home Value',
        value: demographics.medianHomeValue ? fmtCurrency(demographics.medianHomeValue) : '—',
        sub: demographics.povertyRate !== undefined ? `Poverty rate ${demographics.povertyRate}%` : undefined,
        trend: [], // no trend array for home value (single snapshot)
        trendColor: '#7f7f7f',
        icon: <Home className="w-3.5 h-3.5" style={{ color: 'var(--pw-subtle)' }} />,
      },
      {
        label: 'Owner vs Renter',
        value: ownerPct > 0 ? `${ownerPct}% own` : '—',
        sub: renterPct > 0 ? `${renterPct}% rent` : undefined,
        trend: [], // ratio — no trend
        trendColor: '#a5a5a5',
        icon: <Building2 className="w-3.5 h-3.5" style={{ color: 'var(--pw-subtle)' }} />,
      },
    ];
  }, [demographics]);

  if (isLoading) return <SkeletonCard />;

  if (!demographics) {
    return (
      <div
        className={`rounded-lg border flex items-center justify-center min-h-[120px] ${className}`}
        style={{ borderColor: 'var(--pw-border)', background: 'var(--pw-surface)' }}
      >
        <p className="text-sm" style={{ color: 'var(--pw-muted)' }}>
          Enter a ZIP code to load market vitals.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border overflow-hidden ${className}`}
      style={{ borderColor: 'var(--pw-border)', background: 'var(--pw-surface)' }}
    >
      {/* Card header */}
      <div
        className="px-5 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'var(--bg-canvas)' }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--pw-muted)' }}>
            Market Demographics — ZIP {demographics.zipCode}
          </p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--pw-border)' }}>
            Source: U.S. Census Bureau ACS 5-Year Estimates · 10-yr trend
          </p>
        </div>
        <span
          className="text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ background: 'var(--bg-canvas)', color: 'var(--pw-subtle)' }}
        >
          {demographics.source === 'census_acs' ? 'ACS Live' : demographics.source}
        </span>
      </div>

      {/* 2×2 KPI grid */}
      <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--bg-canvas)' }}>
        {tiles.map((tile) => (
          <KPITile key={tile.label} {...tile} />
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-2 border-t"
        style={{ borderColor: 'var(--bg-canvas)', background: 'var(--pw-surface)' }}
      >
        <p className="text-[8px]" style={{ color: 'var(--pw-border)' }}>
          Last fetched {new Date(demographics.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {' · '}
          Sparklines show year-over-year trend from ACS 5-yr estimates (2014–2023)
        </p>
      </div>
    </div>
  );
}
