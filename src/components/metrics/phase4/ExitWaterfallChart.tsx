'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ProjectFinancials } from '@/types/schema';
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

export interface ExitWaterfallChartProps {
  financials: ProjectFinancials;
  isLoading?: boolean;
  className?: string;
}

interface WaterfallBar {
  name: string;
  start: number;
  value: number;
  end: number;
  pct: number;
  isTotal: boolean;
  color: string;
}

function safe(n: number | undefined | null): number {
  return n != null && isFinite(n) ? n : 0;
}

function fmtDollar(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function buildWaterfall(fin: ProjectFinancials): WaterfallBar[] {
  const salePrice = safe(fin.actualSalePrice || fin.estimatedARV);
  if (salePrice === 0) return [];

  const rehabCost = fin.costs?.reduce((s, c) => s + safe(c.amount), 0) ?? 0;
  const buyCommission = salePrice * (safe(fin.buyersAgentCommission) / 100);
  const sellCommission = salePrice * (safe(fin.sellersAgentCommission) / 100);
  const agentCommissions = buyCommission + sellCommission;
  const closingCosts = safe(fin.finalClosingCosts);
  const holdingCosts = safe(fin.totalHoldingCosts);
  const loanPayoff = safe(fin.loanAmount);

  const deductions: { name: string; amount: number }[] = [
    { name: 'Loan Payoff',        amount: loanPayoff },
    { name: 'Agent Commissions',  amount: agentCommissions },
    { name: 'Closing Costs',      amount: closingCosts },
    { name: 'Holding Costs',      amount: holdingCosts },
    { name: 'Rehab Costs',        amount: rehabCost },
  ].filter(d => d.amount > 0);

  const bars: WaterfallBar[] = [];

  bars.push({
    name: 'Sale Price',
    start: 0,
    value: salePrice,
    end: salePrice,
    pct: 100,
    isTotal: false,
    color: 'var(--pw-accent)',
  });

  let running = salePrice;

  deductions.forEach(d => {
    const end = running - d.amount;
    bars.push({
      name: d.name,
      start: end,
      value: -d.amount,
      end,
      pct: (d.amount / salePrice) * 100,
      isTotal: false,
      color: 'var(--pw-muted)',
    });
    running = end;
  });

  const netProceeds = running;
  bars.push({
    name: 'Net Proceeds',
    start: 0,
    value: netProceeds,
    end: netProceeds,
    pct: (netProceeds / salePrice) * 100,
    isTotal: true,
    color: netProceeds >= 0 ? 'var(--pw-accent)' : 'var(--color-error)',
  });

  return bars;
}

const shimmerCls = 'animate-pulse bg-pw-border/30';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WaterfallBar }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const bar = payload[0].payload;
  return (
    <div className="bg-bg-surface/90 backdrop-blur-md border border-pw-border px-4 py-3 shadow-lg text-xs">
      <p className="font-black text-[9px] text-text-secondary uppercase tracking-widest mb-1">{bar.name}</p>
      <p className="font-black text-text-primary text-base font-mono">{fmtDollar(Math.abs(bar.value))}</p>
      <p className="text-text-secondary mt-0.5 uppercase tracking-wider text-[9px]">{bar.pct.toFixed(1)}% of sale price</p>
    </div>
  );
}

export function ExitWaterfallChart({ financials, isLoading, className }: ExitWaterfallChartProps) {
  const bars = useMemo(() => buildWaterfall(financials), [financials]);

  if (isLoading) {
    return (
      <div className={`glass-card border border-pw-border bg-bg-surface p-6 space-y-4 ${className ?? ''}`}>
        <div className={`h-4 w-40 ${shimmerCls}`} />
        <div className={`h-56 w-full ${shimmerCls}`} />
      </div>
    );
  }

  const salePrice = safe(financials.actualSalePrice || financials.estimatedARV);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`glass-card border border-pw-border bg-bg-surface p-6 space-y-5 ${className ?? ''}`}
    >
      <div>
        <p className="text-[10px] font-black tracking-widest text-text-secondary uppercase">Exit Waterfall</p>
        <p className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wider">Proceeds distribution from sale price to net</p>
      </div>

      {bars.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-text-secondary text-xs uppercase tracking-widest font-black">
          No exit financials available
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={bars} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--pw-border)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--pw-muted)', fontSize: 9, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
                dy={6}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tickFormatter={fmtDollar}
                tick={{ fill: 'var(--pw-muted)', fontSize: 9, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                domain={[0, salePrice * 1.05]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--pw-border)', opacity: 0.5 }} />
              <ReferenceLine y={0} stroke="var(--pw-border)" strokeWidth={1} />

              <Bar dataKey="start" stackId="waterfall" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="value" stackId="waterfall" radius={[0, 0, 0, 0]} maxBarSize={40} isAnimationActive>
                {bars.map((bar, i) => (
                  <Cell key={i} fill={bar.color} />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {bars.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-pw-border">
          {bars.map((bar, i) => (
            <div key={i} className="flex items-center justify-between text-[11px] uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: bar.color }} />
                <span className="text-text-primary font-bold">{bar.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-text-secondary text-[9px] font-mono">{bar.pct.toFixed(1)}%</span>
                <span className="font-bold font-mono text-text-primary w-20 text-right">{fmtDollar(Math.abs(bar.value))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
