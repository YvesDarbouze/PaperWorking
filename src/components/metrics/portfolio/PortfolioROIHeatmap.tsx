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
  ReferenceLine,
  Legend,
  Cell,
} from 'recharts';

export interface HeatmapDeal {
  address: string;
  financials: ProjectFinancials;
}

export interface PortfolioROIHeatmapProps {
  deals: HeatmapDeal[];
  isLoading?: boolean;
  className?: string;
}

function safe(n: number | undefined | null): number {
  return n != null && isFinite(n) ? n : 0;
}

function shortAddress(addr: string): string {
  const parts = addr.split(',');
  return parts[0]?.trim().split(' ').slice(0, 3).join(' ') || addr.slice(0, 14);
}

function fmtDollar(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs}`;
}

interface ProcessedDeal {
  name: string;
  capRate: number;
  cocReturn: number;
  noi: number;
  cashFlow: number;
  score: number;
}

const TARGETS = {
  capRate:   6,
  cocReturn: 8,
  noi:       0,
  cashFlow:  0,
};

function processDeal(d: HeatmapDeal): ProcessedDeal {
  const fin = d.financials;
  const rent = safe(fin.monthlyGrossRent || fin.projectedMonthlyRent);
  const vacRate = safe(fin.vacancyRatePercent ?? fin.vacancyRate) / 100;
  const annualRent = rent * (1 - vacRate) * 12;
  const opex =
    safe(fin.holdingCostTaxes) * 12 +
    safe(fin.holdingCostInsurance) * 12 +
    safe(fin.monthlyMaintenanceReserve) * 12 +
    safe(fin.monthlyHOA) * 12;
  const noi = annualRent - opex;
  const value = safe(fin.estimatedCurrentValue || fin.estimatedARV);
  const capRate = value > 0 ? (noi / value) * 100 : 0;

  const purchase = safe(fin.purchasePrice);
  const rehab = fin.costs?.reduce((s, c) => s + safe(c.amount), 0) ?? 0;
  const totalInvested = purchase + rehab;
  const mortgage = safe(fin.longTermMortgagePayment) * 12;
  const cashFlow = noi - mortgage;
  const cocReturn = totalInvested > 0 ? (cashFlow / totalInvested) * 100 : 0;

  const score =
    (capRate >= TARGETS.capRate   ? 1 : 0) +
    (cocReturn >= TARGETS.cocReturn ? 1 : 0) +
    (noi > 0 ? 1 : 0) +
    (cashFlow > 0 ? 1 : 0);

  return {
    name: shortAddress(d.address),
    capRate: Math.round(capRate * 100) / 100,
    cocReturn: Math.round(cocReturn * 100) / 100,
    noi: Math.round(noi),
    cashFlow: Math.round(cashFlow),
    score,
  };
}

function barColor(value: number, target: number, isAbove: boolean): string {
  if (isAbove || value >= target) return '#0D0D0D';
  if (value > target * 0.5) return '#A5A5A5';
  return '#CCCCCC';
}

const shimmerCls = 'animate-pulse bg-pw-border/30 rounded';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-pw-surface border border-pw-border rounded-xl px-4 py-3 shadow-lg text-xs min-w-[160px]">
      <p className="font-mono text-[9px] text-pw-muted uppercase tracking-widest mb-2 border-b border-pw-border pb-1">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4 mt-1">
          <span className="text-pw-subtle">{p.name}</span>
          <span className="font-mono text-pw-fg">
            {p.name === 'NOI' || p.name === 'Cash Flow' ? fmtDollar(p.value) : `${safe(p.value).toFixed(2)}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PortfolioROIHeatmap({ deals, isLoading, className }: PortfolioROIHeatmapProps) {
  const processed = useMemo(() => {
    return deals
      .map(processDeal)
      .sort((a, b) => b.score - a.score || b.capRate - a.capRate);
  }, [deals]);

  const avgCapRate = processed.length > 0
    ? processed.reduce((s, d) => s + d.capRate, 0) / processed.length
    : 0;

  const avgCoc = processed.length > 0
    ? processed.reduce((s, d) => s + d.cocReturn, 0) / processed.length
    : 0;

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-pw-border bg-pw-surface p-6 space-y-4 ${className ?? ''}`}>
        <div className={`h-4 w-48 ${shimmerCls}`} />
        <div className={`h-56 w-full ${shimmerCls}`} />
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className={`rounded-2xl border border-pw-border bg-pw-surface p-6 flex items-center justify-center h-48 ${className ?? ''}`}>
        <p className="text-pw-muted text-xs font-mono">No portfolio data available</p>
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
          <p className="text-[10px] font-mono tracking-widest text-pw-subtle uppercase">Portfolio Performance Heatmap</p>
          <p className="text-[10px] text-pw-muted mt-0.5">Properties sorted by overall score — darker = above target</p>
        </div>
        <div className="flex gap-2 text-[9px] font-mono text-pw-muted">
          <span>Avg Cap: {avgCapRate.toFixed(2)}%</span>
          <span>·</span>
          <span>Avg CoC: {avgCoc.toFixed(2)}%</span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={processed} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#F2F2F2" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#7F7F7F', fontSize: 9, fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
              dy={4}
              angle={-20}
              textAnchor="end"
              height={40}
              interval={0}
            />
            <YAxis
              yAxisId="pct"
              orientation="left"
              tickFormatter={v => `${v}%`}
              tick={{ fill: '#A5A5A5', fontSize: 9, fontFamily: 'monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F2F2F2', opacity: 0.5 }} />
            <Legend
              wrapperStyle={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7F7F7F' }}
            />
            <ReferenceLine yAxisId="pct" y={TARGETS.capRate} stroke="#A5A5A5" strokeDasharray="4 3" strokeWidth={1} label={{ value: 'Cap Target', position: 'insideTopRight', fontSize: 8, fill: '#A5A5A5' }} />
            <ReferenceLine yAxisId="pct" y={avgCapRate} stroke="#0D0D0D" strokeDasharray="6 4" strokeWidth={1} label={{ value: 'Avg Cap', position: 'insideTopLeft', fontSize: 8, fill: '#0D0D0D' }} />

            <Bar yAxisId="pct" dataKey="capRate" name="Cap Rate" maxBarSize={20} radius={[3, 3, 0, 0]}>
              {processed.map((d, i) => (
                <Cell key={i} fill={barColor(d.capRate, TARGETS.capRate, false)} />
              ))}
            </Bar>
            <Bar yAxisId="pct" dataKey="cocReturn" name="CoC Return" maxBarSize={20} radius={[3, 3, 0, 0]} opacity={0.7}>
              {processed.map((d, i) => (
                <Cell key={i} fill={barColor(d.cocReturn, TARGETS.cocReturn, false)} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-px bg-pw-border overflow-hidden rounded-xl border border-pw-border">
        <div className="grid grid-cols-5 bg-pw-bg px-3 py-1.5">
          {['Property', 'Cap Rate', 'CoC Return', 'NOI', 'Cash Flow'].map(h => (
            <p key={h} className="text-[8px] font-mono text-pw-muted uppercase tracking-widest">{h}</p>
          ))}
        </div>
        {processed.map((d, i) => (
          <div key={i} className="grid grid-cols-5 bg-pw-surface px-3 py-2 border-t border-pw-border">
            <p className="text-[10px] text-pw-fg font-medium truncate">{d.name}</p>
            <p className={`text-[10px] font-mono ${d.capRate >= TARGETS.capRate ? 'text-pw-black' : 'text-pw-muted'}`}>{d.capRate.toFixed(2)}%</p>
            <p className={`text-[10px] font-mono ${d.cocReturn >= TARGETS.cocReturn ? 'text-pw-black' : 'text-pw-muted'}`}>{d.cocReturn.toFixed(2)}%</p>
            <p className={`text-[10px] font-mono ${d.noi > 0 ? 'text-pw-fg' : 'text-pw-muted'}`}>{fmtDollar(d.noi)}</p>
            <p className={`text-[10px] font-mono ${d.cashFlow > 0 ? 'text-pw-fg' : 'text-pw-muted'}`}>{fmtDollar(d.cashFlow)}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
