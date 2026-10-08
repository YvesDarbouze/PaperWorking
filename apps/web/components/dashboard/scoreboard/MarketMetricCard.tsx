'use client';

import React from 'react';
import { TrendUp, TrendDown, Minus } from '@/components/icons/PhosphorIcons';
import { LiveTickerItem } from '@/lib/market/types';

export interface MarketMetricCardProps {
  item: LiveTickerItem;
  onClick?: () => void;
}

export default function MarketMetricCard({ item, onClick }: MarketMetricCardProps) {
  const isZero = item.delta === 0;
  const isUp = item.delta > 0;
  
  // For debt/yields, up is red/unfavorable. For equities/VNQ, up is green.
  const isGood = item.isPositiveGood ? isUp : !isUp;
  const deltaColor = isZero
    ? 'text-muted-foreground'
    : isGood
    ? 'text-emerald-500 dark:text-emerald-400'
    : 'text-rose-500 dark:text-rose-400';

  const formattedValue =
    item.unit === 'usd'
      ? `$${item.currentValue.toFixed(item.formatDecimals)}`
      : `${item.currentValue.toFixed(item.formatDecimals)}%`;

  const deltaSign = item.delta > 0 ? '+' : '';
  const formattedDelta = `${deltaSign}${item.delta.toFixed(item.formatDecimals)}`;
  const formattedDeltaPct = `${deltaSign}${item.deltaPct.toFixed(2)}%`;

  // Compute mini sparkline points
  const sparklineCoords = React.useMemo(() => {
    if (!item.sparkline || item.sparkline.length < 2) return '';
    const min = Math.min(...item.sparkline);
    const max = Math.max(...item.sparkline);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    return item.sparkline
      .map((val, idx) => {
        const x = (idx / (item.sparkline.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [item.sparkline]);

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
        {/* Top row: Symbol and source tag */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="font-mono text-[11px] font-bold tracking-tight text-foreground uppercase">
            {item.symbol}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground border border-border px-1 py-0.2">
            {item.frequency}
          </span>
        </div>

        {/* Name */}
        <p className="text-xs text-muted-foreground font-medium line-clamp-1 mb-2">
          {item.name}
        </p>
      </div>

      <div>
        {/* Main Value and Sparkline */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formattedValue}
          </span>

          {sparklineCoords && (
            <div className="h-6 w-20 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 80 24" className="h-full w-full overflow-visible">
                <path
                  d={sparklineCoords}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={deltaColor}
                />
              </svg>
            </div>
          )}
        </div>

        {/* Delta change */}
        <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
          <span className={`inline-flex items-center gap-0.5 font-semibold ${deltaColor}`}>
            {isZero ? (
              <Minus className="h-3 w-3" />
            ) : isUp ? (
              <TrendUp className="h-3 w-3" />
            ) : (
              <TrendDown className="h-3 w-3" />
            )}
            {formattedDelta} ({formattedDeltaPct})
          </span>
          <span className="text-[10px] text-muted-foreground">vs prev</span>
        </div>
      </div>
    </div>
  );
}
