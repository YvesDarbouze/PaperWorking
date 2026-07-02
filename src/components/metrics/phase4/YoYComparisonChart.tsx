'use client';

import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

export interface YearMetrics {
  noi: number;
  cashFlow: number;
  capRate: number;
  cocReturn: number;
}

export interface YoYComparisonChartProps {
  currentYearMetrics: YearMetrics;
  priorYearMetrics?: Partial<YearMetrics>;
  isLoading?: boolean;
  className?: string;
}

function safe(n: number | undefined | null): number {
  return n != null && isFinite(n) ? n : 0;
}

function fmtDollar(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const shimmerCls = 'animate-pulse bg-pw-border/30';

const METRICS_LABELS: Record<keyof YearMetrics, string> = {
  noi:       'NOI',
  cashFlow:  'Cash Flow',
  capRate:   'Cap Rate',
  cocReturn: 'CoC Return',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-bg-surface/90 backdrop-blur-md border border-pw-border px-4 py-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-black text-[9px] text-text-secondary uppercase tracking-widest mb-2 border-b border-pw-border pb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4 mt-1 uppercase tracking-wider text-[9px]">
          <span className="text-text-secondary">{p.name}</span>
          <span className="font-bold font-mono text-text-primary">
            {p.name.includes('%') || p.name.includes('Rate') || p.name.includes('CoC')
              ? `${safe(p.value).toFixed(2)}%`
              : fmtDollar(safe(p.value))
            }
          </span>
        </div>
      ))}
    </div>
  );
}

function buildTimelineData(current: YearMetrics, prior?: Partial<YearMetrics>) {
  return [
    {
      period: '2025',
      noi: safe(prior?.noi),
      cashFlow: safe(prior?.cashFlow),
      capRate: safe(prior?.capRate),
      cocReturn: safe(prior?.cocReturn),
    },
    {
      period: '2026',
      noi: safe(current.noi),
      cashFlow: safe(current.cashFlow),
      capRate: safe(current.capRate),
      cocReturn: safe(current.cocReturn),
    },
  ];
}

export function YoYComparisonChart({ currentYearMetrics, priorYearMetrics, isLoading, className }: YoYComparisonChartProps) {
  const hasPrior = priorYearMetrics != null && Object.values(priorYearMetrics).some(v => safe(v) !== 0);
  const timeline = buildTimelineData(currentYearMetrics, priorYearMetrics);

  if (isLoading) {
    return (
      <div className={`glass-card border border-pw-border bg-bg-surface p-6 space-y-4 ${className ?? ''}`}>
        <div className={`h-4 w-48 ${shimmerCls}`} />
        <div className={`h-56 w-full ${shimmerCls}`} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`glass-card border border-pw-border bg-bg-surface p-6 space-y-5 ${className ?? ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black tracking-widest text-text-secondary uppercase">Year-over-Year Performance</p>
          <p className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wider">2025 vs 2026 — NOI, Cash Flow, Cap Rate, CoC</p>
        </div>
        {!hasPrior && (
          <span className="text-[9px] text-text-secondary bg-pw-bg/50 border border-pw-border px-2 py-0.5 font-black uppercase tracking-widest">
            Prior year estimated
          </span>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timeline} margin={{ top: 8, right: 40, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--pw-border)" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: 'var(--pw-muted)', fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="dollar"
              orientation="left"
              tickFormatter={fmtDollar}
              tick={{ fill: 'var(--pw-muted)', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tickFormatter={v => `${v}%`}
              tick={{ fill: 'var(--pw-muted)', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--pw-border)', strokeWidth: 2 }} />
            <Legend
              wrapperStyle={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--pw-muted)' }}
            />
            <ReferenceLine yAxisId="pct" y={0} stroke="var(--pw-border)" strokeWidth={1} />

            <Bar yAxisId="dollar" dataKey="noi"      name="NOI"       fill="var(--pw-accent)"  radius={[0, 0, 0, 0]} maxBarSize={24} opacity={0.85} />
            <Bar yAxisId="dollar" dataKey="cashFlow"  name="Cash Flow" fill="var(--pw-muted)"   radius={[0, 0, 0, 0]} maxBarSize={24} opacity={0.85} />
            <Line yAxisId="pct"   dataKey="capRate"   name="Cap Rate %" stroke="var(--color-outline)" strokeWidth={2} dot={{ r: 4, fill: 'var(--color-outline)', strokeWidth: 0 }} activeDot={{ r: 6 }} type="monotone" />
            <Line yAxisId="pct"   dataKey="cocReturn" name="CoC Return %" stroke="var(--pw-accent)" strokeWidth={2} dot={{ r: 4, fill: 'var(--pw-accent)', strokeWidth: 0 }} activeDot={{ r: 6 }} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-pw-border">
        {(Object.keys(METRICS_LABELS) as (keyof YearMetrics)[]).map(key => {
          const curr = safe(currentYearMetrics[key]);
          const prev = safe(priorYearMetrics?.[key]);
          const delta = curr - prev;
          const isPct = key === 'capRate' || key === 'cocReturn';
          return (
            <div key={key} className="border border-pw-border bg-pw-bg/50 px-3 py-2.5">
              <p className="text-[9px] text-text-secondary uppercase tracking-widest font-black">{METRICS_LABELS[key]}</p>
              <p className="text-sm font-bold font-mono text-text-primary mt-0.5">
                {isPct ? `${curr.toFixed(2)}%` : fmtDollar(curr)}
              </p>
              {hasPrior && (
                <p className={`text-[9px] mt-0.5 font-bold font-mono ${delta >= 0 ? 'text-pw-accent' : 'text-text-secondary'}`}>
                  {delta >= 0 ? '+' : ''}{isPct ? `${delta.toFixed(2)}%` : fmtDollar(delta)} YoY
                </p>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
