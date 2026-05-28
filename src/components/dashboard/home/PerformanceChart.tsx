'use client';
/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */

import { useMemo, useState, useEffect } from 'react';
import { Project } from '@/types/schema';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PerformanceChart — Stitch Command Center area chart
   
   Visualizing portfolio performance over time using the 
   usePortfolioMetricSnapshots stream. Handles empty states,
   glass-card styles, and custom teal gradient fill/stroke.
   ═══════════════════════════════════════════════════════════════ */

interface PerformanceChartProps {
  projects: Project[];
  scope?: 'property' | 'myShare';
  period?: 'M' | 'Q' | 'Y' | 'ALL';
}

function formatCurrency(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPeriodLabel(periodStr: string): string {
  const parts = periodStr.split('-');
  if (parts.length === 2) {
    const year = parts[0];
    const secondPart = parts[1];
    const shortYear = year.slice(-2);
    
    // Check if it's quarterly, e.g. "Q1", "Q2", etc.
    if (secondPart.startsWith('Q')) {
      return `${secondPart} '${shortYear}`;
    }
    
    // Check if it's monthly
    const month = parseInt(secondPart, 10);
    if (!isNaN(month) && month >= 1 && month <= 12) {
      const date = new Date(parseInt(year, 10), month - 1, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      return `${monthName} '${shortYear}`;
    }
    
    return periodStr;
  }
  return periodStr;
}

export default function PerformanceChart({ projects, scope, period = 'ALL' }: PerformanceChartProps) {
  // Query snapshots with activePeriodType state driven by standard filters
  const [activePeriodType, setActivePeriodType] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  // Sync activePeriodType with the period prop
  useEffect(() => {
    if (period === 'Y') {
      setActivePeriodType('quarterly');
    } else if (period === 'ALL') {
      setActivePeriodType('annual');
    } else {
      setActivePeriodType('monthly');
    }
  }, [period]);

  const { snapshots, loading } = usePortfolioMetricSnapshots(activePeriodType, projects, scope);

  // Fallback mechanism to quarterly/monthly if annual/quarterly data is sparse for ALL-time period
  useEffect(() => {
    if (period === 'ALL' && !loading) {
      if (activePeriodType === 'annual' && snapshots.length < 2) {
        setActivePeriodType('quarterly');
      } else if (activePeriodType === 'quarterly' && snapshots.length < 2) {
        setActivePeriodType('monthly');
      }
    }
  }, [period, loading, snapshots.length, activePeriodType]);

  const filteredSnapshots = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    
    const now = new Date();
    let cutoff: Date | null = null;
    
    if (period === 'M') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'Q') {
      cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'Y') {
      cutoff = new Date(now.getFullYear(), 0, 1);
    }
    
    if (!cutoff) return snapshots;
    
    return snapshots.filter(s => new Date(s.date) >= cutoff);
  }, [snapshots, period]);

  const data = useMemo(() => {
    const result = [];
    let cumulative = 0;
    for (const s of filteredSnapshots) {
      // Scale cash flow to align period types mathematically
      let flow = s.monthlyCashFlow ?? 0;
      if (s.periodType === 'quarterly') {
        flow = flow * 3;
      } else if (s.periodType === 'annual') {
        flow = flow * 12;
      }
      cumulative += flow;
      result.push({
        label: formatPeriodLabel(s.period),
        value: Math.round(cumulative),
      });
    }
    return result;
  }, [filteredSnapshots]);

  const latestVal = data.length > 0 ? data[data.length - 1].value : 0;
  const firstVal = data.length > 1 ? data[0].value : 0;
  const periodChange = firstVal !== 0 ? Math.round(((latestVal - firstVal) / Math.abs(firstVal)) * 100) : 0;

  const hasData = data.some(d => d.value !== 0);

  const periodLabel = useMemo(() => {
    switch (period) {
      case 'M':
        return 'Trailing 30-day performance';
      case 'Q':
        return 'Trailing 90-day performance';
      case 'Y':
        return 'Year-to-date performance';
      default:
        return 'All-time performance';
    }
  }, [period]);

  if (loading) {
    return (
      <section className="glass-card rounded-xl overflow-hidden flex flex-col h-[450px] items-center justify-center p-6 relative border border-white/10 bg-gradient-to-br from-white/3 to-white/1 backdrop-blur-[20px] shadow-[0_0_20px_-5px_rgba(87,241,219,0.15)] luminous-glow">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#57f1db]"></div>
      </section>
    );
  }

  if (data.length === 0) {
    return (
      <section className="glass-card rounded-xl overflow-hidden flex flex-col h-[450px] justify-between p-6 relative border border-white/10 bg-gradient-to-br from-white/3 to-white/1 backdrop-blur-[20px] shadow-[0_0_20px_-5px_rgba(87,241,219,0.15)] luminous-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#57f1db]" />
            <span className="text-[12px] font-bold text-on-surface uppercase tracking-wider">
              Portfolio Performance
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-2 py-4">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">bar_chart</span>
          <p className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant">No performance data available</p>
          <p className="text-[10px] text-on-surface-variant/60 max-w-[220px] text-center">Add financial details or wait for automated monthly snapshots to generate.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-card rounded-xl overflow-hidden flex flex-col justify-between h-[450px] p-6 relative border border-white/10 bg-gradient-to-br from-white/3 to-white/1 backdrop-blur-[20px] shadow-[0_0_20px_-5px_rgba(87,241,219,0.15)] luminous-glow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-[#57f1db]" />
            <span className="text-[12px] font-bold text-on-surface uppercase tracking-wider">
              Portfolio Performance
            </span>
          </div>
          <p className="text-[12px] text-on-surface-variant/80 mt-1">
            {periodLabel} across active nodes.
          </p>
        </div>
        {hasData && (
          <span className="text-[10px] font-bold text-[#57f1db] bg-[#57f1db]/10 px-2 py-0.5 rounded-full">
            {periodChange >= 0 ? '+' : ''}{periodChange}% Period
          </span>
        )}
      </div>

      {/* Chart */}
      <div className="h-[220px] w-full flex-grow mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#57f1db" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#57f1db" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8e9196', fontSize: 8 }}
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
              itemStyle={{ color: '#57f1db', fontSize: '11px', fontWeight: 700 }}
              labelStyle={{ color: '#a1a1aa', fontSize: '9px', marginBottom: '4px' }}
              formatter={(value: any) => [formatCurrency(value as number), 'Cumulative Return']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#57f1db"
              strokeWidth={3}
              fill="url(#chartGradient)"
              dot={(props: any) => {
                const { cx, cy, index } = props;
                if (index === data.length - 1) {
                  return (
                    <g key={`dot-${index}`}>
                      <circle cx={cx} cy={cy} r={12} fill="#57f1db" opacity={0.2} />
                      <circle cx={cx} cy={cy} r={6} fill="#57f1db" />
                    </g>
                  );
                }
                return null;
              }}
              activeDot={{ r: 4, fill: '#57f1db', stroke: '#0f0f0f', strokeWidth: 2 }}
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom stat */}
      {hasData && (
        <div className="flex justify-end mt-2">
          <span className="text-[9px] text-on-surface-variant/80">
            Total Return: <strong className="text-on-surface">{formatCurrency(latestVal)}</strong>
          </span>
        </div>
      )}
    </section>
  );
}
