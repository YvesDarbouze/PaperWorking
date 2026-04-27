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
  Legend,
  Line,
  ComposedChart,
  Cell,
} from 'recharts';
import { Project } from '@/types/schema';
import { calculateProjectMetrics } from '@/lib/analyticsUtils';

/* ═══════════════════════════════════════════════════════════════
   Chart 4 — Monthly Burn Rate (Premium Composed Chart)
   
   Features:
   - Burn vs. Profit comparison
   - Net Cash Flow trend line
   - Premium depth with gradients and shadows
   ═══════════════════════════════════════════════════════════════ */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthlyBurnData {
  month: string;
  fixedExpenses: number;
  netProfit: number;
  netFlow: number;
}

function buildMonthlyBurn(projects: Project[], year: number): MonthlyBurnData[] {
  const monthlyData = MONTH_LABELS.map((m) => ({
    month: m,
    fixedExpenses: 0,
    netProfit: 0,
    netFlow: 0,
  }));

  projects.forEach((deal) => {
    const metrics = calculateProjectMetrics(deal);
    const created = new Date(deal.createdAt);
    const ended = deal.financials?.soldDate ? new Date(deal.financials.soldDate) : new Date();

    // Distribute monthly burn
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(year, m, 1);
      const monthEnd = new Date(year, m + 1, 0);

      if (created <= monthEnd && ended >= monthStart) {
        monthlyData[m].fixedExpenses += Math.round(metrics.monthlyHoldingCosts);
      }
    }

    // Add profit to the month of sale
    if (deal.status === 'Sold' && deal.financials?.soldDate) {
      const soldDate = new Date(deal.financials.soldDate);
      if (soldDate.getFullYear() === year) {
        monthlyData[soldDate.getMonth()].netProfit += Math.round(metrics.netProfit);
      }
    }
  });

  // Calculate Net Flow
  return monthlyData.map(d => ({
    ...d,
    netFlow: d.netProfit - d.fixedExpenses
  }));
}

function BurnTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface/95 backdrop-blur-md border border-border-accent/40 rounded-xl shadow-2xl px-4 py-3 text-xs">
      <p className="text-text-secondary font-bold uppercase tracking-widest mb-2 border-b border-border-accent/20 pb-1.5">{label}</p>
      <div className="space-y-2">
        {payload.map((entry: any, i: number) => {
          if (entry.dataKey === 'netFlow') return null;
          return (
            <div key={i} className="flex justify-between gap-8">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-text-secondary font-medium">{entry.name}:</span>
              </div>
              <span className="font-mono font-bold text-text-primary">
                ${Math.abs(entry.value).toLocaleString()}
              </span>
            </div>
          );
        })}
        <div className="mt-2 pt-1.5 border-t border-border-accent/30 flex justify-between gap-8">
          <span className="text-text-primary font-bold uppercase tracking-tighter">Net Cash:</span>
          <span className={`font-mono font-bold ${payload[2]?.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            ${payload[2]?.value.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

interface MonthlyBurnRateProps {
  projects: Project[];
  year?: number;
}

export default function MonthlyBurnRate({ projects, year }: MonthlyBurnRateProps) {
  const currentYear = year || new Date().getFullYear();
  const data = useMemo(() => buildMonthlyBurn(projects, currentYear), [projects, currentYear]);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="profitBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111827" stopOpacity={1}/>
              <stop offset="100%" stopColor="#374151" stopOpacity={1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#6b7280', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<BurnTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 20 }}
          />
          <Bar 
            dataKey="fixedExpenses" 
            stackId="a" 
            fill="#e5e7eb" 
            name="Burn Rate" 
            radius={[0, 0, 0, 0]} 
          />
          <Bar 
            dataKey="netProfit" 
            stackId="a" 
            fill="url(#profitBar)" 
            name="Sale Profits" 
            radius={[4, 4, 0, 0]} 
          />
          <Line
            type="monotone"
            dataKey="netFlow"
            stroke="#111827"
            strokeWidth={2}
            dot={{ r: 3, fill: '#111827', strokeWidth: 0 }}
            name="Net Flow"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

