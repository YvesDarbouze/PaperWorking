'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Landmark,
  Calendar,
  Percent,
  Info,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CASH FLOW INTELLIGENCE CARD
   Visualizes the cash flow computation:
     Cash Flow = NOI − Annual Debt Service
   With sparkline projections and debt service details.
   ═══════════════════════════════════════════════════════════════ */

interface CashFlowIntelligenceCardProps {
  noi: number;
  annualDebtService: number;
  loanAmount?: number;
  loanInterestRate?: number;
  loanTermYears?: number;
  monthlyCashFlow?: number;
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

/* ── 12-Month Cash Flow Projection ── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Seasonal variance multipliers for NOI (vacancy-driven)
const SEASONAL_MULT = [0.88, 0.92, 0.96, 1.0, 1.02, 1.05, 1.05, 1.04, 1.0, 0.98, 0.94, 0.90];

function generateProjectedCashFlow(
  monthlyNOI: number,
  monthlyDebtService: number
): Array<{ month: string; cashFlow: number; noi: number }> {
  return MONTHS.map((month, i) => {
    const seasonalNOI = Math.round(monthlyNOI * SEASONAL_MULT[i]);
    const cashFlow = seasonalNOI - monthlyDebtService;
    return { month, cashFlow: Math.round(cashFlow), noi: seasonalNOI };
  });
}

/* ── Custom Sparkline Tooltip ── */
function SparklineTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { month: string; cashFlow: number; noi: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg backdrop-blur-xl"
      style={{
        background: 'var(--color-surface-container-high)',
        border: '1px solid var(--color-glass-border)',
        color: 'var(--color-on-surface)',
      }}
    >
      <p className="font-semibold">{data.month}</p>
      <p className="font-mono tabular-nums" style={{ color: data.cashFlow >= 0 ? '#14B8A6' : '#F06543' }}>
        CF: {fmtUSD(data.cashFlow)}
      </p>
      <p className="font-mono tabular-nums" style={{ color: 'var(--color-on-surface-variant)' }}>
        NOI: {fmtUSD(data.noi)}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function CashFlowIntelligenceCard({
  noi,
  annualDebtService,
  loanAmount,
  loanInterestRate,
  loanTermYears,
  monthlyCashFlow: propMonthlyCashFlow,
  className,
}: CashFlowIntelligenceCardProps) {
  const annualCashFlow = noi - annualDebtService;
  const monthlyCF = propMonthlyCashFlow ?? Math.round(annualCashFlow / 12);
  const isPositive = annualCashFlow >= 0;
  const monthlyDebtService = annualDebtService > 0 ? Math.round(annualDebtService / 12) : 0;
  const monthlyNOI = Math.round(noi / 12);

  const projectedData = useMemo(
    () => generateProjectedCashFlow(monthlyNOI, monthlyDebtService),
    [monthlyNOI, monthlyDebtService]
  );

  // Determine cash flow health label
  const healthLabel = useMemo(() => {
    if (annualCashFlow <= 0) return { text: 'Negative Cash Flow', color: '#F06543' };
    if (monthlyCF < 100) return { text: 'Marginal', color: '#F97316' };
    if (monthlyCF < 300) return { text: 'Adequate', color: '#EAB308' };
    return { text: 'Strong', color: '#14B8A6' };
  }, [annualCashFlow, monthlyCF]);

  // DSCR micro-metric
  const dscr = annualDebtService > 0 ? (noi / annualDebtService).toFixed(2) : '∞';

  return (
    <div
      className={`rounded-xl backdrop-blur-xl overflow-hidden ${className ?? ''}`}
      style={{
        background: 'var(--color-glass-bg)',
        border: '1px solid var(--color-glass-border)',
      }}
    >
      {/* ── Hero Metric Section ── */}
      <div
        className="p-6 pb-4"
        style={{
          borderBottom: '1px solid var(--color-glass-border)',
          background: isPositive
            ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.04) 0%, transparent 60%)'
            : 'linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, transparent 60%)',
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: isPositive ? 'rgba(20, 184, 166, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: `1px solid ${isPositive ? 'rgba(20, 184, 166, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              }}
            >
              {isPositive ? (
                <TrendingUp className="h-6 w-6" style={{ color: '#14B8A6' }} />
              ) : (
                <TrendingDown className="h-6 w-6" style={{ color: '#F06543' }} />
              )}
            </div>
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                Annual Cash Flow
              </p>
              <div className="flex items-baseline gap-3">
                <span
                  className="text-3xl font-bold tabular-nums tracking-tight"
                  style={{ color: isPositive ? '#14B8A6' : '#F06543' }}
                >
                  {fmtUSD(annualCashFlow)}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
                  / yr
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3">
                <span
                  className="font-mono text-sm tabular-nums"
                  style={{ color: isPositive ? '#14B8A6' : '#F06543', opacity: 0.8 }}
                >
                  {fmtUSD(monthlyCF)} / mo
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{
                    background: `${healthLabel.color}15`,
                    color: healthLabel.color,
                  }}
                >
                  {healthLabel.text}
                </span>
              </div>
            </div>
          </div>

          {/* DSCR Badge */}
          <div
            className="flex flex-col items-center rounded-lg px-4 py-2 self-start"
            style={{
              background: 'var(--color-surface-container)',
              border: '1px solid var(--color-glass-border)',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-on-surface-variant)', fontSize: '10px' }}
            >
              DSCR
            </span>
            <span
              className="text-lg font-bold tabular-nums"
              style={{
                color:
                  dscr === '∞'
                    ? '#14B8A6'
                    : Number(dscr) >= 1.25
                      ? '#14B8A6'
                      : Number(dscr) >= 1.0
                        ? '#EAB308'
                        : '#F06543',
              }}
            >
              {dscr}x
            </span>
          </div>
        </div>
      </div>

      {/* ── Visual Formula Breakdown ── */}
      <div className="p-6" style={{ borderBottom: '1px solid var(--color-glass-border)' }}>
        <h4
          className="mb-3 text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Cash Flow Formula
        </h4>
        <div className="flex flex-wrap items-center gap-2">
          {/* NOI */}
          <div
            className="flex flex-col items-center rounded-lg px-4 py-3"
            style={{
              background: 'var(--color-surface-container)',
              border: '1px solid var(--color-glass-border)',
              minWidth: '100px',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-on-surface-variant)', fontSize: '10px' }}
            >
              NOI
            </span>
            <span
              className="text-lg font-bold font-mono tabular-nums"
              style={{ color: '#454955' }}
            >
              {fmtCompact(noi)}
            </span>
          </div>

          {/* Minus */}
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#F06543',
            }}
          >
            −
          </span>

          {/* Debt Service */}
          <div
            className="flex flex-col items-center rounded-lg px-4 py-3"
            style={{
              background: 'var(--color-surface-container)',
              border: '1px solid var(--color-glass-border)',
              minWidth: '100px',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-on-surface-variant)', fontSize: '10px' }}
            >
              Debt Service
            </span>
            <span
              className="text-lg font-bold font-mono tabular-nums"
              style={{ color: '#F06543' }}
            >
              {fmtCompact(annualDebtService)}
            </span>
          </div>

          {/* Equals */}
          <ArrowRight className="h-5 w-5 shrink-0" style={{ color: 'var(--color-on-surface-variant)' }} />

          {/* Cash Flow */}
          <div
            className="flex flex-col items-center rounded-lg px-4 py-3"
            style={{
              background: isPositive ? 'rgba(20, 184, 166, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              border: `1px solid ${isPositive ? 'rgba(20, 184, 166, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              minWidth: '100px',
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-on-surface-variant)', fontSize: '10px' }}
            >
              Cash Flow
            </span>
            <span
              className="text-lg font-bold font-mono tabular-nums"
              style={{ color: isPositive ? '#14B8A6' : '#F06543' }}
            >
              {fmtCompact(annualCashFlow)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Debt Service Details + Sparkline ── */}
      <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
        {/* Debt Service Details */}
        <div
          className="p-5"
          style={{ borderRight: '1px solid var(--color-glass-border)' }}
        >
          <h4
            className="mb-3 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            Debt Service Details
          </h4>

          {annualDebtService > 0 ? (
            <div className="space-y-2.5">
              {[
                {
                  icon: Landmark,
                  label: 'Loan Amount',
                  value: loanAmount != null ? fmtUSD(loanAmount) : '—',
                },
                {
                  icon: Percent,
                  label: 'Interest Rate',
                  value: loanInterestRate != null ? `${loanInterestRate}%` : '—',
                },
                {
                  icon: Calendar,
                  label: 'Loan Term',
                  value: loanTermYears != null ? `${loanTermYears} years` : '—',
                },
                {
                  icon: DollarSign,
                  label: 'Monthly Payment',
                  value: fmtUSD(monthlyDebtService),
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{
                    background: 'var(--color-surface-container)',
                    border: '1px solid var(--color-glass-border)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-3.5 w-3.5" style={{ color: 'var(--color-on-surface-variant)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--color-on-surface-variant)' }}>
                      {item.label}
                    </span>
                  </div>
                  <span
                    className="text-sm font-bold font-mono tabular-nums"
                    style={{ color: 'var(--color-on-surface)' }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-3 text-xs"
              style={{
                background: 'rgba(20, 184, 166, 0.06)',
                border: '1px solid rgba(20, 184, 166, 0.15)',
                color: '#14B8A6',
              }}
            >
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>No debt service — property is free and clear.</span>
            </div>
          )}
        </div>

        {/* 12-Month Projected Cash Flow Sparkline */}
        <div className="p-5">
          <h4
            className="mb-3 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--color-on-surface-variant)' }}
          >
            12-Month Projected Cash Flow
          </h4>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectedData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isPositive ? '#14B8A6' : '#F06543'}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={isPositive ? '#14B8A6' : '#F06543'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 9, fill: 'var(--color-on-surface-variant)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(val: number) => fmtCompact(val)}
                  tick={{ fontSize: 9, fill: 'var(--color-on-surface-variant)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<SparklineTooltip />} />
                <Area
                  type="monotone"
                  dataKey="cashFlow"
                  stroke={isPositive ? '#14B8A6' : '#F06543'}
                  strokeWidth={2}
                  fill="url(#cfGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p
            className="mt-2 text-xs"
            style={{ color: 'var(--color-on-surface-variant)', opacity: 0.6 }}
          >
            Seasonal variance applied. Actual data will replace projections.
          </p>
        </div>
      </div>
    </div>
  );
}
