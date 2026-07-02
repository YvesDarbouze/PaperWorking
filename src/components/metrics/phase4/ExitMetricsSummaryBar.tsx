'use client';

import { motion } from 'framer-motion';

export interface ExitMetricsSummaryBarProps {
  netProfit: number;
  roi: number;
  cocReturn: number;
  capRate: number;
  isLoading?: boolean;
  className?: string;
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

function fmtPct(n: number, showSign = false): string {
  return `${showSign && n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

interface BenchmarkBadgeProps {
  value: number;
  target: number;
  unit?: 'pct' | 'dollar';
}

function BenchmarkBadge({ value, target }: BenchmarkBadgeProps) {
  const above = value >= target;
  return (
    <span
      className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 font-mono border ${
        above 
          ? 'text-pw-accent border-pw-accent/40 bg-pw-accent/5' 
          : 'text-text-secondary border-pw-border bg-pw-border/20'
      }`}
    >
      {above ? 'On Target' : 'Below'}
    </span>
  );
}

const shimmerCls = 'animate-pulse bg-pw-border/30';

interface KPITileProps {
  label: string;
  value: string;
  target: number;
  rawValue: number;
  delay?: number;
}

function KPITile({ label, value, target, rawValue, delay = 0 }: KPITileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="flex-1 flex flex-col items-center justify-center px-4 py-4 min-w-0 text-center"
    >
      <p className="text-[9px] font-black text-text-secondary uppercase tracking-widest truncate w-full">{label}</p>
      <p className="text-xl font-black text-text-primary tracking-tight mt-1 font-mono">{value}</p>
      <div className="mt-2">
        <BenchmarkBadge value={rawValue} target={target} />
      </div>
    </motion.div>
  );
}

export function ExitMetricsSummaryBar({ netProfit, roi, cocReturn, capRate, isLoading, className }: ExitMetricsSummaryBarProps) {
  if (isLoading) {
    return (
      <div className={`flex items-stretch border border-pw-border bg-bg-surface overflow-hidden divide-x divide-pw-border ${className ?? ''}`}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex-1 flex flex-col items-center justify-center px-4 py-3 space-y-2">
            <div className={`h-2.5 w-16 ${shimmerCls}`} />
            <div className={`h-6 w-20 ${shimmerCls}`} />
            <div className={`h-2 w-12 ${shimmerCls}`} />
          </div>
        ))}
      </div>
    );
  }

  const tiles = [
    {
      label: 'Net Profit',
      value: fmtDollar(safe(netProfit)),
      rawValue: safe(netProfit),
      target: 0,
    },
    {
      label: 'ROI %',
      value: fmtPct(safe(roi), true),
      rawValue: safe(roi),
      target: 25,
    },
    {
      label: 'CoC Return',
      value: fmtPct(safe(cocReturn)),
      rawValue: safe(cocReturn),
      target: 8,
    },
    {
      label: 'Cap Rate (Final)',
      value: fmtPct(safe(capRate)),
      rawValue: safe(capRate),
      target: 6,
    },
  ];

  return (
    <div
      className={`flex items-stretch border border-pw-border bg-bg-surface overflow-hidden divide-x divide-pw-border glass-card ${className ?? ''}`}
      role="group"
      aria-label="Exit metrics summary"
    >
      {tiles.map((tile, i) => (
        <KPITile
          key={tile.label}
          label={tile.label}
          value={tile.value}
          target={tile.target}
          rawValue={tile.rawValue}
          delay={i * 0.08}
        />
      ))}
    </div>
  );
}
