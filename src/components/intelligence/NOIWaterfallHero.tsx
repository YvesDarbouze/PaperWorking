'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Cell as PieCell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import type { NOIComponents } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   NOI WATERFALL HERO — Premium Intelligence Visualization
   Displays the NOI calculation flow as a waterfall chart with
   a hero KPI section and operating expense donut breakdown.
   ═══════════════════════════════════════════════════════════════ */

interface NOIWaterfallHeroProps {
  noiComponents: NOIComponents;
  className?: string;
}

/* ── Formatting Helpers ── */
const fmtUSD = (v: number): string =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtCompact = (v: number): string => {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    const formatted = `$${(abs / 1000).toFixed(1)}k`;
    return v < 0 ? `-${formatted}` : formatted;
  }
  return fmtUSD(v);
};

/* ── Expense category colors (consistent palette) ── */
const EXPENSE_COLORS: Record<string, string> = {
  Taxes: '#F06543',
  Insurance: '#F97316',
  Utilities: '#454955',
  Management: '#EC4899',
  Maintenance: '#14B8A6',
  HOA: '#A855F7',
};

/* ── Build waterfall chart data ── */
function buildWaterfallData(c: NOIComponents) {
  const data = [
    {
      name: 'Gross Rent',
      value: c.grossRentalIncome,
      base: 0,
      fill: '#14B8A6',
      type: 'income' as const,
    },
    {
      name: 'Other Income',
      value: c.otherIncome,
      base: c.grossRentalIncome,
      fill: '#454955',
      type: 'income' as const,
    },
    {
      name: 'Vacancy',
      value: -c.vacancyLoss,
      base: c.grossRentalIncome + c.otherIncome,
      fill: '#F97316',
      type: 'loss' as const,
    },
    {
      name: 'OpEx',
      value: -c.totalOperatingExpenses,
      base: c.grossRentalIncome + c.otherIncome - c.vacancyLoss,
      fill: '#F06543',
      type: 'expense' as const,
    },
    {
      name: 'NOI',
      value: c.noi,
      base: 0,
      fill: c.noi >= 0 ? '#454955' : '#F06543',
      type: 'result' as const,
    },
  ];

  return data.map((d) => ({
    ...d,
    // Recharts stacked bar: invisible base + visible bar on top
    invisibleBase: d.type === 'result' ? 0 : d.type === 'income' ? d.base : d.base + d.value,
    visibleBar: d.type === 'result' ? d.value : Math.abs(d.value),
  }));
}

/* ── Build expense donut data ── */
function buildExpenseDonut(c: NOIComponents) {
  return [
    { name: 'Taxes', value: c.propertyTaxes, fill: EXPENSE_COLORS.Taxes },
    { name: 'Insurance', value: c.insurance, fill: EXPENSE_COLORS.Insurance },
    { name: 'Utilities', value: c.utilities, fill: EXPENSE_COLORS.Utilities },
    { name: 'Management', value: c.propertyManagement, fill: EXPENSE_COLORS.Management },
    { name: 'Maintenance', value: c.maintenance, fill: EXPENSE_COLORS.Maintenance },
    { name: 'HOA', value: c.hoa, fill: EXPENSE_COLORS.HOA },
  ].filter((item) => item.value > 0);
}

