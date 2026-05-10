'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  DollarSign,
  Home,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Loader2,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  YAxis,
} from 'recharts';
import type { ZipDemographics, MarketDataPoint } from '@/types/marketVitals';

/* ═══════════════════════════════════════════════════════════════
   MarketVitals — Demographic KPI Cards with Sparklines
   
   Renders high-contrast KPI cards for a property's ZIP code:
   - 5-Year Population Growth (with 10-year sparkline)
   - Median Household Income (with 10-year sparkline)
   - Median Home Value (snapshot)
   - Poverty Rate (snapshot)
   - Median Age (snapshot)
   - Owner vs. Renter Split (snapshot)
   
   Data source: /api/market-vitals?zip=XXXXX
   Design: Follows .dashboard-context tokens from globals.css
   ═══════════════════════════════════════════════════════════════ */

interface MarketVitalsProps {
  zipCode: string;
  address?: string;
  phaseColor?: string;
}

/** Format currency without cents for large values. */
function fmtCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
}

/** Format number with comma separators. */
function fmtNumber(val: number): string {
  return new Intl.NumberFormat('en-US').format(val);
}

// ── Sparkline Sub-Component ──────────────────────────────────

interface SparklineProps {
  data: MarketDataPoint[];
  color: string;
  height?: number;
}

