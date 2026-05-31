'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import { motion } from 'framer-motion';
import { ProjectFinancials } from '@/types/schema';
import { computeNOIComponents } from '@/lib/metrics/reiMetrics';

interface NOIBreakdownChartProps {
  financials: ProjectFinancials;
  className?: string;
  isLoading?: boolean;
}

interface WaterfallEntry {
  name: string;
  value: number;
  fill: string;
  type: 'income' | 'expense' | 'noi';
  start: number;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function computeNOI(financials: ProjectFinancials) {
  const c = computeNOIComponents(financials);
  return {
    grossAnnualRent: c.grossRentalIncome,
    otherIncome: c.otherIncome,
    vacancyLoss: c.vacancyLoss,
    effectiveRent: c.grossRentalIncome - c.vacancyLoss,
    annualTaxes: c.propertyTaxes,
    annualInsurance: c.insurance,
    annualUtilities: c.utilities,
    mgmtBase: c.propertyManagement,
    maintenance: c.maintenance,
    hoa: c.hoa,
    opEx: c.totalOperatingExpenses,
    noi: c.noi,
  };
}

function buildWaterfallData(financials: ProjectFinancials): WaterfallEntry[] {
  const c = computeNOI(financials);
  const ACCENT = 'var(--pw-accent)';
  const EXPENSE_1 = '#A5A5A5';
  const EXPENSE_2 = '#7F7F7F';
  const EXPENSE_3 = '#595959';
  const NOI_POS = '#22c55e';
  const NOI_NEG = '#ef4444';

  const steps: { name: string; delta: number; fill: string; type: WaterfallEntry['type'] }[] = [
    { name: 'Gross Rent', delta: c.grossAnnualRent, fill: ACCENT, type: 'income' },
    { name: 'Other Income', delta: c.otherIncome, fill: ACCENT, type: 'income' },
    { name: 'Vacancy Loss', delta: -c.vacancyLoss, fill: EXPENSE_1, type: 'expense' },
    { name: 'Prop. Taxes', delta: -c.annualTaxes, fill: EXPENSE_1, type: 'expense' },
    { name: 'Insurance', delta: -c.annualInsurance, fill: EXPENSE_2, type: 'expense' },
    { name: 'Utilities', delta: -c.annualUtilities, fill: EXPENSE_2, type: 'expense' },
    { name: 'Mgmt Fee', delta: -c.mgmtBase, fill: EXPENSE_2, type: 'expense' },
    { name: 'Maintenance', delta: -c.maintenance, fill: EXPENSE_3, type: 'expense' },
    { name: 'HOA', delta: -c.hoa, fill: EXPENSE_3, type: 'expense' },
    { name: 'NOI', delta: c.noi, fill: c.noi >= 0 ? NOI_POS : NOI_NEG, type: 'noi' },
  ];

  let running = 0;
  return steps.map((s) => {
    const start = s.type === 'noi' ? 0 : running;
    if (s.type !== 'noi') running += s.delta;
    return { name: s.name, value: s.delta, fill: s.fill, type: s.type, start };
  });
}

interface NOITooltipProps { active?: boolean; payload?: Array<{ payload: WaterfallEntry }>; label?: string }
function NOITooltip({ active, payload, label }: NOITooltipProps) {
  if (!active || !payload?.length) return null;
  const entry: WaterfallEntry = payload[0]?.payload;
  return (
    <div
      style={{ background: 'var(--pw-surface)', border: '1px solid var(--pw-border)' }}
      className="rounded-lg shadow-lg px-4 py-3 text-xs"
    >
      <p style={{ color: 'var(--pw-fg)' }} className="font-semibold mb-1">{label}</p>
      <p className="font-mono font-bold" style={{ color: entry?.value >= 0 ? '#22c55e' : '#ef4444' }}>
        {fmt(entry?.value ?? 0)}
      </p>
      {entry?.type !== 'income' && entry?.type !== 'noi' && (
        <p style={{ color: 'var(--pw-muted)' }} className="mt-0.5">Running total: {fmt(entry?.start + entry?.value)}</p>
      )}
    </div>
  );
}

export default function NOIBreakdownChart({ financials, className = '', isLoading = false }: NOIBreakdownChartProps) {
  const data = useMemo(() => buildWaterfallData(financials), [financials]);
  const computed = useMemo(() => computeNOI(financials), [financials]);

  if (isLoading) {
    return (
      <div className={`rounded-lg p-6 ${className}`} style={{ background: 'var(--pw-surface)' }}>
        <div className="animate-shimmer h-5 w-40 rounded mb-4" />
        <div className="animate-shimmer h-48 w-full rounded" />
        <div className="flex gap-4 mt-4">
          <div className="animate-shimmer h-10 flex-1 rounded" />
          <div className="animate-shimmer h-10 flex-1 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-6 ${className}`} style={{ background: 'var(--pw-surface)', border: '1px solid var(--pw-border)' }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="ag-label" style={{ color: 'var(--pw-muted)' }}>NOI Breakdown</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--pw-subtle)' }}>
            NOI = (Gross Rent + Other Income) − Vacancy − OpEx
          </p>
        </div>
        <div className="text-right">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-2xl font-semibold font-mono"
            style={{ color: computed.noi >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {fmt(computed.noi)}
          </motion.p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Annual NOI</p>
        </div>
      </div>

      <div className="flex gap-6 mb-4 mt-2">
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-base font-mono font-semibold"
            style={{ color: computed.noi >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {fmt(computed.noi / 12)}
          </motion.p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Monthly NOI</p>
        </div>
        <div className="text-center">
          <p className="text-base font-mono font-semibold" style={{ color: 'var(--pw-accent)' }}>
            {fmt(computed.grossAnnualRent)}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Gross Annual Rent</p>
        </div>
        <div className="text-center">
          <p className="text-base font-mono font-semibold" style={{ color: 'var(--pw-fg)' }}>
            {fmt(computed.opEx)}
          </p>
          <p className="text-xs" style={{ color: 'var(--pw-muted)' }}>Total OpEx</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="var(--pw-border)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 9, fill: 'var(--pw-muted)', fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'var(--pw-muted)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${(Math.abs(v) / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<NOITooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
          <ReferenceLine y={0} stroke="var(--pw-border)" strokeWidth={1} />
          <Bar dataKey="start" stackId="waterfall" fill="transparent" isAnimationActive={false} maxBarSize={48} legendType="none" />
          <Bar dataKey="value" stackId="waterfall" isAnimationActive maxBarSize={48} radius={[3, 3, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
