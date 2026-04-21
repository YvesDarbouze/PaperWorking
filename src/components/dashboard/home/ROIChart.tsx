'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   ROIChart — Month-over-Month ROI from Sold Deals

   Groups sold projects by soldDate month, computes ROI per period.
   Renders a Recharts ComposedChart with bars (profit) and line (ROI %).
   ═══════════════════════════════════════════════════════════════ */

interface DataPoint {
  month: string;
  profit: number;
  roi: number;
  deals: number;
}

function computeROIData(projects: Project[]): DataPoint[] {
  const soldDeals = projects.filter(d => d.status === 'Sold' && d.financials?.actualSalePrice);
  const monthBuckets: Record<string, { totalProfit: number; totalInvested: number; count: number }> = {};

  soldDeals.forEach(deal => {
    const salePrice = deal.financials?.actualSalePrice || 0;
    const purchasePrice = deal.financials?.purchasePrice || 0;
    let totalCosts = 0;
    deal.financials?.costs?.forEach(c => { if (c.approved) totalCosts += c.amount; });
    const invested = purchasePrice + totalCosts;
    const profit = salePrice - invested;

    // Use soldDate or updatedAt as the sale date proxy
    const dateStr = deal.updatedAt || deal.createdAt;
    if (!dateStr) return;
    const date = new Date(dateStr);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthBuckets[key]) monthBuckets[key] = { totalProfit: 0, totalInvested: 0, count: 0 };
    monthBuckets[key].totalProfit += profit;
    monthBuckets[key].totalInvested += invested;
    monthBuckets[key].count += 1;
  });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return Object.entries(monthBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, data]) => {
      const [, monthIndex] = key.split('-');
      const roi = data.totalInvested > 0 ? (data.totalProfit / data.totalInvested) * 100 : 0;
      return {
        month: months[parseInt(monthIndex) - 1] || key,
        profit: Math.round(data.totalProfit),
        roi: Math.round(roi * 10) / 10,
        deals: data.count,
      };
    });
}

function formatK(val: number) {
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(0)}k`;
  return `$${val}`;
}

interface ROIChartProps {
  projects: Project[];
}

export default function ROIChart({ projects }: ROIChartProps) {
  const data = useMemo(() => computeROIData(projects), [projects]);

  return (
    <div className="ag-card bg-pw-surface border border-pw-border/10 shadow-[0_15px_30px_rgba(0,0,0,0.02)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-pw-bg flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-pw-muted" />
        </div>
        <div>
          <p className="ag-label opacity-60">Performance</p>
          <h3 className="text-2xl font-light text-pw-black tracking-tighter">ROI Timeline</h3>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-pw-muted opacity-30">
          <TrendingUp className="w-12 h-12 mb-4 stroke-1" />
          <p className="text-sm font-medium">No completed exits yet</p>
          <p className="text-xs mt-1 opacity-50">Close your first deal to see ROI data</p>
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="6 6"
                stroke="#e0e0e0"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: '#7f7f7f', fontSize: 10, fontWeight: 600 }}
                axisLine={{ stroke: '#cccccc' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: '#7f7f7f', fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatK}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fill: '#a5a5a5', fontSize: 10, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e0e0e0',
                  borderRadius: '16px',
                  padding: '12px 18px',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'profit') return [formatK(value), 'Net Profit'];
                  return [`${value}%`, 'ROI'];
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={6}
                wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 16 }}
              />
              <Bar
                yAxisId="left"
                dataKey="profit"
                fill="#595959"
                radius={[6, 6, 0, 0]}
                maxBarSize={36}
                name="Net Profit"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="roi"
                stroke="#000000"
                strokeWidth={2}
                dot={{ fill: '#000000', r: 4, strokeWidth: 0 }}
                activeDot={{ fill: '#ffffff', stroke: '#000000', strokeWidth: 2, r: 6 }}
                name="ROI %"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
