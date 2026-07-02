'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronDown, BarChart2 } from 'lucide-react';
import { usePortfolioMetricSnapshots, type PortfolioMetricSnapshot } from '@/hooks/usePortfolioMetricSnapshots';

/* ═══════════════════════════════════════════════════════════════
   AnalyticsWidget
   ───────────────────────────────────────────────────────────────
   Plots a real metric time series from the portfolio snapshot
   store (same source as Insights pages).

   Honesty Rule: requires ≥ 2 non-null data points for the
   selected metric before rendering the chart. Below that threshold
   the widget shows an honest empty state — never fake dummyData.
   The "Demo" badge is removed; it only appeared over fake data.

   Metric → snapshot field mapping:
     Monthly Cash Flow  → monthlyCashFlow
     Operating Expenses → totalOperatingExpenses
     Portfolio Value    → propertyValue
   ═══════════════════════════════════════════════════════════════ */

type ChartMetric = 'Monthly Cash Flow' | 'Operating Expenses' | 'Portfolio Value';

const METRIC_FIELD: Record<ChartMetric, keyof PortfolioMetricSnapshot> = {
  'Monthly Cash Flow':  'monthlyCashFlow',
  'Operating Expenses': 'totalOperatingExpenses',
  'Portfolio Value':    'propertyValue',
};

const MIN_POINTS = 2;   // minimum non-null values needed to render the chart
const MAX_POINTS = 12;  // show at most the last 12 monthly buckets

function fmt(metric: ChartMetric, value: number): string {
  if (metric === 'Portfolio Value') {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000)    return `$${(value / 1_000).toFixed(0)}k`;
    return `$${value.toFixed(0)}`;
  }
  if (Math.abs(value) >= 10_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function Skeleton() {
  return (
    <div className="glass-card rounded-3xl p-6 h-full flex flex-col gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-28 rounded bg-white/10" />
          <div className="h-3 w-36 rounded bg-white/5" />
        </div>
        <div className="h-8 w-36 rounded-full bg-white/10" />
      </div>
      <div className="flex-1 min-h-[200px] flex items-end gap-2 pt-6">
        {[40, 65, 50, 80, 60, 90, 70].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-white/5" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function InsufficientData({ metric }: { metric: ChartMetric }) {
  return (
    <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center gap-3 text-center py-8">
      <BarChart2 className="w-8 h-8 text-on-surface-variant opacity-30" />
      <div className="space-y-1">
        <p className="font-label-md text-sm text-on-surface-variant opacity-60">
          Not enough data yet
        </p>
        <p className="font-body-sm text-xs text-on-surface-variant opacity-40 max-w-[200px]">
          {metric} needs at least {MIN_POINTS} monthly snapshots to plot a trend. Data builds as your portfolio generates history.
        </p>
      </div>
    </div>
  );
}

export default function AnalyticsWidget() {
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('Monthly Cash Flow');
  const [dropdownOpen, setDropdownOpen]     = useState(false);

  const metrics: ChartMetric[] = ['Monthly Cash Flow', 'Operating Expenses', 'Portfolio Value'];

  const { snapshots, loading } = usePortfolioMetricSnapshots('monthly');

  const { chartData, latestValue, hasEnoughData } = useMemo(() => {
    if (!snapshots || snapshots.length === 0) {
      return { chartData: [], latestValue: 0, hasEnoughData: false };
    }

    const field = METRIC_FIELD[selectedMetric];

    // Take the last MAX_POINTS monthly snapshots (already sorted ascending by hook)
    const recent = snapshots.slice(-MAX_POINTS);

    const points = recent
      .map((s) => {
        const raw = s[field];
        const value = (raw !== null && typeof raw === 'number') ? raw : null;
        const label = s.date instanceof Date
          ? s.date.toLocaleDateString('en-US', { month: 'short' })
          : s.period.slice(5);      // fallback: "01" from "2026-01"
        return { name: label, value };
      })
      .filter((p): p is { name: string; value: number } => p.value !== null);

    const hasEnoughData = points.length >= MIN_POINTS;
    const latest = points[points.length - 1]?.value ?? 0;

    return { chartData: points, latestValue: latest, hasEnoughData };
  }, [snapshots, selectedMetric]);

  if (loading) return <Skeleton />;

  const formattedValue = hasEnoughData ? fmt(selectedMetric, latestValue) : '—';

  return (
    <div className="glass-card rounded-3xl p-6 h-full flex flex-col relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Analytics</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant opacity-80">Portfolio metric history</p>
        </div>

        {/* Metric selector */}
        <div className="flex items-center gap-3">
          <span className="font-label-sm text-label-sm text-on-surface-variant hidden sm:block">Select Chart</span>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-white/10 bg-white/5 rounded-full font-label-sm text-label-sm text-on-surface hover:bg-white/10 transition-colors cursor-pointer"
            >
              {selectedMetric}
              <ChevronDown className="w-4 h-4 text-on-surface-variant" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-surface border border-white/10 rounded-xl shadow-lg overflow-hidden z-20">
                {metrics.map((m) => (
                  <button
                    key={m}
                    className="w-full text-left px-4 py-3 font-label-sm text-label-sm text-on-surface hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedMetric(m);
                      setDropdownOpen(false);
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart or honest empty state */}
      {hasEnoughData ? (
        <div className="flex-1 min-h-[250px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                stroke="#9E9DA0"
              />
              <YAxis
                fontSize={10}
                tickFormatter={(v) => fmt(selectedMetric, v)}
                tickLine={false}
                axisLine={false}
                width={64}
                stroke="#9E9DA0"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E1E1E',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
                formatter={(v) => [fmt(selectedMetric, typeof v === 'number' ? v : 0), selectedMetric]}
                itemStyle={{ color: '#FFFFFF' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#00DD94"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#00DD94', stroke: '#00DD94' }}
                activeDot={{ r: 6, fill: '#00DD94', stroke: '#FFFFFF', strokeWidth: 2 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <InsufficientData metric={selectedMetric} />
      )}

      {/* Current value readout — only when data is present */}
      {hasEnoughData && (
        <div className="absolute bottom-6 right-6 text-right z-10 pointer-events-none">
          <p className="font-display-sm text-display-sm text-primary tracking-tight glow-text-primary">
            {formattedValue}
          </p>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-1">
            Latest · {selectedMetric}
          </p>
        </div>
      )}
    </div>
  );
}
