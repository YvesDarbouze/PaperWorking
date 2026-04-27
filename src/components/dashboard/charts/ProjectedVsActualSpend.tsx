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
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Project } from '@/types/schema';
import { calculateSpendSeries } from '@/lib/analyticsUtils';

/* ═══════════════════════════════════════════════════════════════
   Chart 1 — Projected vs. Actual Spend (Premium Area/Line Chart)
   
   Features:
   - S-Curve projection logic from analyticsUtils
   - Linear gradients for "Premium" depth
   - Context-aware tooltips
   ═══════════════════════════════════════════════════════════════ */

interface SpendDataPoint {
  week: string;
  projected: number;
  actual: number;
}

interface ProjectSpendSeries {
  projectName: string;
  data: SpendDataPoint[];
}

function buildSpendSeries(projects: Project[]): ProjectSpendSeries[] {
  const activeDeals = projects.filter(
    (d: Project) => d.status === 'Renovating' || d.status === 'Under Contract'
  );

  return activeDeals.map((deal: Project) => ({
    projectName: deal.propertyName.split(' ').slice(0, 2).join(' '),
    data: calculateSpendSeries(deal) as unknown as SpendDataPoint[],
  }));
}

function SpendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface/90 backdrop-blur-md border border-border-accent/50 rounded-xl shadow-2xl px-4 py-3 text-xs">
      <p className="text-text-secondary font-bold uppercase tracking-widest mb-2 border-b border-border-accent/30 pb-1.5">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-text-secondary font-medium">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold text-text-primary">
              ${entry.value.toLocaleString()}
            </span>
          </div>
        ))}
        {payload.length === 2 && (
          <div className="mt-2 pt-1.5 border-t border-border-accent/30 flex justify-between gap-4">
            <span className="text-text-secondary italic">Variance:</span>
            <span className={`font-mono font-bold ${payload[1].value > payload[0].value ? 'text-red-500' : 'text-emerald-500'}`}>
              {payload[1].value > payload[0].value ? '+' : ''}
              {(((payload[1].value - payload[0].value) / payload[0].value) * 100).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProjectedVsActualSpendProps {
  projects: Project[];
}

export default function ProjectedVsActualSpend({ projects }: ProjectedVsActualSpendProps) {
  const series = useMemo(() => buildSpendSeries(projects), [projects]);

  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-xs italic bg-bg-primary/30 rounded-2xl border border-dashed border-border-accent">
        No active renovation projects to track.
      </div>
    );
  }

  const activeSeries = series[0];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-text-primary rounded-full" />
          <p className="text-xs font-bold text-text-primary uppercase tracking-[0.15em]">
            {activeSeries.projectName}
          </p>
        </div>
        {series.length > 1 && (
          <div className="group relative">
            <span className="text-[10px] font-bold text-text-secondary bg-bg-surface border border-border-accent px-2 py-1 rounded-md cursor-help hover:border-text-primary transition-colors">
              +{series.length - 1} OTHER DEALS
            </span>
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={activeSeries.data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#111827" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#111827" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<SpendTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="rect"
            iconSize={8}
            wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 20 }}
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            name="Budget Plan"
            animationDuration={1500}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#111827"
            strokeWidth={3}
            dot={{ r: 4, fill: '#111827', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#111827', stroke: '#fff', strokeWidth: 2, shadow: '0 4px 6px rgba(0,0,0,0.1)' }}
            name="Actual Spend"
            animationDuration={2000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

