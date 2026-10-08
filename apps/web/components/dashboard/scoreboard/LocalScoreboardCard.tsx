'use client';

import React from 'react';
import { TrendUp, TrendDown, Minus } from '@/components/icons/PhosphorIcons';
import { MarketIndicatorMetric } from '@/lib/market/types';

export interface LocalScoreboardCardProps {
  metric: MarketIndicatorMetric;
  onClick?: () => void;
}

export default function LocalScoreboardCard({ metric, onClick }: LocalScoreboardCardProps) {
  const isZero = metric.delta === 0;
  const isUp = metric.delta > 0;

  // Regime color badges
  const regimeStyles = {
    SELLER: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    BALANCED: 'border-border bg-muted/30 text-muted-foreground',
    BUYER: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    DISTRESSED: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }[metric.marketRegime];

  const formattedVal =
    metric.unit === 'months'
      ? `${metric.value.toFixed(metric.formatDecimals)} mo`
      : metric.unit === 'days'
      ? `${metric.value.toFixed(metric.formatDecimals)} days`
      : `${metric.value.toFixed(metric.formatDecimals)}%`;

  const deltaSign = metric.delta > 0 ? '+' : '';
  const formattedDelta = `${deltaSign}${metric.delta.toFixed(metric.formatDecimals)}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="group relative flex flex-col justify-between border border-border bg-card p-3.5 transition-all duration-150 hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-left cursor-pointer select-none rounded-none"
    >
      <div>
        {/* Top row: Label and regime badge */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-mono text-[11px] font-bold tracking-tight text-foreground uppercase">
            {metric.id.toUpperCase()}
          </span>
          <span className={`text-[9px] font-mono uppercase font-bold tracking-wider border px-1.5 py-0.5 ${regimeStyles}`}>
            {metric.marketRegime}
          </span>
        </div>

        {/* Name */}
        <p className="text-xs text-muted-foreground font-medium line-clamp-1 mb-2">
          {metric.label}
        </p>
      </div>

      <div>
        {/* Main Value */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formattedVal}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {metric.benchmarkRange}
          </span>
        </div>

        {/* Delta change & interpretation */}
        <div className="mt-1.5 flex items-center justify-between gap-1 font-mono text-[11px] tabular-nums">
          <span className="inline-flex items-center gap-0.5 text-muted-foreground font-semibold">
            {isZero ? (
              <Minus className="h-3 w-3" />
            ) : isUp ? (
              <TrendUp className="h-3 w-3" />
            ) : (
              <TrendDown className="h-3 w-3" />
            )}
            {formattedDelta} ({metric.unit})
          </span>
          <span className="text-[9px] font-sans text-muted-foreground truncate max-w-[120px]">
            {metric.healthyThreshold}
          </span>
        </div>
      </div>
    </div>
  );
}
