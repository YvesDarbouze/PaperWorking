import React from 'react';

export interface DataFreshnessPillProps {
  lastComputedAt?: string | number | Date;
  className?: string;
}

/**
 * Data Freshness Indicator
 * Displays a badge reflecting data latency:
 * - Green (< 1h): "Fresh (< 1h ago)"
 * - Amber (< 24h): "Stale (< 24h ago)"
 * - Red (>= 24h / unknown): "Outdated (≥ 24h ago)"
 */
export function DataFreshnessPill({ lastComputedAt, className = '' }: DataFreshnessPillProps) {
  const computedDate = lastComputedAt ? new Date(lastComputedAt) : new Date();
  const diffMs = Date.now() - computedDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  let colorStyle = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  let dotStyle = 'bg-emerald-400';
  let statusText = 'Fresh (< 1h ago)';

  if (diffHours >= 24 || isNaN(diffHours)) {
    colorStyle = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    dotStyle = 'bg-rose-400';
    statusText = 'Outdated (≥ 24h ago)';
  } else if (diffHours >= 1) {
    colorStyle = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    dotStyle = 'bg-amber-400';
    statusText = `Stale (${Math.round(diffHours)}h ago)`;
  }

  return (
    <div
      data-testid="data-freshness-pill"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${colorStyle} ${className}`}
      title={`Data last computed: ${computedDate.toLocaleString()}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
      <span>{statusText}</span>
    </div>
  );
}
