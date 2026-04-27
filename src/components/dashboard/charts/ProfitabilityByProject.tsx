'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Project } from '@/types/schema';
import { calculateProjectMetrics } from '@/lib/analyticsUtils';

/* ═══════════════════════════════════════════════════════════════
   Chart 2 — Profitability by Project (Premium Horizontal Bar Chart)
   
   Features:
   - Unified ROI/Profit logic from analyticsUtils
   - Horizontal layout for better readability of project names
   - Bi-directional bars for profits/losses
   ═══════════════════════════════════════════════════════════════ */

interface ProfitBarData {
  name: string;
  profit: number;
  roi: number;
  projectId: string;
}

function computeProfitByProject(projects: Project[], year?: number): ProfitBarData[] {
  const soldDeals = projects.filter((d: Project) => {
    if (d.status !== 'Sold' || !d.financials?.soldDate) return false;
    if (year) {
      const soldYear = new Date(d.financials.soldDate).getFullYear();
      return soldYear === year;
    }
    return true;
  });

  return soldDeals.map((deal: Project) => {
    const metrics = calculateProjectMetrics(deal);
    
    return {
      name: deal.propertyName.split(' ').slice(0, 2).join(' '),
      profit: Math.round(metrics.netProfit),
      roi: metrics.roi,
      projectId: deal.id,
    };
  }).sort((a, b) => b.profit - a.profit);
}

function ProfitTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPositive = d.profit >= 0;

  return (
    <div className="bg-bg-surface/95 backdrop-blur-sm border border-border-accent/40 rounded-xl shadow-2xl px-4 py-3 text-xs">
      <p className="text-text-primary font-bold uppercase tracking-wider mb-2 border-b border-border-accent/20 pb-1.5">{d.name}</p>
      <div className="space-y-1.5">
        <div className="flex justify-between gap-6">
          <span className="text-text-secondary font-medium">Net Profit:</span>
          <span className={`font-mono font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? '+' : '-'}${Math.abs(d.profit).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-secondary font-medium">ROI:</span>
          <span className={`font-mono font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {d.roi.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

interface ProfitabilityByProjectProps {
  projects: Project[];
  year?: number;
}

export default function ProfitabilityByProject({ projects, year }: ProfitabilityByProjectProps) {
  const data = useMemo(() => computeProfitByProject(projects, year), [projects, year]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-xs italic bg-bg-primary/30 rounded-2xl border border-dashed border-border-accent">
        No completed flips recorded {year ? `for ${year}` : ''}.
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={data.length * 50 + 60}>
        <BarChart 
          data={data} 
          layout="vertical" 
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          barGap={0}
        >
          <defs>
            <filter id="barShadow" x="-20%" y="-20%" width="140%" height={140%}>
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
              <feOffset dx="0" dy="1" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.2" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
              return `$${v}`;
            }}
          />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 10, fill: '#111827', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip content={<ProfitTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
          <ReferenceLine x={0} stroke="#111827" strokeWidth={1} />
          <Bar dataKey="profit" radius={[0, 4, 4, 0]} barSize={24}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.profit >= 0 ? '#111827' : '#ef4444'}
                filter="url(#barShadow)"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

