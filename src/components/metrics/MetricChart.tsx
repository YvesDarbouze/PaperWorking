'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricChartProps {
  series: { date: Date | string; value: number | null }[];
  timeWindow: 'individual' | 'monthly' | 'quarterly' | 'annual' | 'overall';
  scope: 'project' | 'portfolio';
  unit: '%' | 'currency' | 'ratio' | '×';
  benchmarkBands?: { min: number; max: number; label?: string; color?: string }[];
  targetLine?: { value: number; label?: string; color?: string };
  className?: string;
  loading?: boolean;
  title?: string;
}

// Helper function to format values consistently based on their unit
const formatValue = (val: number | null | undefined, unit: '%' | 'currency' | 'ratio' | '×'): string => {
  if (val === null || val === undefined) return '—';
  switch (unit) {
    case '%':
      return `${val.toFixed(2)}%`;
    case 'currency': {
      const sign = val < 0 ? '-' : '';
      const abs = Math.abs(val);
      return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }
    case 'ratio':
      return val.toFixed(2);
    case '×':
      return `${val.toFixed(2)}x`;
    default:
      return String(val);
  }
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  unit: '%' | 'currency' | 'ratio' | '×';
  timeWindow: string;
}

const CustomChartTooltip = ({ active, payload, label, unit, timeWindow }: CustomTooltipProps) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;

  let displayLabel = label;
  if (label) {
    try {
      const d = new Date(label);
      if (!isNaN(d.getTime())) {
        if (timeWindow === 'annual') {
          displayLabel = d.getFullYear().toString();
        } else if (timeWindow === 'quarterly') {
          const q = Math.floor(d.getMonth() / 3) + 1;
          displayLabel = `Q${q} ${d.getFullYear()}`;
        } else {
          displayLabel = d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
        }
      }
    } catch (_) {
      // fallback
    }
  }

  return (
    <div className="bg-pw-surface border border-pw-border p-3 shadow-md text-xs font-sans">
      <p className="font-mono text-[9px] text-pw-muted uppercase tracking-widest mb-1">
        {displayLabel}
      </p>
      <p className="font-mono font-medium text-pw-black text-xs">
        Value: {formatValue(val, unit)}
      </p>
    </div>
  );
};

