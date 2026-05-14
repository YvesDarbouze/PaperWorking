'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import {
  deriveAllMetrics,
  computeTotalCashInvested,
  computeCoCReturn,
} from '@/lib/metrics/reiMetrics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
  PieChart, Pie,
} from 'recharts';
import {
  DollarSign, TrendingUp, AlertTriangle, ArrowRight,
  Target, PiggyBank, Percent, BarChart3,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CASH-ON-CASH (COC) RETURN DEEP DIVE
   CoC Return = Annual Pre-Tax Cash Flow ÷ Total Cash Invested

   Provides:
   1. KPI strip: CoC %, Cash Flow, Total Invested, Down Payment
   2. Invested capital breakdown (donut)
   3. Return-on-investment gauge with 4/8/12% benchmarks
   4. Sensitivity: "What if cash flow changes?"
   5. Portfolio comparison bar chart
   6. Alternative investment comparison (stocks, bonds, REITs)
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  projects?: Project[];
}

/* ── Formatting ── */
const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const fmtPct = (v: number) => `${v.toFixed(2)}%`;

/* ── CoC Classification ── */
type CoCGrade = 'excellent' | 'strong' | 'moderate' | 'below-target' | 'negative';

function classifyCoC(rate: number): {
  grade: CoCGrade;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (rate >= 12) return {
    grade: 'excellent', label: 'Excellent Return',
    description: 'Exceptional yield — outperforms most alternative investments',
    color: '#10B981', bgColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)',
  };
  if (rate >= 8) return {
    grade: 'strong', label: 'Strong Return',
    description: 'Meets the 8-12% target range most investors aim for',
    color: '#3B82F6', bgColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)',
  };
  if (rate >= 4) return {
    grade: 'moderate', label: 'Moderate Return',
    description: 'Positive but may underperform alternative investments',
    color: '#F59E0B', bgColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)',
  };
  if (rate >= 0) return {
    grade: 'below-target', label: 'Below Target',
    description: 'Low return — consider if appreciation compensates the weak cash flow',
    color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)',
  };
  return {
    grade: 'negative', label: 'Negative Return',
    description: 'Losing money each year — property costs more than it earns',
    color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)',
  };
}

/* ── Per-property data ── */
interface PropertyCoCData {
  name: string;
  cocReturn: number;
  annualCashFlow: number;
  totalCashInvested: number;
  downPayment: number;
  closingCosts: number;
  rehabCost: number;
  classification: ReturnType<typeof classifyCoC>;
}

function deriveCoCBreakdowns(projects: Project[]): PropertyCoCData[] {
  return projects
    .filter(p => p.financials)
    .map((p) => {
      const f = p.financials!;
      const metrics = deriveAllMetrics(f);
      const purchasePrice = f.purchasePrice ?? 0;
      const loanAmount = f.loanAmount ?? 0;
      const downPayment = Math.max(0, purchasePrice - loanAmount);
      const closingCosts = f.fixedAcquisitionCosts ?? 0;
      const rehabCost = f.projectedRehabCost ?? 0;

      return {
        name: (p.propertyName || p.address || 'Unknown').substring(0, 16),
        cocReturn: metrics.cashOnCashReturn,
        annualCashFlow: metrics.annualCashFlow,
        totalCashInvested: metrics.totalCashInvested,
        downPayment,
        closingCosts,
        rehabCost,
        classification: classifyCoC(metrics.cashOnCashReturn),
      };
    })
    .slice(0, 8);
}

/* ── Custom tooltip ── */
function CoCTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg text-xs"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
    >
      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
      <p className="tabular-nums" style={{ color: '#3B82F6' }}>
        CoC Return: {fmtPct(d['CoC Return'] ?? d.cocReturn ?? 0)}
      </p>
      <p className="tabular-nums" style={{ color: '#10B981' }}>
        Cash Flow: {fmtUSD(d.annualCashFlow ?? 0)}/yr
      </p>
      <p className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        Invested: {fmtUSD(d.totalCashInvested ?? 0)}
      </p>
    </div>
  );
}

