'use client';

import React from 'react';
import type { MetricResult, MetricState } from '@/lib/metrics/types';

/* ═══════════════════════════════════════════════════════════════
   MetricReadout — Live metric value with state pill
   
   Displays a computed metric value alongside its lifecycle state
   (PROJECTED / LIVE / REALIZED / INCOMPLETE). When the metric
   is incomplete, shows the list of missing inputs so the user
   knows exactly what to fill in.
   
   Design: Glass-card aesthetic, tabular-nums, PaperWorking tokens.
   ═══════════════════════════════════════════════════════════════ */

/** State pill color mapping following PaperWorking design system */
const STATE_PILL_STYLES: Record<MetricState, { bg: string; text: string; label: string }> = {
  projected:  { bg: 'bg-amber-500/15',  text: 'text-amber-400',   label: 'PROJECTED' },
  actual:     { bg: 'bg-blue-500/15',   text: 'text-blue-400',    label: 'ACTUAL' },
  live:       { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'LIVE' },
  realized:   { bg: 'bg-blue-400/15',   text: 'text-blue-300',    label: 'REALIZED' },
  incomplete: { bg: 'bg-gray-500/15',   text: 'text-gray-400',    label: 'INCOMPLETE' },
  'n/a':      { bg: 'bg-gray-500/10',   text: 'text-gray-500',    label: 'N/A' },
};

export type MetricFormat = 'currency' | 'percent' | 'ratio' | 'multiplier';

export interface MetricReadoutProps {
  /** Metric display label (e.g., "NOI", "Cap Rate") */
  label: string;
  /** MetricResult from the structured compute wrapper */
  result: MetricResult;
  /** How to format the numeric value */
  format: MetricFormat;
  /** Optional phase accent color (default: teal #454955) */
  accentColor?: string;
  /** Whether to show a compact layout (no fill bar) */
  compact?: boolean;
}

/** Format a number according to the specified format type */
function formatValue(value: number | null, format: MetricFormat): string {
  if (value === null) return '—';

  switch (format) {
    case 'currency': {
      const abs = Math.abs(value);
      const sign = value < 0 ? '-' : '';
      if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
      return `${sign}$${abs.toFixed(0)}`;
    }
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'ratio':
      return `${value.toFixed(2)}x`;
    case 'multiplier':
      return `${value.toFixed(1)}`;
    default:
      return String(value);
  }
}

/** Convert a field path like "financials.monthlyGrossRent" to a human label */
function humanizeFieldPath(path: string): string {
  const field = path.split('.').pop() ?? path;
  // camelCase → spaced words
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

export function MetricReadout({
  label,
  result,
  format,
  accentColor = '#454955',
  compact = false,
}: MetricReadoutProps) {
  const pillStyle = STATE_PILL_STYLES[result.state];
  const isIncomplete = result.state === 'incomplete';
  const isNA = result.state === 'n/a';

  return (
    <div className="space-y-1.5">
      {/* Label + State Pill row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-[#9E9DA0] uppercase tracking-wider font-medium">
          {label}
        </p>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${pillStyle.bg} ${pillStyle.text}`}
        >
          {pillStyle.label}
        </span>
      </div>

      {/* Value display */}
      <p
        className={`text-[24px] leading-[32px] font-semibold ${
          isIncomplete || isNA ? 'text-[#9E9DA0]/40' : 'text-[#9E9DA0]'
        }`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {isNA ? 'N/A' : formatValue(result.value, format)}
      </p>

      {/* Fill bar (non-compact mode only) */}
      {!compact && !isIncomplete && !isNA && result.value !== null && (
        <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: `${accentColor}20` }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, computeFillPercent(result.value, format)))}%`,
              background: accentColor,
            }}
          />
        </div>
      )}

      {/* Missing inputs callout */}
      {isIncomplete && result.inputsMissing.length > 0 && (
        <div className="mt-1 space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-400/70">
            Missing inputs:
          </p>
          <ul className="space-y-0">
            {result.inputsMissing.map((field) => (
              <li key={field} className="text-[10px] text-[#9E9DA0]/60 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-amber-400/50 shrink-0" />
                {humanizeFieldPath(field)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Compute a 0-100 fill percentage based on value and format type */
function computeFillPercent(value: number, format: MetricFormat): number {
  switch (format) {
    case 'currency':
      // Scale: $0 → 0%, $200k → 100%
      return Math.min(100, (Math.abs(value) / 200_000) * 100);
    case 'percent':
      // Direct percentage (cap at 100)
      return Math.min(100, Math.abs(value) * 10);
    case 'ratio':
      // 0x → 0%, 2x → 100%
      return Math.min(100, Math.abs(value) * 50);
    case 'multiplier':
      // 0 → 0%, 20 → 100%
      return Math.min(100, Math.abs(value) * 5);
    default:
      return 0;
  }
}

export default MetricReadout;