export function MetricChart({
  series,
  timeWindow,
  scope,
  unit,
  benchmarkBands,
  targetLine,
  className,
  loading = false,
  title
}: MetricChartProps) {
  // Sort series chronologically to prevent rendering errors
  const sortedSeries = useMemo(() => {
    return [...series].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return timeA - timeB;
    });
  }, [series]);

  // Extract non-null points for guardrails and trend calculation
  const validPoints = useMemo(() => {
    return sortedSeries.filter((p) => p.value !== null && p.value !== undefined);
  }, [sortedSeries]);

  // Date formatter for X-Axis based on the timeWindow
  const formatXAxis = (tickItem: any) => {
    if (!tickItem) return '';

    // Handle Date object
    if (tickItem instanceof Date) {
      if (timeWindow === 'annual') return tickItem.getFullYear().toString();
      if (timeWindow === 'quarterly') {
        const q = Math.floor(tickItem.getMonth() / 3) + 1;
        return `Q${q} '${tickItem.getFullYear().toString().slice(-2)}`;
      }
      return tickItem.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
    }

    // Handle String representation
    const str = String(tickItem);
    if (/^\d{4}-Q[1-4]$/i.test(str)) {
      const [yr, qtr] = str.split('-');
      return `${qtr} '${yr.slice(-2)}`;
    }
    if (/^Q[1-4]-\d{4}$/i.test(str)) {
      const [qtr, yr] = str.split('-');
      return `${qtr} '${yr.slice(-2)}`;
    }

    try {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        if (timeWindow === 'annual') return d.getFullYear().toString();
        if (timeWindow === 'quarterly') {
          const q = Math.floor(d.getMonth() / 3) + 1;
          return `Q${q} '${d.getFullYear().toString().slice(-2)}`;
        }
        return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
      }
    } catch (_) {
      // Fallback below
    }

    return str;
  };

  // Loading state shimmer skeleton
  if (loading) {
    return (
      <div className={`border border-pw-border bg-pw-surface p-6 animate-pulse ${className ?? ''}`}>
        <div className="h-4 w-1/4 bg-pw-border/30 mb-2" />
        <div className="h-8 w-1/3 bg-pw-border/30 mb-6" />
        <div className="h-[200px] w-full bg-pw-border/10" />
      </div>
    );
  }

  // Guardrail 1: Empty Portfolio
  if (scope === 'portfolio' && (series.length === 0 || series.every(p => p.value === null))) {
    return (
      <div className={`border border-pw-border bg-pw-surface p-6 flex items-center justify-center min-h-[250px] ${className ?? ''}`}>
        <p className="text-xs font-sans font-medium uppercase tracking-widest text-pw-muted text-center max-w-sm">
          No active projects in the portfolio to display.
        </p>
      </div>
    );
  }

  const latestPoint = validPoints[validPoints.length - 1];
  const latestValFormatted = latestPoint ? formatValue(latestPoint.value, unit) : '—';
  const showChart = validPoints.length >= 2;

  // Compute trend element for KPI header (only when scope === 'project' and chart is shown)
  let trendElement = null;
  if (scope === 'project' && showChart) {
    const latestVal = validPoints[validPoints.length - 1].value!;
    const prevVal = validPoints[validPoints.length - 2].value!;
    const diff = latestVal - prevVal;
    const pctChange = prevVal !== 0 ? (diff / Math.abs(prevVal)) * 100 : 0;

    const isPositive = diff > 0;
    const isZero = diff === 0;
    const TrendIcon = isZero ? Minus : isPositive ? TrendingUp : TrendingDown;

    const trendColorClass = isZero
      ? 'text-pw-muted border-pw-border bg-pw-bg'
      : isPositive
      ? 'text-emerald-600 border-emerald-600/30 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20'
      : 'text-rose-600 border-rose-600/30 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/20';

    const absDiffFormatted = formatValue(Math.abs(diff), unit);
    const pctFormatted = `${isPositive ? '+' : ''}${pctChange.toFixed(2)}%`;

    trendElement = (
      <div className={`flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-mono font-semibold shrink-0 ${trendColorClass}`}>
        <TrendIcon className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
        <span>
          {pctFormatted} ({isPositive ? '+' : '-'}{absDiffFormatted})
        </span>
      </div>
    );
  }

  return (
    <div className={`border border-pw-border bg-pw-surface p-6 flex flex-col justify-between ${className ?? ''}`}>
      {/* Scope-based Header */}
      {scope === 'project' && (
        <div className="flex flex-col gap-1 pb-4">
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-pw-muted">
            {title || 'Project Metric'}
          </span>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-sans font-light tracking-tighter text-pw-black">
              {latestValFormatted}
            </span>
            {trendElement}
          </div>
        </div>
      )}

      {scope === 'portfolio' && (
        <div className="flex flex-col gap-1 pb-4">
          <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-pw-subtle">
            {title || 'Portfolio Aggregate Trend'}
          </span>
          {latestPoint && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-sans font-light tracking-tighter text-pw-black font-mono">
                {latestValFormatted}
              </span>
              <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-pw-muted">
                (Latest Aggregate)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Guardrail 2: Insufficient History */}
      {!showChart ? (
        <div className="flex flex-col items-center justify-center min-h-[180px] bg-pw-bg border border-pw-border p-4 mt-2">
          <p className="text-xs font-sans text-pw-muted text-center max-w-xs">
            Insufficient history to display trend chart (at least 2 data points required).
          </p>
        </div>
      ) : (
        <div className="w-full mt-2 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sortedSeries}
              margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-pw-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: 'var(--color-pw-subtle)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                axisLine={{ stroke: 'var(--color-pw-border)' }}
                tickLine={false}
                tickFormatter={formatXAxis}
              />
              <YAxis
                tick={{ fontSize: 9, fill: 'var(--color-pw-subtle)', fontFamily: 'var(--font-mono)' }}
                axisLine={{ stroke: 'var(--color-pw-border)' }}
                tickLine={false}
                tickFormatter={(v) => formatValue(v, unit)}
              />
              <Tooltip
                content={<CustomChartTooltip unit={unit} timeWindow={timeWindow} />}
                cursor={{ stroke: 'var(--color-pw-border)', strokeWidth: 1, strokeDasharray: '2 2' }}
              />

              {/* Benchmark Bands (Rendered behind the line) */}
              {benchmarkBands?.map((band, idx) => (
                <ReferenceArea
                  key={idx}
                  y1={band.min}
                  y2={band.max}
                  fill={band.color || 'var(--color-pw-muted)'}
                  fillOpacity={0.08}
                  stroke="none"
                  label={{
                    value: band.label,
                    position: 'insideLeft',
                    fill: 'var(--color-pw-subtle)',
                    fontSize: 8,
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500
                  }}
                />
              ))}

              {/* Target Line (Rendered behind the line) */}
              {targetLine && (
                <ReferenceLine
                  y={targetLine.value}
                  stroke={targetLine.color || 'var(--color-pw-accent)'}
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: targetLine.label,
                    position: 'top',
                    fill: targetLine.color || 'var(--color-pw-accent)',
                    fontSize: 8,
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 600
                  }}
                />
              )}

              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--color-pw-black)"
                strokeWidth={2.5}
                dot={{ r: 3.5, strokeWidth: 0, fill: 'var(--color-pw-black)' }}
                activeDot={{ r: 5.5, strokeWidth: 0, fill: 'var(--color-pw-accent)' }}
                connectNulls={false} // Never fabricate points for missing history
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
