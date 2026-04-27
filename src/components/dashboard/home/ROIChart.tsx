'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Area,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { calculateProjectMetrics } from '@/lib/analyticsUtils';

/* ═══════════════════════════════════════════════════════════════
   ROIChart — Performance Timeline
   
   Groups sold projects by month and calculates aggregate ROI.
   Aesthetics: Gradients, Glassmorphism tooltips, Mono typography.
   ═══════════════════════════════════════════════════════════════ */

interface DataPoint {
  month: string;
  profit: number;
  roi: number;
  deals: number;
}

function computeROIData(projects: Project[]): DataPoint[] {
  const soldDeals = projects.filter(d => d.status === 'Sold');
  const monthBuckets: Record<string, { totalProfit: number; totalInvested: number; count: number }> = {};

  soldDeals.forEach(deal => {
    const metrics = calculateProjectMetrics(deal);
    
    const dateStr = deal.financials?.soldDate || deal.updatedAt || deal.createdAt;
    if (!dateStr) return;
    const date = new Date(dateStr);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthBuckets[key]) monthBuckets[key] = { totalProfit: 0, totalInvested: 0, count: 0 };
    monthBuckets[key].totalProfit += metrics.netProfit;
    monthBuckets[key].totalInvested += metrics.totalInvestment;
    monthBuckets[key].count += 1;
  });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let cumulativeProfit = 0;

  return Object.entries(monthBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const [, monthIndex] = key.split('-');
      const roi = data.totalInvested > 0 ? (data.totalProfit / data.totalInvested) * 100 : 0;
      cumulativeProfit += data.totalProfit;
      return {
        month: months[parseInt(monthIndex) - 1] || key,
        profit: Math.round(data.totalProfit),
        cumulativeProfit: Math.round(cumulativeProfit),
        roi: Math.round(roi * 10) / 10,
        deals: data.count,
      };
    });
}

function formatCurrency(val: number) {
  const absVal = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (absVal >= 1_000_000) return `${sign}$${(absVal / 1_000_000).toFixed(1)}M`;
  if (absVal >= 1_000) return `${sign}$${(absVal / 1_000).toFixed(0)}k`;
  return `${sign}$${absVal}`;
}

interface ROIChartProps {
  projects: Project[];
}

export default function ROIChart({ projects }: ROIChartProps) {
  const data = useMemo(() => computeROIData(projects), [projects]);

  return (
    <div className="w-full h-full p-6 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-bg-primary/50 flex items-center justify-center text-text-secondary group-hover:bg-pw-black group-hover:text-pw-white transition-all duration-500 shadow-sm border border-border-accent/5">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="ag-label opacity-40 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-[0.25em] text-[9px] text-pw-black">
              Performance Matrix
            </p>
            <h3 className="text-2xl font-light text-text-primary tracking-tighter">Equity Growth & ROI</h3>
          </div>
        </div>
        
        {data.length > 0 && (
          <div className="text-right hidden sm:block">
            <p className="ag-label opacity-30 text-[9px] uppercase tracking-[0.2em] font-black">Total Realized</p>
            <p className="text-2xl font-light font-mono text-text-primary tracking-tight">
              {formatCurrency(data[data.length - 1].cumulativeProfit)}
            </p>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary opacity-30">
          <TrendingUp className="w-12 h-12 mb-4 stroke-[1px]" />
          <p className="text-sm font-bold uppercase tracking-widest text-[10px]">No Realized Exits</p>
          <p className="text-[10px] mt-1 opacity-50">Close a deal to visualize portfolio performance</p>
        </div>
      ) : (
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#CCCCCC" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#CCCCCC" stopOpacity={0}/>
                </linearGradient>
                <filter id="lineShadow" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
                  <feOffset dx="0" dy="6" result="offsetblur" />
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.15" />
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#F2F2F2"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: '#7F7F7F', fontSize: 10, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#7F7F7F', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatCurrency}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#A5A5A5', fontSize: 10, fontWeight: 600, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                cursor={{ stroke: '#F2F2F2', strokeWidth: 2 }}
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '12px',
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                  padding: '16px',
                }}
                itemStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                labelStyle={{ fontSize: '9px', fontWeight: 900, color: '#7F7F7F', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.15em', borderBottom: '1px solid #F2F2F2', paddingBottom: '8px' }}
                formatter={(value: number, name: string) => {
                  if (name === 'cumulativeProfit') return [formatCurrency(value), 'TOTAL REALIZED EQUITY'];
                  if (name === 'profit') return [formatCurrency(value), 'MONTHLY NET'];
                  return [`${value}%`, 'ROI'];
                }}
              />
              
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeProfit"
                fill="url(#cumulativeGradient)"
                stroke="#CCCCCC"
                strokeWidth={1.5}
                name="cumulativeProfit"
                animationDuration={1500}
              />
              
              <Bar
                yAxisId="left"
                dataKey="profit"
                fill="#595959"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
                name="profit"
                opacity={0.9}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="roi"
                stroke="#000000"
                strokeWidth={4}
                dot={{ fill: '#000000', r: 4, strokeWidth: 0 }}
                activeDot={{ fill: '#FFFFFF', stroke: '#000000', strokeWidth: 4, r: 7 }}
                name="roi"
                filter="url(#lineShadow)"
                animationDuration={2000}
              />
              
              <Line
                yAxisId="right"
                dataKey={() => 20}
                stroke="#7F7F7F"
                strokeDasharray="6 4"
                strokeWidth={1}
                dot={false}
                activeDot={false}
                name="Benchmark (20%)"
                opacity={0.4}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Footer Stats */}
      {data.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-border-accent/5 border border-border-accent/5 rounded-xl overflow-hidden mt-8 shadow-sm">
          <div className="p-5 bg-white/50 backdrop-blur-sm group/stat">
            <p className="ag-label opacity-40 text-[8px] font-black uppercase tracking-widest group-hover/stat:opacity-100 transition-opacity">Avg. ROI</p>
            <p className="text-lg font-bold font-mono tracking-tighter">
              {(data.reduce((acc, curr) => acc + curr.roi, 0) / data.length).toFixed(1)}%
            </p>
          </div>
          <div className="p-5 bg-white/50 backdrop-blur-sm group/stat border-x border-border-accent/5">
            <p className="ag-label opacity-40 text-[8px] font-black uppercase tracking-widest group-hover/stat:opacity-100 transition-opacity">Peak Month</p>
            <p className="text-lg font-bold font-mono tracking-tighter">
              {formatCurrency(Math.max(...data.map(d => d.profit)))}
            </p>
          </div>
          <div className="p-5 bg-white/50 backdrop-blur-sm group/stat">
            <p className="ag-label opacity-40 text-[8px] font-black uppercase tracking-widest group-hover/stat:opacity-100 transition-opacity">Velocity</p>
            <p className="text-lg font-bold font-mono tracking-tighter">
              {(data.reduce((acc, curr) => acc + curr.deals, 0) / data.length).toFixed(1)}/mo
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

