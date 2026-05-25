'use client';

import { useMemo } from 'react';
import { Project } from '@/types/schema';
import { calculateProjectMetrics } from '@/lib/analyticsUtils';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PerformanceChart — Stitch Command Center area chart
   
   Simplified portfolio performance visualization.
   Shows cumulative profit over time from sold projects.
   Teal gradient area fill matching Luminous Glass design.
   ═══════════════════════════════════════════════════════════════ */

interface PerformanceChartProps {
  projects: Project[];
  scope?: 'property' | 'myShare';
  period?: 'M' | 'Q' | 'Y' | 'ALL';
}

interface DataPoint {
  label: string;
  value: number;
}

function computePerformanceData(projects: Project[]): DataPoint[] {
  const soldDeals = projects.filter(d => d.status === 'Sold');

  const monthBuckets: Record<string, number> = {};

  soldDeals.forEach(deal => {
    const metrics = calculateProjectMetrics(deal);
    const dateStr = (deal.financials as any)?.soldDate || deal.updatedAt || deal.createdAt;
    if (!dateStr) return;
    const date = new Date(dateStr);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthBuckets[key] = (monthBuckets[key] || 0) + metrics.netProfit;
  });

  // If no sold deals, generate placeholder flat data
  if (Object.keys(monthBuckets).length === 0) {
    const months = ['01', '03', '05', '07', '09', '11'];
    return months.map(m => ({ label: m, value: 0 }));
  }

  const sortedKeys = Object.keys(monthBuckets).sort();
  let cumulative = 0;

  return sortedKeys.map(key => {
    cumulative += monthBuckets[key];
    const monthNum = key.split('-')[1];
    return { label: monthNum, value: Math.round(cumulative) };
  });
}

function formatCurrency(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

export default function PerformanceChart({ projects, scope, period }: PerformanceChartProps) {
  const data = useMemo(() => computePerformanceData(projects), [projects]);

  const latestVal = data.length > 0 ? data[data.length - 1].value : 0;
  const firstVal = data.length > 1 ? data[0].value : 0;
  const yoyChange =
    firstVal > 0
      ? Math.round(((latestVal - firstVal) / firstVal) * 1000) / 10
      : latestVal > 0
      ? 100
      : 0;

  const hasData = data.some(d => d.value !== 0);

  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Portfolio Performance
          </span>
        </div>
        {hasData && (
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {yoyChange >= 0 ? '+' : ''}{yoyChange}% LY
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 9 }}
              interval="preserveStartEnd"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 15, 15, 0.95)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                padding: '8px 12px',
              }}
              itemStyle={{ color: '#2dd4bf', fontSize: '11px', fontWeight: 700 }}
              labelStyle={{ color: '#a1a1aa', fontSize: '9px', marginBottom: '4px' }}
              formatter={(value: any) => [formatCurrency(value as number), 'Cumulative']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2dd4bf"
              strokeWidth={2.5}
              fill="url(#perfGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#2dd4bf', stroke: '#0f0f0f', strokeWidth: 2 }}
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom stat */}
      {hasData && (
        <div className="flex justify-end mt-1">
          <span className="text-[10px] text-on-surface-variant opacity-60">
            Total: {formatCurrency(latestVal)}
          </span>
        </div>
      )}
    </div>
  );
}
