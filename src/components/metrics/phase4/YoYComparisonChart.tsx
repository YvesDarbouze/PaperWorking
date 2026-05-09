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

const shimmerCls = 'animate-pulse bg-pw-border/30 rounded';

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
    <div className="bg-pw-surface border border-pw-border rounded-xl px-4 py-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-mono text-[9px] text-pw-muted uppercase tracking-widest mb-2 border-b border-pw-border pb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4 mt-1">
          <span className="text-pw-subtle">{p.name}</span>
          <span className="font-mono text-pw-fg">
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
      <div className={`rounded-2xl border border-pw-border bg-pw-surface p-6 space-y-4 ${className ?? ''}`}>
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
      className={`rounded-2xl border border-pw-border bg-pw-surface p-6 space-y-5 ${className ?? ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-widest text-pw-subtle uppercase">Year-over-Year Performance</p>
          <p className="text-[10px] text-pw-muted mt-0.5">2025 vs 2026 — NOI, Cash Flow, Cap Rate, CoC</p>
        </div>
        {!hasPrior && (
          <span className="text-[9px] text-pw-muted bg-pw-bg border border-pw-border rounded-full px-2 py-0.5 font-mono">
            Prior year estimated
          </span>
        )}
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timeline} margin={{ top: 8, right: 40, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#F2F2F2" vertical={false} />
            <XAxis
              dataKey="period"
              tick={{ fill: '#7F7F7F', fontSize: 10, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="dollar"
              orientation="left"
              tickFormatter={fmtDollar}
              tick={{ fill: '#A5A5A5', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tickFormatter={v => `${v}%`}
              tick={{ fill: '#A5A5A5', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F2F2F2', strokeWidth: 2 }} />
            <Legend
              wrapperStyle={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7F7F7F' }}
            />
            <ReferenceLine yAxisId="pct" y={0} stroke="#CCCCCC" strokeWidth={1} />

            <Bar yAxisId="dollar" dataKey="noi"      name="NOI"       fill="#0D0D0D"  radius={[3, 3, 0, 0]} maxBarSize={24} opacity={0.85} />
            <Bar yAxisId="dollar" dataKey="cashFlow"  name="Cash Flow" fill="#595959"  radius={[3, 3, 0, 0]} maxBarSize={24} opacity={0.85} />
            <Line yAxisId="pct"   dataKey="capRate"   name="Cap Rate %" stroke="#A5A5A5" strokeWidth={2} dot={{ r: 4, fill: '#A5A5A5', strokeWidth: 0 }} activeDot={{ r: 6 }} type="monotone" />
            <Line yAxisId="pct"   dataKey="cocReturn" name="CoC Return %" stroke="#1A73E8" strokeWidth={2} dot={{ r: 4, fill: '#1A73E8', strokeWidth: 0 }} activeDot={{ r: 6 }} type="monotone" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(Object.keys(METRICS_LABELS) as (keyof YearMetrics)[]).map(key => {
          const curr = safe(currentYearMetrics[key]);
          const prev = safe(priorYearMetrics?.[key]);
          const delta = curr - prev;
          const isPct = key === 'capRate' || key === 'cocReturn';
          return (
            <div key={key} className="rounded-xl border border-pw-border bg-pw-bg px-3 py-2.5">
              <p className="text-[9px] text-pw-muted uppercase tracking-widest font-mono">{METRICS_LABELS[key]}</p>
              <p className="text-sm font-mono text-pw-black mt-0.5">
                {isPct ? `${curr.toFixed(2)}%` : fmtDollar(curr)}
              </p>
              {hasPrior && (
                <p className={`text-[9px] mt-0.5 font-mono ${delta >= 0 ? 'text-pw-fg' : 'text-pw-muted'}`}>
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
