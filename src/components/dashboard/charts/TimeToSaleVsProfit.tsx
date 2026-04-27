'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
  ReferenceArea,
  Line,
  ComposedChart,
} from 'recharts';
import { Project } from '@/types/schema';
import { calculateProjectMetrics } from '@/lib/analyticsUtils';

/* ═══════════════════════════════════════════════════════════════
   Chart 3 — Time-to-Sale vs. Profit (Premium Scatter Plot)
   
   Features:
   - Profit decay trend line
   - "Sweet Spot" (high profit, low DOM) area highlight
   - Visual depth with custom SVG filters
   ═══════════════════════════════════════════════════════════════ */

interface ScatterPoint {
  dom: number;
  profit: number;
  roi: number;
  name: string;
  salePrice: number;
}

function buildScatterData(projects: Project[]): ScatterPoint[] {
  return projects
    .filter((d: Project) => d.status === 'Sold' && d.financials?.soldDate)
    .map((deal: Project) => {
      const metrics = calculateProjectMetrics(deal);
      
      // DOM Calculation
      const created = new Date(deal.createdAt);
      const sold = new Date(deal.financials!.soldDate!);
      const holdDays = Math.max(1, Math.round((sold.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
      const rehabDays = deal.financials?.estimatedTimelineDays || Math.round(holdDays * 0.7);
      const dom = Math.max(1, holdDays - rehabDays);

      return {
        dom,
        profit: Math.round(metrics.netProfit),
        roi: metrics.roi,
        name: deal.propertyName.split(' ').slice(0, 2).join(' '),
        salePrice: metrics.salePrice,
      };
    });
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isPositive = d.profit >= 0;

  return (
    <div className="bg-bg-surface/95 backdrop-blur-sm border border-border-accent/40 rounded-xl shadow-2xl px-4 py-3 text-xs">
      <p className="text-text-primary font-bold uppercase tracking-[0.1em] mb-2 border-b border-border-accent/20 pb-1.5">{d.name}</p>
      <div className="space-y-2">
        <div className="flex justify-between gap-8">
          <span className="text-text-secondary font-medium">Days on Market:</span>
          <span className="font-mono font-bold text-text-primary">{d.dom} Days</span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-text-secondary font-medium">Net Profit:</span>
          <span className={`font-mono font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? '+' : '-'}${Math.abs(d.profit).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-8">
          <span className="text-text-secondary font-medium">ROI:</span>
          <span className={`font-mono font-bold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {d.roi.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  const isPositive = payload.profit >= 0;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={7}
        fill={isPositive ? '#111827' : '#ef4444'}
        stroke="#fff"
        strokeWidth={2}
        className="drop-shadow-md"
      />
    </g>
  );
}

interface TimeToSaleVsProfitProps {
  projects: Project[];
}

export default function TimeToSaleVsProfit({ projects }: TimeToSaleVsProfitProps) {
  const data = useMemo(() => buildScatterData(projects), [projects]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-text-secondary text-xs italic bg-bg-primary/30 rounded-2xl border border-dashed border-border-accent">
        No sale data available for decay analysis.
      </div>
    );
  }

  // Calculate "Trend Line" points (simplified linear regression concept)
  const sortedByDOM = [...data].sort((a, b) => a.dom - b.dom);
  const trendLine = sortedByDOM.length > 1 ? [
    { dom: sortedByDOM[0].dom, profit: sortedByDOM[0].profit },
    { dom: sortedByDOM[sortedByDOM.length - 1].dom, profit: sortedByDOM[sortedByDOM.length - 1].profit }
  ] : [];

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="dom"
            name="Days on Market"
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="number"
            dataKey="profit"
            name="Net Profit"
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => {
              if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(0)}k`;
              return `$${v}`;
            }}
          />
          <ZAxis type="number" range={[100, 100]} />
          <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#111827', strokeWidth: 1 }} />
          
          {/* Sweet Spot Area Highlight */}
          <ReferenceArea 
            x1={0} x2={30} 
            y1={Math.max(...data.map(d => d.profit)) * 0.7} 
            y2={Math.max(...data.map(d => d.profit)) * 1.2} 
            fill="#111827" 
            fillOpacity={0.03}
          />
          
          <Scatter name="Projects" data={data} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

