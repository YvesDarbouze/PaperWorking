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
  { key: 'excellent', label: 'Excellent', color: '#0D0D0D', bg: '#0D0D0D10', border: '#0D0D0D40', textColor: '#0D0D0D' },
  { key: 'good',      label: 'Good',      color: '#595959', bg: '#59595910', border: '#59595940', textColor: '#595959' },
  { key: 'fair',      label: 'Fair',      color: '#A5A5A5', bg: '#A5A5A510', border: '#A5A5A540', textColor: '#7F7F7F' },
  { key: 'poor',      label: 'Below Target', color: '#CCCCCC', bg: '#F2F2F2', border: '#CCCCCC', textColor: '#A5A5A5' },
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

const shimmerCls = 'animate-pulse bg-pw-border/30 rounded';

export function CoCReturnCard({ annualCashFlow, totalCashInvested, breakdown, isLoading, className }: CoCReturnCardProps) {
  const coc = useMemo(() => {
    const invested = safe(totalCashInvested);
    return invested > 0 ? (safe(annualCashFlow) / invested) * 100 : 0;
  }, [annualCashFlow, totalCashInvested]);

  const band = getBand(coc);
  const delta = coc - SP500_BENCHMARK;

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-pw-border bg-pw-surface p-6 space-y-4 ${className ?? ''}`}>
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
      className={`rounded-2xl border bg-pw-surface p-6 space-y-5 transition-all ${className ?? ''}`}
      style={{ borderColor: band.border, backgroundColor: band.bg }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono tracking-widest text-pw-subtle uppercase">Cash-on-Cash Return</p>
          <p className="text-[10px] text-pw-muted mt-0.5">Annual Cash Flow ÷ Total Cash Invested</p>
        </div>
        <span
          className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border"
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
          className="text-5xl font-normal tracking-tighter"
          style={{ color: band.color }}
          aria-label={`Cash-on-Cash Return: ${fmtPct(coc)}`}
        >
          {fmtPct(coc)}
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-pw-border bg-pw-bg px-3 py-2">
          <p className="text-[9px] text-pw-muted uppercase tracking-widest font-mono">Annual Cash Flow</p>
          <p className="text-sm font-mono text-pw-fg mt-0.5">{fmtDollar(safe(annualCashFlow))}</p>
        </div>
        <div className="rounded-xl border border-pw-border bg-pw-bg px-3 py-2">
          <p className="text-[9px] text-pw-muted uppercase tracking-widest font-mono">Total Cash Invested</p>
          <p className="text-sm font-mono text-pw-fg mt-0.5">{fmtDollar(safe(totalCashInvested))}</p>
        </div>
      </div>

      {breakdownItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] text-pw-muted uppercase tracking-widest font-mono">Cash Invested Breakdown</p>
          {breakdownItems.map(item => (
            <div key={item.label} className="flex items-center justify-between text-[11px]">
              <span className="text-pw-subtle">{item.label}</span>
              <span className="font-mono text-pw-fg">{fmtDollar(safe(item.value))}</span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-pw-border pt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-pw-muted flex items-center gap-1">
            <span className="inline-block w-3 h-px bg-pw-muted" />
            S&P 500 Avg. ({SP500_BENCHMARK}%)
          </span>
          <span className="font-mono text-pw-fg">{fmtPct(SP500_BENCHMARK)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <DeltaIcon className="w-3 h-3 flex-shrink-0" style={{ color: delta >= 0 ? '#0D0D0D' : '#A5A5A5' }} />
          <span style={{ color: delta >= 0 ? '#0D0D0D' : '#7F7F7F' }}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(2)}% vs S&P 500
          </span>
        </div>
      </div>

      <div className="flex gap-1.5">
        {BANDS.map(b => (
          <div key={b.key} className="flex-1 space-y-1">
            <div
              className="h-1 rounded-full"
              style={{ backgroundColor: b.key === band.key ? band.color : '#CCCCCC' }}
            />
            <p className="text-[8px] text-pw-muted text-center hidden sm:block">{b.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
