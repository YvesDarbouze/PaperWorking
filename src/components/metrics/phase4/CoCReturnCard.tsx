'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CoCBreakdown {
  downPayment: number;
  closingCosts: number;
  rehab: number;
  holdingCosts: number;
}

export interface CoCReturnCardProps {
  annualCashFlow: number;
  totalCashInvested: number;
  breakdown?: CoCBreakdown;
  isLoading?: boolean;
  className?: string;
}

type BandKey = 'excellent' | 'good' | 'fair' | 'poor';

interface Band {
  key: BandKey;
  label: string;
  color: string;
  bg: string;
  border: string;
  textColor: string;
}

const BANDS: Band[] = [
  { key: 'excellent', label: 'Excellent', color: 'var(--pw-accent)', bg: 'var(--pw-glass-bg)', border: 'var(--pw-accent)', textColor: 'var(--pw-accent)' },
  { key: 'good',      label: 'Good',      color: 'var(--pw-accent)', bg: 'var(--pw-glass-bg)', border: 'var(--pw-border)', textColor: 'var(--text-primary)' },
  { key: 'fair',      label: 'Fair',      color: 'var(--text-primary)', bg: 'transparent', border: 'var(--pw-border)', textColor: 'var(--text-secondary)' },
  { key: 'poor',      label: 'Below Target', color: 'var(--color-error)', bg: 'var(--pw-glass-bg)', border: 'var(--color-error)', textColor: 'var(--color-error)' },
];

function getBand(coc: number): Band {
  if (coc > 12) return BANDS[0];
  if (coc >= 8)  return BANDS[1];
  if (coc >= 4)  return BANDS[2];
  return BANDS[3];
}

function safe(n: number | undefined | null): number {
  return (n != null && isFinite(n)) ? n : 0;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '' : ''}${n.toFixed(2)}%`;
}

function fmtDollar(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const SP500_BENCHMARK = 7;

const shimmerCls = 'animate-pulse bg-pw-border/30';

export function CoCReturnCard({ annualCashFlow, totalCashInvested, breakdown, isLoading, className }: CoCReturnCardProps) {
  const coc = useMemo(() => {
    const invested = safe(totalCashInvested);
    return invested > 0 ? (safe(annualCashFlow) / invested) * 100 : 0;
  }, [annualCashFlow, totalCashInvested]);

  const band = getBand(coc);
  const delta = coc - SP500_BENCHMARK;

  if (isLoading) {
    return (
      <div className={`glass-card border border-pw-border bg-bg-surface p-6 space-y-4 ${className ?? ''}`}>
        <div className={`h-4 w-32 ${shimmerCls}`} />
        <div className={`h-12 w-48 ${shimmerCls}`} />
        <div className={`h-3 w-full ${shimmerCls}`} />
        <div className={`h-3 w-3/4 ${shimmerCls}`} />
      </div>
    );
  }

  const breakdownItems = breakdown
    ? [
        { label: 'Down Payment',   value: breakdown.downPayment },
        { label: 'Closing Costs',  value: breakdown.closingCosts },
        { label: 'Rehab',          value: breakdown.rehab },
        { label: 'Holding Costs',  value: breakdown.holdingCosts },
      ]
    : [];

  const DeltaIcon = delta > 0.5 ? TrendingUp : delta < -0.5 ? TrendingDown : Minus;

  return (
    <div
      className={`glass-card border p-6 space-y-5 transition-all ${className ?? ''}`}
      style={{ borderColor: band.border, backgroundColor: band.bg }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black tracking-widest text-text-secondary uppercase">Cash-on-Cash Return</p>
          <p className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wide">Annual Cash Flow ÷ Total Cash Invested</p>
        </div>
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-1 border"
          style={{ color: band.textColor, borderColor: band.border, backgroundColor: band.bg }}
        >
          {band.label}
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <p
          className="text-5xl font-black font-mono tracking-tighter"
          style={{ color: band.color }}
          aria-label={`Cash-on-Cash Return: ${fmtPct(coc)}`}
        >
          {fmtPct(coc)}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="border border-pw-border bg-pw-bg/50 px-3 py-2">
          <p className="text-[9px] text-text-secondary uppercase tracking-widest font-black">Annual Cash Flow</p>
          <p className="text-sm font-bold font-mono text-text-primary mt-0.5">{fmtDollar(safe(annualCashFlow))}</p>
        </div>
        <div className="border border-pw-border bg-pw-bg/50 px-3 py-2">
          <p className="text-[9px] text-text-secondary uppercase tracking-widest font-black">Total Cash Invested</p>
          <p className="text-sm font-bold font-mono text-text-primary mt-0.5">{fmtDollar(safe(totalCashInvested))}</p>
        </div>
      </div>

      {breakdownItems.length > 0 && (
        <div className="space-y-1.5 border-t border-pw-border pt-4">
          <p className="text-[9px] text-text-secondary uppercase tracking-widest font-black mb-2">Cash Invested Breakdown</p>
          {breakdownItems.map(item => (
            <div key={item.label} className="flex items-center justify-between text-[11px] uppercase tracking-wider">
              <span className="text-text-secondary">{item.label}</span>
              <span className="font-bold font-mono text-text-primary">{fmtDollar(safe(item.value))}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-pw-border pt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider">
          <span className="text-text-secondary flex items-center gap-1">
            <span className="inline-block w-3 h-px bg-text-secondary" />
            S&P 500 Avg. ({SP500_BENCHMARK}%)
          </span>
          <span className="font-bold font-mono text-text-primary">{fmtPct(SP500_BENCHMARK)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold">
          <DeltaIcon className={`w-3.5 h-3.5 flex-shrink-0 ${delta >= 0 ? 'text-pw-accent' : 'text-red-500'}`} />
          <span className={delta >= 0 ? 'text-pw-accent' : 'text-red-500'}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(2)}% vs S&P 500
          </span>
        </div>
      </div>

      <div className="flex gap-1.5">
        {BANDS.map(b => (
          <div key={b.key} className="flex-1 space-y-1">
            <div
              className="h-1"
              style={{ backgroundColor: b.key === band.key ? band.color : 'var(--pw-border)' }}
            />
            <p className="text-[8px] text-text-secondary text-center hidden sm:block uppercase tracking-wider">{b.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
