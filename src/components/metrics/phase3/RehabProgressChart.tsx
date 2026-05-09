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
} from 'recharts';
import { motion } from 'framer-motion';
import { CostEntry } from '@/types/schema';

interface RehabProgressChartProps {
  projectedRehabCost: number;
  costs: CostEntry[];
  className?: string;
  isLoading?: boolean;
}

interface CategoryRow {
  category: string;
  budget: number;
  approved: number;
  spent: number;
  variance: number;
  overBudget: boolean;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function buildCategoryData(projectedRehabCost: number, costs: CostEntry[]): CategoryRow[] {
  const categories = ['Plumbing', 'Electrical', 'Framing', 'HVAC', 'Foundation', 'Other'] as const;
  const categoryBudgetShare: Record<string, number> = {
    Plumbing: 0.18,
    Electrical: 0.15,
    Framing: 0.20,
    HVAC: 0.17,
    Foundation: 0.15,
    Other: 0.15,
  };

  return categories.map((cat) => {
    const catCosts = costs.filter((c) => (c.category ?? 'Other') === cat);
    const budget = projectedRehabCost * (categoryBudgetShare[cat] ?? 0.15);
    const approved = catCosts.filter((c) => c.status === 'Approved' || c.approved).reduce((s, c) => s + c.amount, 0);
    const spent = approved;
    const variance = budget - spent;
    return {
      category: cat,
      budget: Math.round(budget),
      approved: Math.round(approved),
      spent: Math.round(spent),
      variance: Math.round(variance),
      overBudget: spent > budget * 1.1,
    };
  });
}

interface RehabTooltipEntry { name: string; value: number; fill?: string }
interface RehabTooltipProps { active?: boolean; payload?: RehabTooltipEntry[]; label?: string }
function RehabTooltip({ active, payload, label }: RehabTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg shadow-lg px-4 py-3 text-xs" style={{ background: 'var(--pw-surface)', border: '1px solid var(--pw-border)' }}>
      <p className="font-semibold mb-2" style={{ color: 'var(--pw-fg)' }}>{label}</p>
      {payload.map((entry, i: number) => (
        <div key={i} className="flex justify-between gap-6">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: entry.fill }} />
            <span style={{ color: 'var(--pw-muted)' }}>{entry.name}:</span>
          </div>
          <span className="font-mono font-bold" style={{ color: 'var(--pw-fg)' }}>{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RehabProgressChart({ projectedRehabCost, costs, className = '', isLoading = false }: RehabProgressChartProps) {
  const data = useMemo(() => buildCategoryData(projectedRehabCost, costs), [projectedRehabCost, costs]);

  const totalBudget = projectedRehabCost;
  const totalApproved = useMemo(() => costs.filter((c) => c.status === 'Approved' || c.approved).reduce((s, c) => s + c.amount, 0), [costs]);
  const totalSpent = totalApproved;
  const totalVariance = totalBudget - totalSpent;
  const pctComplete = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const isOverBudget = totalSpent > totalBudget * 1.1;

  if (isLoading) {
    return (
      <div className={`rounded-lg p-6 ${className}`} style={{ background: 'var(--pw-surface)' }}>
        <div className="animate-shimmer h-5 w-40 rounded mb-4" />
        <div className="animate-shimmer h-48 w-full rounded" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg p-6 ${className}`}
      style={{
        background: 'var(--pw-surface)',
        border: `1px solid ${isOverBudget ? '#ef4444' : 'var(--pw-border)'}`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="ag-label" style={{ color: 'var(--pw-muted)' }}>Rehab Budget Tracker</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--pw-subtle)' }}>Budget vs Approved vs Spent by category</p>
        </div>
        {isOverBudget && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Over Budget &gt;10%
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--pw-muted)' }}>
          <span>Overall Progress</span>
          <span className="font-mono font-semibold" style={{ color: 'var(--pw-fg)' }}>{pctComplete.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--pw-border)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pctComplete}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full rounded-full"
            style={{ background: isOverBudget ? '#ef4444' : 'var(--pw-accent)' }}
          />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--pw-border)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 9, fill: 'var(--pw-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 9, fill: 'var(--pw-muted)', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={70}
          />
          <Tooltip content={<RehabTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="rect"
            iconSize={8}
            wrapperStyle={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 12 }}
          />
          <Bar dataKey="budget" name="Budget" fill="var(--pw-border)" radius={[0, 3, 3, 0]} maxBarSize={10} />
          <Bar dataKey="approved" name="Approved" fill="var(--pw-muted)" radius={[0, 3, 3, 0]} maxBarSize={10} />
          <Bar dataKey="spent" name="Spent" fill="var(--pw-accent)" radius={[0, 3, 3, 0]} maxBarSize={10} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-4 gap-3 pt-4" style={{ borderTop: '1px solid var(--pw-border)' }}>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-fg)' }}>{fmt(totalBudget)}</p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Total Budget</p>
        </div>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-fg)' }}>{fmt(totalApproved)}</p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Approved</p>
        </div>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-accent)' }}>{fmt(totalSpent)}</p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Spent</p>
        </div>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: totalVariance >= 0 ? '#22c55e' : '#ef4444' }}>
            {totalVariance >= 0 ? '+' : ''}{fmt(totalVariance)}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Variance</p>
        </div>
      </div>
    </div>
  );
}