/* ── Custom Tooltip ── */
function WaterfallTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ReturnType<typeof buildWaterfallData>[number] }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg backdrop-blur-xl"
      style={{
        background: 'var(--color-surface-container-high)',
        border: '1px solid var(--color-glass-border)',
        color: 'var(--color-on-surface)',
      }}
    >
      <p className="font-semibold">{item.name}</p>
      <p className="font-mono tabular-nums" style={{ color: item.fill }}>
        {item.type === 'loss' || item.type === 'expense'
          ? `-${fmtUSD(item.visibleBar)}`
          : fmtUSD(item.visibleBar)}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function NOIWaterfallHero({ noiComponents, className }: NOIWaterfallHeroProps) {
  const [isAnnual, setIsAnnual] = useState(true);

  const noi = noiComponents.noi;
  const displayNOI = isAnnual ? noi : Math.round(noi / 12);
  const noiPositive = noi >= 0;
  const noiMonthly = Math.round(noi / 12);

  const waterfallData = useMemo(() => buildWaterfallData(noiComponents), [noiComponents]);
  const expenseDonut = useMemo(() => buildExpenseDonut(noiComponents), [noiComponents]);

  const totalExpenses = noiComponents.totalOperatingExpenses + noiComponents.vacancyLoss;
  const grossIncome = noiComponents.grossRentalIncome + noiComponents.otherIncome;
  const operatingMargin = grossIncome > 0 ? Math.round((noi / grossIncome) * 100) : 0;

  // Guard: no data
  if (grossIncome === 0 && noi === 0) {
    return (
      <div
        className={`rounded-xl p-8 text-center backdrop-blur-xl ${className ?? ''}`}
        style={{
          background: 'var(--color-glass-bg)',
          border: '1px solid var(--color-glass-border)',
        }}
      >
        <DollarSign
          className="mx-auto mb-3 h-6 w-6 opacity-30"
          style={{ color: 'var(--color-on-surface-variant)' }}
        />
        <p className="text-sm font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
          No income or expense data available for NOI analysis.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl backdrop-blur-xl overflow-hidden ${className ?? ''}`}
      style={{
        background: 'var(--color-glass-bg)',
        border: '1px solid var(--color-glass-border)',
      }}
    >
      {/* ── Hero KPI Section ── */}
      <div
        className="p-6 pb-4"
        style={{
          borderBottom: '1px solid var(--color-glass-border)',
          background: 'linear-gradient(135deg, rgba(69, 73, 85, 0.04) 0%, transparent 60%)',
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* NOI Value */}
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: noiPositive ? 'rgba(69, 73, 85, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${noiPositive ? 'rgba(69, 73, 85, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              }}
            >
              <DollarSign
                className="h-6 w-6"
                style={{ color: noiPositive ? '#454955' : '#F06543' }}
              />
            </div>
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                Net Operating Income
              </p>
              <div className="flex items-baseline gap-3">
                <span
                  className="text-3xl font-bold tabular-nums tracking-tight"
                  style={{ color: noiPositive ? '#454955' : '#F06543' }}
                >
                  {fmtUSD(displayNOI)}
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-on-surface-variant)' }}
                >
                  {isAnnual ? '/ yr' : '/ mo'}
                </span>
                <span
                  className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{
                    background: noiPositive ? 'rgba(69, 73, 85, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: noiPositive ? '#454955' : '#F06543',
                  }}
                >
                  {noiPositive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {operatingMargin}% margin
                </span>
              </div>
              <p
                className="mt-1 text-xs font-mono tabular-nums"
                style={{ color: 'var(--color-on-surface-variant)', opacity: 0.7 }}
              >
                {isAnnual ? `${fmtUSD(noiMonthly)} / mo` : `${fmtUSD(noi)} / yr`}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => setIsAnnual((prev) => !prev)}
            className="flex items-center gap-2 self-start rounded-lg px-3 py-2 text-xs font-bold transition-colors"
            style={{
              background: 'var(--color-surface-container-high)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-on-surface)',
            }}
            type="button"
          >
            {isAnnual ? (
              <ToggleRight className="h-4 w-4" style={{ color: '#454955' }} />
            ) : (
              <ToggleLeft className="h-4 w-4" style={{ color: 'var(--color-on-surface-variant)' }} />
            )}
            {isAnnual ? 'Annual' : 'Monthly'}
          </button>
        </div>

        {/* Mini KPI Strip */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            {
              label: 'Gross Income',
              value: fmtCompact(isAnnual ? grossIncome : Math.round(grossIncome / 12)),
              icon: TrendingUp,
              color: '#14B8A6',
            },
            {
              label: 'Total Costs',
              value: fmtCompact(isAnnual ? totalExpenses : Math.round(totalExpenses / 12)),
              icon: TrendingDown,
              color: '#F06543',
            },
            {
              label: 'Operating Ratio',
              value: grossIncome > 0 ? `${Math.round((totalExpenses / grossIncome) * 100)}%` : '—',
              icon: TrendingDown,
              color: '#F97316',
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg px-3 py-2"
              style={{
                background: 'var(--color-surface-container)',
                border: '1px solid var(--color-glass-border)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <kpi.icon className="h-3 w-3" style={{ color: kpi.color }} />
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--color-on-surface-variant)', fontSize: '10px' }}
                >
                  {kpi.label}
                </span>
              </div>
              <p
                className="mt-1 text-sm font-bold tabular-nums"
                style={{ color: 'var(--color-on-surface)' }}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts Section: Waterfall + Donut ── */}
      <div className="grid grid-cols-1 gap-0 md:grid-cols-5">
        {/* Waterfall Chart — 3 cols */}
        <div
          className="p-5 md:col-span-3"
          style={{ borderRight: '1px solid var(--color-glass-border)' }}
        >
          <h4
            className="mb-3 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            NOI Waterfall
          </h4>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={waterfallData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                barCategoryGap="20%"
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val: number) => fmtCompact(val)}
                  tick={{ fontSize: 10, fill: 'var(--color-on-surface-variant)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<WaterfallTooltip />} cursor={false} />
                <Bar dataKey="invisibleBase" stackId="stack" fill="transparent" />
                <Bar dataKey="visibleBar" stackId="stack" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Formula callout */}
          <div
            className="mt-3 rounded-lg px-3 py-2 text-xs leading-relaxed"
            style={{
              background: 'var(--color-surface-container)',
              border: '1px solid var(--color-glass-border)',
              color: 'var(--color-on-surface-variant)',
            }}
          >
            <span className="font-bold" style={{ color: 'var(--color-on-surface)' }}>
              Formula:
            </span>{' '}
            <code className="rounded px-1 py-0.5 text-xs" style={{ background: 'var(--color-surface-container-high)' }}>
              NOI = (Gross Rental + Other) − Vacancy − OpEx
            </code>
          </div>
        </div>

        {/* Expense Donut — 2 cols */}
        <div className="p-5 md:col-span-2">
          <h4
            className="mb-3 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            Expense Breakdown
          </h4>

          {expenseDonut.length > 0 ? (
            <>
              <div className="flex items-center justify-center" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseDonut}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {expenseDonut.map((entry, index) => (
                        <PieCell key={`pie-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => fmtUSD(Number(value ?? 0))}
                      contentStyle={{
                        background: 'var(--color-surface-container-high)',
                        border: '1px solid var(--color-glass-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--color-on-surface)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {expenseDonut.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: item.fill }}
                    />
                    <span
                      className="truncate"
                      style={{ color: 'var(--color-on-surface-variant)' }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="ml-auto font-mono tabular-nums"
                      style={{ color: 'var(--color-on-surface)' }}
                    >
                      {fmtCompact(item.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div
                className="mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold"
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.15)',
                  color: '#F06543',
                }}
              >
                <span>Total OpEx + Vacancy</span>
                <span className="font-mono tabular-nums">{fmtUSD(totalExpenses)}</span>
              </div>
            </>
          ) : (
            <div
              className="flex h-48 items-center justify-center text-xs"
              style={{ color: 'var(--color-on-surface-variant)' }}
            >
              No expense data to display.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
