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
} from 'recharts';
import { Project } from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   Chart 1 — Projected vs. Actual Spend (Line Chart)

   X-Axis: Time (Weeks or Months of rehab)
   Y-Axis: Cumulative Dollar Amount
   Data:   Two lines per active project tracking cumulative
           budgeted renovation cost vs. cumulative actual spend.
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

  return activeDeals.map((deal: Project) => {
    const fin = deal.financials;
    const totalBudget = fin?.projectedRehabCost || fin?.estimatedARV ? (fin.estimatedARV || 0) * 0.3 : 50000;

    // Gather approved costs chronologically
    const approvedCosts = (fin?.costs || [])
      .filter((c) => c.approved)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Add rehab expenses
    const rehabExpenses = (deal.rehabExpenses || [])
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Determine timeline
    const timelineDays = fin?.estimatedTimelineDays || 120;
    const totalWeeks = Math.max(4, Math.ceil(timelineDays / 7));
    const weeklyBudget = totalBudget / totalWeeks;

    // Merge all actual spend entries with timestamps
    const allSpends: { date: Date; amount: number }[] = [
      ...approvedCosts.map((c) => ({ date: new Date(c.createdAt), amount: c.amount })),
      ...rehabExpenses.map((e) => ({ date: new Date(e.createdAt), amount: e.amount })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());

    const startDate = allSpends.length > 0
      ? allSpends[0].date
      : new Date(deal.createdAt);

    const data: SpendDataPoint[] = [];
    let cumulativeActual = 0;

    for (let w = 1; w <= Math.min(totalWeeks, 24); w++) {
      const weekEnd = new Date(startDate.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      const weekSpends = allSpends.filter((s) => s.date <= weekEnd);
      cumulativeActual = weekSpends.reduce((sum, s) => sum + s.amount, 0);

      data.push({
        week: `W${w}`,
        projected: Math.round(weeklyBudget * w),
        actual: Math.round(cumulativeActual),
      });
    }

    return {
      projectName: deal.propertyName.split(' ').slice(0, 2).join(' '),
      data,
    };
  });
}

/* ─── Custom Tooltip ─── */
function SpendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface border border-border-accent rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="text-text-secondary font-medium mb-1.5">{label}</p>
      {payload.map((entry, i: number) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-text-secondary">{entry.dataKey === 'projected' ? 'Budget' : 'Actual'}:</span>
          <span className="font-mono font-medium text-text-primary">
            ${entry.value.toLocaleString()}
          </span>
        </p>
      ))}
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
      <div className="flex items-center justify-center h-64 text-text-secondary text-xs">
        No active renovation projects to chart.
      </div>
    );
  }

  // Show the first active project (can be extended to tabs)
  const activeSeries = series[0];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">
          {activeSeries.projectName}
        </p>
        {series.length > 1 && (
          <span className="text-xs text-text-secondary bg-bg-primary px-2 py-0.5 rounded-full">
            +{series.length - 1} more
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={activeSeries.data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af', fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<SpendTooltip />} />
          <Legend
            iconType="circle"
            iconSize={6}
            wrapperStyle={{ fontSize: 10, fontFamily: 'Inter', paddingTop: 8 }}
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#d1d5db"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            name="Budget"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#111827"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#111827', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#111827', stroke: '#fff', strokeWidth: 2 }}
            name="Actual"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