/* ── Donut label ── */
function renderDonutLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function CoCReturnDeepDive({ projects: propProjects }: Props) {
  const breakdowns = useMemo(
    () => deriveCoCBreakdowns(propProjects || []),
    [propProjects]
  );

  /* ── Portfolio aggregation ── */
  const aggregate = useMemo(() => {
    if (breakdowns.length === 0) return null;
    const totalCashFlow = breakdowns.reduce((s, b) => s + b.annualCashFlow, 0);
    const totalInvested = breakdowns.reduce((s, b) => s + b.totalCashInvested, 0);
    const totalDown = breakdowns.reduce((s, b) => s + b.downPayment, 0);
    const totalClosing = breakdowns.reduce((s, b) => s + b.closingCosts, 0);
    const totalRehab = breakdowns.reduce((s, b) => s + b.rehabCost, 0);
    const cocReturn = totalInvested > 0 ? (totalCashFlow / totalInvested) * 100 : 0;
    return {
      totalCashFlow,
      totalInvested,
      totalDown,
      totalClosing,
      totalRehab,
      cocReturn: Math.round(cocReturn * 100) / 100,
    };
  }, [breakdowns]);

  if (!aggregate || aggregate.totalInvested === 0) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <PiggyBank className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add a property with purchase price, loan amount, and closing costs to see your Cash-on-Cash Return.
        </p>
      </div>
    );
  }

  const classification = classifyCoC(aggregate.cocReturn);

  /* ── Capital breakdown donut ── */
  const capitalPieces = [
    { name: 'Down Payment', value: aggregate.totalDown, color: '#3B82F6' },
    { name: 'Closing Costs', value: aggregate.totalClosing, color: '#8B5CF6' },
    { name: 'Rehab Budget', value: aggregate.totalRehab, color: '#F59E0B' },
  ].filter(p => p.value > 0);

  /* ── Alternative investment comparison ── */
  const alternatives = [
    { name: 'This Property', rate: aggregate.cocReturn, color: classification.color },
    { name: 'Target (8-12%)', rate: 10, color: '#10B981' },
    { name: 'S&P 500 Avg', rate: 10.5, color: '#6366F1' },
    { name: 'REIT Index', rate: 7.5, color: '#8B5CF6' },
    { name: '10-Year Treasury', rate: 4.25, color: '#94A3B8' },
    { name: 'HYSA', rate: 4.5, color: '#64748B' },
  ];

  /* ── Sensitivity: what if cash flow was different? ── */
  const cfDeltas = [-50, -25, 0, 25, 50, 100]; // % change in cash flow
  const sensitivityRows = cfDeltas.map(d => {
    const adjustedCF = aggregate.totalCashFlow * (1 + d / 100);
    const adjustedCoC = aggregate.totalInvested > 0 ? (adjustedCF / aggregate.totalInvested) * 100 : 0;
    return { delta: d, cashFlow: adjustedCF, cocReturn: adjustedCoC };
  });

  return (
    <div className="w-full space-y-6">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <Percent className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Cash-on-Cash Return Analysis
            </h3>
            <p className="text-xs text-text-secondary">
              Annual Cash Flow ÷ Total Cash Invested = Your true return on capital
            </p>
          </div>
        </div>
        {/* Classification badge */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
          style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* ── KPI Strip + Capital Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* KPIs — 3 cols */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          {[
            {
              icon: Percent,
              label: 'Cash-on-Cash Return',
              value: fmtPct(aggregate.cocReturn),
              sublabel: `${fmtUSD(aggregate.totalCashFlow)}/yr ÷ ${fmtUSD(aggregate.totalInvested)} invested`,
              color: classification.color,
            },
            {
              icon: DollarSign,
              label: 'Annual Cash Flow',
              value: fmtUSD(aggregate.totalCashFlow),
              sublabel: `${fmtUSD(Math.round(aggregate.totalCashFlow / 12))}/mo after debt service`,
              color: aggregate.totalCashFlow >= 0 ? '#10B981' : '#EF4444',
            },
            {
              icon: PiggyBank,
              label: 'Total Cash Invested',
              value: fmtUSD(aggregate.totalInvested),
              sublabel: `Down payment + closing costs + rehab`,
              color: '#8B5CF6',
            },
            {
              icon: Target,
              label: 'Payback Period',
              value: aggregate.totalCashFlow > 0
                ? `${(aggregate.totalInvested / aggregate.totalCashFlow).toFixed(1)} years`
                : '—',
              sublabel: aggregate.totalCashFlow > 0
                ? `${fmtUSD(aggregate.totalInvested)} ÷ ${fmtUSD(aggregate.totalCashFlow)}/yr`
                : 'Negative cash flow — no payback timeline',
              color: 'var(--text-primary)',
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

        {/* Capital breakdown donut — 2 cols */}
        <div
          className="lg:col-span-2 bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col items-center justify-center"
          style={{ minHeight: '280px' }}
        >
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-2">
            Capital Invested Breakdown
          </h4>
          {capitalPieces.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={capitalPieces}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  strokeWidth={2}
                  stroke="var(--bg-surface)"
                  labelLine={false}
                  label={renderDonutLabel}
                >
                  {capitalPieces.map((p, i) => (
                    <Cell key={i} fill={p.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => fmtUSD(value)}
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-ui)',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-text-secondary opacity-50">No capital data</p>
          )}
          <div className="flex flex-wrap justify-center gap-3 mt-1">
            {capitalPieces.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  {p.name}: {fmtUSD(p.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alternative Investment Comparison ── */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '260px' }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4" style={{ color: '#6366F1' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
            How Does This Compare? — Return Benchmark
          </h4>
        </div>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={alternatives}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
              <XAxis
                type="number"
                fontSize={10}
                tickFormatter={(v: number) => `${v}%`}
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
              />
              <YAxis
                dataKey="name"
                type="category"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(2)}%`}
                contentStyle={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-ui)',
                  borderRadius: '8px',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {alternatives.map((a, i) => (
                  <Cell key={i} fill={a.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Sensitivity Table ── */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: '#3B82F6' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">
            CoC Sensitivity — "What If Cash Flow Changes?"
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>
                  Cash Flow Change
                </th>
                <th className="px-3 py-2 text-center font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>
                  Annual Cash Flow
                </th>
                <th className="px-3 py-2 text-center font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>
                  CoC Return
                </th>
                <th className="px-3 py-2 text-center font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>
                  Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {sensitivityRows.map((row) => {
                const cls = classifyCoC(row.cocReturn);
                const isCurrent = row.delta === 0;
                return (
                  <tr key={row.delta}>
                    <td
                      className="px-3 py-2 font-bold"
                      style={{
                        color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderBottom: '1px solid var(--border-ui)',
                      }}
                    >
                      {isCurrent ? 'Current' : `${row.delta > 0 ? '+' : ''}${row.delta}%`}
                    </td>
                    <td
                      className="px-3 py-2 text-center tabular-nums"
                      style={{
                        color: row.cashFlow >= 0 ? '#10B981' : '#EF4444',
                        fontWeight: isCurrent ? 700 : 500,
                        borderBottom: '1px solid var(--border-ui)',
                      }}
                    >
                      {fmtUSD(Math.round(row.cashFlow))}/yr
                    </td>
                    <td
                      className="px-3 py-2 text-center tabular-nums"
                      style={{
                        color: cls.color,
                        fontWeight: isCurrent ? 700 : 500,
                        background: isCurrent ? cls.bgColor : 'transparent',
                        borderRadius: isCurrent ? '4px' : '0',
                        borderBottom: '1px solid var(--border-ui)',
                      }}
                    >
                      {fmtPct(row.cocReturn)}
                    </td>
                    <td
                      className="px-3 py-2 text-center text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: cls.color, borderBottom: '1px solid var(--border-ui)' }}
                    >
                      {cls.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Per-Property Comparison ── */}
      {breakdowns.length > 1 && (
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '300px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">
            CoC Return by Property — Portfolio Comparison
          </h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={breakdowns.map(b => ({
                  name: b.name,
                  'CoC Return': b.cocReturn,
                  annualCashFlow: b.annualCashFlow,
                  totalCashInvested: b.totalCashInvested,
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
                  tickFormatter={(v: number) => `${v}%`}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CoCTooltip />} />
                {/* Target zone */}
                <ReferenceLine y={8} stroke="#10B981" strokeDasharray="4 4" label={{ value: '8% target', position: 'right', fontSize: 9, fill: '#10B981' }} />
                <ReferenceLine y={12} stroke="#3B82F6" strokeDasharray="4 4" label={{ value: '12% excellent', position: 'right', fontSize: 9, fill: '#3B82F6' }} />
                <Bar dataKey="CoC Return" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {breakdowns.map((b, i) => (
                    <Cell key={i} fill={b.classification.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Educational Callout ── */}
      <div
        className="px-4 py-3 rounded-lg text-[11px] leading-relaxed"
        style={{
          background: 'rgba(59,130,246,0.05)',
          border: '1px solid rgba(59,130,246,0.15)',
          color: 'var(--text-secondary)',
        }}
      >
        <strong style={{ color: 'var(--text-primary)' }}>CoC Return Formula:</strong>{' '}
        <code className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'var(--bg-surface)' }}>
          Annual Pre-Tax Cash Flow ÷ Total Cash Invested = Cash-on-Cash Return
        </code>
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>Total Cash Invested includes:</strong>{' '}
        Down payment + closing costs + rehab budget. It does NOT include the mortgage — only the cash YOU put in.
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>Benchmarks:</strong>{' '}
        <span style={{ color: '#10B981' }}>■ ≥12% Excellent</span> •{' '}
        <span style={{ color: '#3B82F6' }}>■ 8–12% Strong</span> •{' '}
        <span style={{ color: '#F59E0B' }}>■ 4–8% Moderate</span> •{' '}
        <span style={{ color: '#EF4444' }}>■ &lt;4% Below Target</span>
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>Why it matters:</strong>{' '}
        Unlike cap rate, CoC return factors in financing — making it the most relevant metric for leveraged buy-and-hold investors.
        It answers: "For every dollar I invested, how much am I getting back each year?"
      </div>
    </div>
  );
}
