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
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { ProjectFinancials } from '@/types/schema';

interface HoldingCostAccumulatorProps {
  financials: ProjectFinancials;
  monthsElapsed?: number;
  className?: string;
  isLoading?: boolean;
}

interface MonthPoint {
  month: string;
  projected: number;
  actual: number | null;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function buildHoldingData(financials: ProjectFinancials, monthsElapsed: number): MonthPoint[] {
  const totalMonths = financials.projectedHoldTimeMonths ?? 6;
  const monthlyTaxes = financials.holdingCostTaxes ?? 0;
  const monthlyInsurance = financials.holdingCostInsurance ?? 0;
  const monthlyUtilities = financials.holdingCostUtilities ?? 0;

  const loanBalance = financials.loanAmount ?? 0;
  const annualRate = financials.loanInterestRate ?? 0;
  const monthlyInterest = loanBalance * (annualRate / 100 / 12);

  const monthlyCost = monthlyTaxes + monthlyInsurance + monthlyUtilities + monthlyInterest;

  const points: MonthPoint[] = [];
  for (let m = 1; m <= totalMonths; m++) {
    const cumulative = monthlyCost * m;
    points.push({
      month: `M${m}`,
      projected: Math.round(cumulative),
      actual: m <= monthsElapsed ? Math.round(cumulative) : null,
    });
  }
  return points;
}

interface TooltipEntry { name: string; value: number | null; stroke?: string; fill?: string }
interface ChartTooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }

function AccumTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg shadow-lg px-4 py-3 text-xs" style={{ background: 'var(--pw-surface)', border: '1px solid var(--pw-border)' }}>
      <p className="font-semibold mb-2" style={{ color: 'var(--pw-fg)' }}>{label}</p>
      {payload.map((entry, i: number) => (
        entry.value !== null && (
          <div key={i} className="flex justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: entry.stroke }} />
              <span style={{ color: 'var(--pw-muted)' }}>{entry.name}:</span>
            </div>
            <span className="font-mono font-bold" style={{ color: 'var(--pw-fg)' }}>{fmt(entry.value)}</span>
          </div>
        )
      ))}
    </div>
  );
}

export default function HoldingCostAccumulator({ financials, monthsElapsed = 0, className = '', isLoading = false }: HoldingCostAccumulatorProps) {
  const data = useMemo(() => buildHoldingData(financials, monthsElapsed), [financials, monthsElapsed]);

  const totalMonths = financials.projectedHoldTimeMonths ?? 6;
  const monthlyTaxes = financials.holdingCostTaxes ?? 0;
  const monthlyInsurance = financials.holdingCostInsurance ?? 0;
  const monthlyUtilities = financials.holdingCostUtilities ?? 0;
  const loanBalance = financials.loanAmount ?? 0;
  const annualRate = financials.loanInterestRate ?? 0;
  const monthlyInterest = loanBalance * (annualRate / 100 / 12);
  const monthlyCost = monthlyTaxes + monthlyInsurance + monthlyUtilities + monthlyInterest;
  const projectedTotal = monthlyCost * totalMonths;
  const actualToDate = monthlyCost * monthsElapsed;

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
      style={{ background: 'var(--pw-surface)', border: '1px solid var(--pw-border)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="ag-label" style={{ color: 'var(--pw-muted)' }}>Holding Cost Accumulator</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--pw-subtle)' }}>
            Cumulative costs over {totalMonths}-month hold period
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-right"
        >
          <p className="font-mono text-xl font-semibold" style={{ color: 'var(--pw-fg)' }}>{fmt(projectedTotal)}</p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Projected Total</p>
        </motion.div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="holdGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--pw-fg)" stopOpacity={0.08} />
              <stop offset="95%" stopColor="var(--pw-fg)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--pw-border)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 9, fill: 'var(--pw-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'var(--pw-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<AccumTooltip />} cursor={{ stroke: 'var(--pw-border)', strokeWidth: 1 }} />
          {monthsElapsed > 0 && monthsElapsed <= totalMonths && (
            <ReferenceLine
              x={`M${monthsElapsed}`}
              stroke="var(--pw-accent)"
              strokeDasharray="4 2"
              label={{ value: 'Today', position: 'top', fontSize: 9, fill: 'var(--pw-accent)' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="projected"
            stroke="var(--pw-border)"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="Projected"
            animationDuration={1200}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="var(--pw-fg)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--pw-fg)', strokeWidth: 0 }}
            name="Actual"
            connectNulls={false}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-3 pt-4" style={{ borderTop: '1px solid var(--pw-border)' }}>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-fg)' }}>{fmt(monthlyCost)}</p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Monthly Cost</p>
        </div>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-accent)' }}>
            {monthsElapsed > 0 ? fmt(actualToDate) : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Actual To Date</p>
        </div>
        <div>
          <p className="font-mono text-sm font-semibold" style={{ color: 'var(--pw-fg)' }}>{fmt(projectedTotal)}</p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Projected Total</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-xs" style={{ color: 'var(--pw-muted)' }}>
        {[
          { label: 'Taxes', value: monthlyTaxes },
          { label: 'Insurance', value: monthlyInsurance },
          { label: 'Utilities', value: monthlyUtilities },
          { label: 'Loan Int.', value: monthlyInterest },
        ].map((item) => (
          <div key={item.label} className="text-center px-2 py-1.5 rounded" style={{ background: 'var(--pw-bg)' }}>
            <p className="font-mono font-semibold text-xs" style={{ color: 'var(--pw-fg)' }}>{fmt(item.value)}</p>
            <p className="text-[9px] mt-0.5">{item.label}/mo</p>
          </div>
        ))}
      </div>
    </div>
  );
}
