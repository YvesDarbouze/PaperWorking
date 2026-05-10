'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { computeNOIComponents, type NOIComponents } from '@/lib/metrics/reiMetrics';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ReferenceLine
} from 'recharts';
import {
  DollarSign, TrendingDown, TrendingUp, BarChart3,
  AlertTriangle, CheckCircle, Info, ArrowRight
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   NOI DEEP DIVE  –  $279K Rental Example Model
   Visualizes NOI formula with:
   1. Waterfall chart (Income → Expenses → NOI)
   2. 50% Rule benchmark comparison
   3. Expense composition donut chart
   4. Per-property itemized NOI table
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  projects?: Project[];
}

/* ── Formatting ── */
const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtK = (v: number) =>
  Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

/* ── Derive per-property NOI data using the real metrics engine ── */
export function deriveNOIBreakdowns(projects: Project[]) {
  return projects
    .filter(p => p.financials)
    .map((p) => {
      const f = p.financials!;
      const components = computeNOIComponents(f);
      const grossPotentialIncome = components.grossRentalIncome + components.otherIncome;
      const fiftyPercentEstimate = grossPotentialIncome * 0.5;

      return {
        name: (p.propertyName || p.address || 'Unknown').substring(0, 14),
        components,
        grossPotentialIncome,
        fiftyPercentEstimate,
        noiDelta: components.noi - fiftyPercentEstimate,
        purchasePrice: f.purchasePrice ?? 0,
      };
    })
    .slice(0, 6);
}

/* ── Build the waterfall data for a single property or portfolio aggregate ── */
function buildWaterfallData(c: NOIComponents) {
  return [
    { name: 'Gross Rent', value: c.grossRentalIncome, fill: '#3B82F6', type: 'income' },
    { name: 'Other Income', value: c.otherIncome, fill: '#6366F1', type: 'income' },
    { name: 'Vacancy', value: -c.vacancyLoss, fill: '#F59E0B', type: 'loss' },
    { name: 'Taxes', value: -c.propertyTaxes, fill: '#EF4444', type: 'expense' },
    { name: 'Insurance', value: -c.insurance, fill: '#F97316', type: 'expense' },
    { name: 'Utilities', value: -c.utilities, fill: '#8B5CF6', type: 'expense' },
    { name: 'Mgmt', value: -c.propertyManagement, fill: '#EC4899', type: 'expense' },
    { name: 'Maint/CapEx', value: -c.maintenance, fill: '#14B8A6', type: 'expense' },
    { name: 'HOA', value: -c.hoa, fill: '#A855F7', type: 'expense' },
    { name: 'NOI', value: c.noi, fill: c.noi >= 0 ? '#10B981' : '#EF4444', type: 'result' },
  ];
}

/* ── Build expense composition for donut ── */
function buildExpenseDonut(c: NOIComponents) {
  const items = [
    { name: 'Taxes', value: c.propertyTaxes, fill: '#EF4444' },
    { name: 'Insurance', value: c.insurance, fill: '#F97316' },
    { name: 'Utilities', value: c.utilities, fill: '#8B5CF6' },
    { name: 'Mgmt', value: c.propertyManagement, fill: '#EC4899' },
    { name: 'Maint/CapEx', value: c.maintenance, fill: '#14B8A6' },
    { name: 'HOA', value: c.hoa, fill: '#A855F7' },
    { name: 'Vacancy', value: c.vacancyLoss, fill: '#F59E0B' },
  ].filter(i => i.value > 0);

  return items;
}

/* ── Custom waterfall tooltip ── */
function WaterfallTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg text-xs"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
      <p className="tabular-nums" style={{ color: d.value >= 0 ? '#10B981' : '#EF4444' }}>
        {fmtUSD(d.value)}
      </p>
    </div>
  );
}