function Sparkline({ data, color, height = 48 }: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[9px] uppercase tracking-widest"
        style={{ height, color: 'var(--text-secondary)' }}
      >
        Insufficient data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Tooltip
          contentStyle={{
            background: '#0d0d0d',
            border: 'none',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            color: '#ffffff',
            padding: '6px 10px',
          }}
          labelFormatter={(_, payload) => {
            if (payload?.[0]) return `${payload[0].payload.year}`;
            return '';
          }}
          formatter={(value: number) => [fmtNumber(value), '']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#grad-${color.replace('#', '')})`}
          dot={false}
          activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── KPI Card Sub-Component ───────────────────────────────────

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  trend?: number; // positive = growth
  sparklineData?: MarketDataPoint[];
  sparklineColor?: string;
  accentColor: string;
}

function KPICard({
  icon,
  label,
  value,
  subtext,
  trend,
  sparklineData,
  sparklineColor,
  accentColor,
}: KPICardProps) {
  const isPositive = trend != null && trend >= 0;
  const trendColor = isPositive ? '#16A34A' : '#DC2626';

  return (
    <div
      className="flex flex-col gap-3 p-5 rounded-lg transition-shadow hover:shadow-lg"
      style={{
        background: 'var(--bg-surface, #FFFFFF)',
        border: '1px solid var(--border-ui, #A5A5A5)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: `${accentColor}12` }}
          >
            {icon}
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--text-secondary, #7F7F7F)' }}
          >
            {label}
          </span>
        </div>
        {trend != null && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums"
            style={{
              background: isPositive ? '#DCFCE7' : '#FEE2E2',
              color: trendColor,
            }}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      {/* Value */}
      <div
        className="text-2xl font-bold tabular-nums tracking-tight"
        style={{ color: 'var(--text-primary, #595959)', fontFamily: 'var(--font-sans)' }}
      >
        {value}
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length >= 2 && (
        <Sparkline
          data={sparklineData}
          color={sparklineColor || accentColor}
          height={44}
        />
      )}

      {/* Subtext */}
      {subtext && (
        <p
          className="text-[10px] font-medium"
          style={{ color: 'var(--text-secondary, #7F7F7F)' }}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────

export function MarketVitals({
  zipCode,
  address,
  phaseColor = '#595959',
}: MarketVitalsProps) {
  const [data, setData] = useState<ZipDemographics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!zipCode || !/^\d{5}$/.test(zipCode)) {
      setError('Valid 5-digit ZIP required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/market-vitals?zip=${zipCode}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Failed to fetch market data');
        return;
      }

      setData(json.demographics);
    } catch (err) {
      setError('Network error — unable to reach Census API');
    } finally {
      setLoading(false);
    }
  }, [zipCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Latest population for display
  const latestPop = data?.population?.length
    ? data.population[data.population.length - 1].value
    : 0;

  return (
    <section
      className="rounded-lg overflow-hidden shadow-sm"
      style={{
        background: 'var(--bg-surface, #FFFFFF)',
        border: '1px solid var(--border-ui, #A5A5A5)',
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-8 py-5 flex items-center justify-between"
        style={{ background: phaseColor }}
      >
        <div className="flex items-center gap-3">
          <BarChart3 className="w-4 h-4 text-white" aria-hidden="true" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            Market Vitals
          </h2>
          {data && (
            <span className="text-[9px] font-medium text-white/70 ml-2">
              ZIP {zipCode}
            </span>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
          aria-label="Refresh market data"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading' : 'Refresh'}
        </button>
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        {/* Address context */}
        {address && (
          <div className="flex items-center gap-2 mb-5 pb-4" style={{ borderBottom: '1px solid var(--border-ui)' }}>
            <MapPin className="w-4 h-4" style={{ color: phaseColor }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {address}
            </span>
          </div>
        )}

        {/* Loading state */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: phaseColor }} />
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Querying U.S. Census Bureau ACS data…
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            className="flex items-center gap-3 p-5 rounded-lg"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
          >
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">{error}</p>
              <p className="text-[10px] text-red-600 mt-1">
                Verify the ZIP code or try again. Some rural ZCTAs may lack ACS coverage.
              </p>
            </div>
          </div>
        )}

        {/* KPI Grid */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Population Growth */}
            <KPICard
              icon={<Users className="w-3.5 h-3.5" style={{ color: phaseColor }} />}
              label="Population"
              value={fmtNumber(latestPop)}
              trend={data.populationGrowth5yr}
              sparklineData={data.population}
              sparklineColor={data.populationGrowth5yr >= 0 ? '#16A34A' : '#DC2626'}
              accentColor={phaseColor}
              subtext={`5-year growth: ${data.populationGrowth5yr >= 0 ? '+' : ''}${data.populationGrowth5yr}%`}
            />

            {/* 2. Median Household Income */}
            <KPICard
              icon={<DollarSign className="w-3.5 h-3.5" style={{ color: '#1a73e8' }} />}
              label="Median HH Income"
              value={fmtCurrency(data.medianIncomeCurrent)}
              sparklineData={data.medianHouseholdIncome}
              sparklineColor="#1a73e8"
              accentColor="#1a73e8"
              subtext={`${data.medianHouseholdIncome.length}-year trend from Census ACS`}
            />

            {/* 3. Median Home Value */}
            {data.medianHomeValue != null && data.medianHomeValue > 0 && (
              <KPICard
                icon={<Home className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />}
                label="Median Home Value"
                value={fmtCurrency(data.medianHomeValue)}
                accentColor="#7C3AED"
                subtext="ACS owner-occupied estimate"
              />
            )}

            {/* 4. Poverty Rate */}
            {data.povertyRate != null && (
              <KPICard
                icon={<AlertTriangle className="w-3.5 h-3.5" style={{ color: data.povertyRate > 20 ? '#DC2626' : '#F59E0B' }} />}
                label="Poverty Rate"
                value={`${data.povertyRate}%`}
                accentColor={data.povertyRate > 20 ? '#DC2626' : '#F59E0B'}
                subtext={
                  data.povertyRate > 20
                    ? 'High — increased landlord risk'
                    : data.povertyRate > 12
                    ? 'Above national average (11.5%)'
                    : 'Below national average'
                }
              />
            )}

            {/* 5. Median Age */}
            {data.medianAge != null && data.medianAge > 0 && (
              <KPICard
                icon={<Users className="w-3.5 h-3.5" style={{ color: '#0891B2' }} />}
                label="Median Age"
                value={`${data.medianAge}`}
                accentColor="#0891B2"
                subtext={
                  data.medianAge < 30
                    ? 'Young market — rental demand likely strong'
                    : data.medianAge > 45
                    ? 'Older demographic — resale stability'
                    : 'Balanced age distribution'
                }
              />
            )}

            {/* 6. Owner vs. Renter */}
            {data.ownerOccupiedPct != null && (
              <KPICard
                icon={<Home className="w-3.5 h-3.5" style={{ color: '#059669' }} />}
                label="Tenure Split"
                value={`${data.ownerOccupiedPct}% Own`}
                accentColor="#059669"
                subtext={`${data.renterOccupiedPct ?? 0}% renter — ${
                  (data.renterOccupiedPct ?? 0) > 50
                    ? 'strong rental market'
                    : 'owner-heavy market'
                }`}
              />
            )}
          </div>
        )}

        {/* Data provenance footer */}
        {data && (
          <div
            className="mt-5 pt-4 flex items-center justify-between text-[9px] font-medium uppercase tracking-widest"
            style={{ borderTop: '1px solid var(--border-ui)', color: 'var(--text-secondary)' }}
          >
            <span>Source: U.S. Census Bureau ACS 5-Year Estimates</span>
            <span>Updated {new Date(data.lastUpdated).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </section>
  );
}