/* ── Benchmark verdict badge ── */
function BenchmarkBadge({ noi, estimate }: { noi: number; estimate: number }) {
  const beating = noi >= estimate;
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
      style={{
        background: beating ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
        border: `1px solid ${beating ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
        color: beating ? '#10B981' : '#F59E0B',
      }}
    >
      {beating ? (
        <CheckCircle className="w-3.5 h-3.5" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5" />
      )}
      <span>
        {beating ? 'Outperforming' : 'Underperforming'} 50% Rule by {fmtUSD(Math.abs(noi - estimate))}
      </span>
    </div>
  );
}

/* ── NOI Line Item Row ── */
function LineItemRow({
  label,
  monthly,
  annual,
  isIncome = false,
  isTotal = false,
}: {
  label: string;
  monthly: number;
  annual: number;
  isIncome?: boolean;
  isTotal?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-3 gap-4 py-2 px-3 text-xs ${isTotal ? 'font-bold' : 'font-medium'}`}
      style={{
        borderBottom: isTotal ? 'none' : '1px solid var(--border-ui)',
        background: isTotal ? 'var(--bg-inset)' : 'transparent',
        borderRadius: isTotal ? '6px' : '0',
        color: isTotal
          ? annual >= 0 ? '#10B981' : '#EF4444'
          : isIncome
            ? 'var(--text-primary)'
            : 'var(--text-secondary)',
      }}
    >
      <span className="truncate">{label}</span>
      <span className="text-right tabular-nums">
        {isIncome || isTotal ? fmtUSD(monthly) : `(${fmtUSD(Math.abs(monthly))})`}
      </span>
      <span className="text-right tabular-nums">
        {isIncome || isTotal ? fmtUSD(annual) : `(${fmtUSD(Math.abs(annual))})`}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function NOIDeepDive({ projects: propProjects }: Props) {
  const breakdowns = useMemo(
    () => deriveNOIBreakdowns(propProjects || []),
    [propProjects]
  );

  // Aggregate all projects into a single portfolio-level NOI
  const aggregate = useMemo<NOIComponents | null>(() => {
    if (breakdowns.length === 0) return null;
    const agg: NOIComponents = {
      grossRentalIncome: 0,
      otherIncome: 0,
      vacancyLoss: 0,
      propertyTaxes: 0,
      insurance: 0,
      utilities: 0,
      propertyManagement: 0,
      maintenance: 0,
      hoa: 0,
      totalOperatingExpenses: 0,
      noi: 0,
    };
    breakdowns.forEach(({ components: c }) => {
      agg.grossRentalIncome += c.grossRentalIncome;
      agg.otherIncome += c.otherIncome;
      agg.vacancyLoss += c.vacancyLoss;
      agg.propertyTaxes += c.propertyTaxes;
      agg.insurance += c.insurance;
      agg.utilities += c.utilities;
      agg.propertyManagement += c.propertyManagement;
      agg.maintenance += c.maintenance;
      agg.hoa += c.hoa;
      agg.totalOperatingExpenses += c.totalOperatingExpenses;
      agg.noi += c.noi;
    });
    return agg;
  }, [breakdowns]);

  const totalGPI = aggregate
    ? aggregate.grossRentalIncome + aggregate.otherIncome
    : 0;
  const fiftyPctEstimate = totalGPI * 0.5;
  const waterfallData = aggregate ? buildWaterfallData(aggregate) : [];
  const expenseDonut = aggregate ? buildExpenseDonut(aggregate) : [];

  if (!aggregate) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <Info className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add a property with income &amp; expense data to see your NOI analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Net Operating Income (NOI) Breakdown
            </h3>
            <p className="text-xs text-text-secondary">
              (Gross Rental Income + Other Income) − (Vacancy + Operating Expenses)
            </p>
          </div>
        </div>
        <BenchmarkBadge noi={aggregate.noi} estimate={fiftyPctEstimate} />
      </div>

      {/* ── Top KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: TrendingUp,
            label: 'Gross Potential Income',
            value: fmtUSD(totalGPI),
            sublabel: `${fmtUSD(totalGPI / 12)} / mo`,
            color: '#3B82F6',
          },
          {
            icon: TrendingDown,
            label: 'Total Operating Costs',
            value: fmtUSD(aggregate.totalOperatingExpenses + aggregate.vacancyLoss),
            sublabel: `${fmtUSD((aggregate.totalOperatingExpenses + aggregate.vacancyLoss) / 12)} / mo`,
            color: '#EF4444',
          },
          {
            icon: DollarSign,
            label: 'Net Operating Income',
            value: fmtUSD(aggregate.noi),
            sublabel: `${fmtUSD(aggregate.noi / 12)} / mo`,
            color: '#10B981',
          },
          {
            icon: BarChart3,
            label: '50% Rule Estimate',
            value: fmtUSD(fiftyPctEstimate),
            sublabel: `Quick: ${fmtUSD(totalGPI)} ÷ 2`,
            color: '#F59E0B',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="rounded-lg p-4 flex flex-col gap-2"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
          >
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {kpi.label}
              </span>
            </div>
            <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {kpi.value}
            </p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>
              {kpi.sublabel}
            </p>
          </div>
        ))}
      </div>

      {/* ── Waterfall + Expense Donut Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Waterfall chart — 3 cols */}
        <div
          className="lg:col-span-3 bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col"
          style={{ minHeight: '340px' }}
        >
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
            NOI Waterfall — Portfolio
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  fontSize={9}
                  tickFormatter={fmtK}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<WaterfallTooltip />} />
                <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense donut — 2 cols */}
        <div
          className="lg:col-span-2 bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col"
          style={{ minHeight: '340px' }}
        >
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
            Expense Composition
          </h4>
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="72%"
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expenseDonut.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => fmtUSD(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '9px', paddingTop: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
              <div className="text-center">
                <span className="block text-xl font-bold text-text-primary">
                  {fmtUSD(aggregate.totalOperatingExpenses + aggregate.vacancyLoss)}
                </span>
                <span className="block text-[9px] uppercase tracking-wider text-text-secondary">
                  Total Costs
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Itemized NOI Statement Table ── */}
      <div
        className="bg-bg-surface border border-border-accent rounded-xl p-5 overflow-hidden"
      >
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
            NOI Statement — Annualized P&amp;L
          </h4>
        </div>

        {/* Header row */}
        <div
          className="grid grid-cols-3 gap-4 py-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] rounded-t-md"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}
        >
          <span>Line Item</span>
          <span className="text-right">Monthly</span>
          <span className="text-right">Annual</span>
        </div>

        {/* Income */}
        <LineItemRow
          label="Gross Rental Income"
          monthly={aggregate.grossRentalIncome / 12}
          annual={aggregate.grossRentalIncome}
          isIncome
        />
        <LineItemRow
          label="Other Income"
          monthly={aggregate.otherIncome / 12}
          annual={aggregate.otherIncome}
          isIncome
        />

        {/* Losses */}
        <div
          className="my-2 px-3 flex items-center gap-2 py-1"
          style={{ borderTop: '1px dashed var(--border-ui)' }}
        >
          <ArrowRight className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600">
            Losses &amp; Operating Expenses
          </span>
        </div>

        <LineItemRow
          label="Vacancy Losses"
          monthly={aggregate.vacancyLoss / 12}
          annual={aggregate.vacancyLoss}
        />
        <LineItemRow
          label="Property Taxes"
          monthly={aggregate.propertyTaxes / 12}
          annual={aggregate.propertyTaxes}
        />
        <LineItemRow
          label="Insurance"
          monthly={aggregate.insurance / 12}
          annual={aggregate.insurance}
        />
        <LineItemRow
          label="Utilities"
          monthly={aggregate.utilities / 12}
          annual={aggregate.utilities}
        />
        <LineItemRow
          label="Property Management"
          monthly={aggregate.propertyManagement / 12}
          annual={aggregate.propertyManagement}
        />
        <LineItemRow
          label="Maintenance & CapEx"
          monthly={aggregate.maintenance / 12}
          annual={aggregate.maintenance}
        />
        <LineItemRow
          label="HOA Fees"
          monthly={aggregate.hoa / 12}
          annual={aggregate.hoa}
        />

        {/* Total OpEx */}
        <div className="mt-2 mb-1 px-3">
          <div
            className="grid grid-cols-3 gap-4 py-2 px-3 text-xs font-bold rounded-md"
            style={{ background: 'rgba(239,68,68,0.05)', color: '#EF4444' }}
          >
            <span>Total Operating Costs</span>
            <span className="text-right tabular-nums">
              ({fmtUSD((aggregate.totalOperatingExpenses + aggregate.vacancyLoss) / 12)})
            </span>
            <span className="text-right tabular-nums">
              ({fmtUSD(aggregate.totalOperatingExpenses + aggregate.vacancyLoss)})
            </span>
          </div>
        </div>

        {/* NOI Result */}
        <div className="mt-3">
          <LineItemRow
            label="Net Operating Income (NOI)"
            monthly={aggregate.noi / 12}
            annual={aggregate.noi}
            isTotal
          />
        </div>

        {/* 50% Rule benchmark row */}
        <div className="mt-3 px-3">
          <div
            className="grid grid-cols-3 gap-4 py-2 px-3 text-xs font-medium rounded-md"
            style={{
              background: 'rgba(245,158,11,0.05)',
              border: '1px dashed rgba(245,158,11,0.3)',
              color: '#F59E0B',
            }}
          >
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3" /> 50% Rule Estimate
            </span>
            <span className="text-right tabular-nums">
              {fmtUSD(fiftyPctEstimate / 12)}
            </span>
            <span className="text-right tabular-nums">
              {fmtUSD(fiftyPctEstimate)}
            </span>
          </div>
        </div>

        {/* Formula callout */}
        <div
          className="mt-4 px-4 py-3 rounded-lg text-[11px] leading-relaxed"
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-ui)',
            color: 'var(--text-secondary)',
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>NOI Formula:</strong>{' '}
          <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>
            NOI = (Gross Rental Income + Other Income) − (Vacancy Losses + Operating Expenses)
          </code>
          <br />
          <strong style={{ color: 'var(--text-primary)' }}>What&apos;s included:</strong>{' '}
          Property Taxes &amp; Insurance, Maintenance &amp; Repairs, Property Management Fees, HOA Fees &amp; Utilities
          <br />
          <strong style={{ color: 'var(--text-primary)' }}>What&apos;s excluded:</strong>{' '}
          Mortgage payments, income taxes, depreciation, capital expenditures above reserves
        </div>
      </div>

      {/* ── Per-Property Comparison Bar ── */}
      {breakdowns.length > 1 && (
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '300px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
            NOI vs 50% Rule — By Property
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdowns.map(b => ({
                  name: b.name,
                  'Actual NOI': b.components.noi,
                  '50% Estimate': b.fiftyPercentEstimate,
                }))}
                margin={{ top: 10, right: 10, left: -10, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="name"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={40}
                />
                <YAxis
                  fontSize={10}
                  tickFormatter={fmtK}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip
                  formatter={(value: number) => fmtUSD(value)}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                    fontSize: '11px',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={30}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '10px' }}
                />
                <Bar dataKey="Actual NOI" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="50% Estimate" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
