'use client';

/**
 * AvmBadge — displays an AVM or rent estimate with range + source + asOf.
 *
 * Design rules (from the AGENTS.md RentCast integration rules):
 *   - Never render a bare point value alone — always render low–high range alongside it.
 *   - If range bounds are absent → show "Estimate unavailable" not a number.
 *   - If sourceProvider contains "Mock" → add [mock] label in muted text.
 *   - If noCoverage → show "No data for this address".
 *   - Label source + asOf on every display.
 */

interface AvmBadgeProps {
  /** Label shown above the value, e.g. "Est. Value" or "Est. Rent / mo" */
  label: string;
  /** Midpoint estimate in cents */
  valueCents?:    number;
  /** Range low bound in cents */
  lowCents?:      number;
  /** Range high bound in cents */
  highCents?:     number;
  /** sourceProvider string from PropertyFacts */
  sourceProvider?: string;
  /** ISO-8601 timestamp */
  asOf?:          string;
  /** When true, renders the no-data state */
  noCoverage?:    boolean;
  /** Additional className for the container */
  className?:     string;
}

function formatK(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000)     return `$${Math.round(dollars / 1_000)}k`;
  return `$${Math.round(dollars).toLocaleString()}`;
}

function formatFull(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-US');
}

export function AvmBadge({
  label,
  valueCents,
  lowCents,
  highCents,
  sourceProvider,
  asOf,
  noCoverage,
  className = '',
}: AvmBadgeProps) {
  const isMock = sourceProvider?.toLowerCase().includes('mock') ?? false;

  if (noCoverage) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em]">
          {label}
        </span>
        <span className="text-xs text-text-secondary font-medium">
          No data for this address
        </span>
      </div>
    );
  }

  const hasValue = valueCents != null;
  const hasRange = lowCents != null && highCents != null;

  const asOfLabel = asOf
    ? new Date(asOf).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  // Normalise source label
  const sourceLabel = isMock
    ? 'Mock data'
    : sourceProvider
      ? sourceProvider.charAt(0).toUpperCase() + sourceProvider.slice(1)
      : null;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.3em]">
        {label}
      </span>

      {hasValue ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-black text-text-primary tabular-nums">
            {formatFull(valueCents!)}
          </span>

          {hasRange && (
            <span className="text-[10px] text-text-secondary font-medium tabular-nums">
              {formatK(lowCents!)}–{formatK(highCents!)} range
            </span>
          )}
        </div>
      ) : (
        <span className="text-xs text-text-secondary font-medium">
          Estimate unavailable
        </span>
      )}

      {/* Source + timestamp footer */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {sourceLabel && (
          <span
            className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
              isMock
                ? 'bg-amber-900/20 text-amber-400'
                : 'bg-bg-surface text-text-secondary'
            }`}
          >
            {isMock ? '⚠ mock' : sourceLabel}
          </span>
        )}
        {asOfLabel && !isMock && (
          <span className="text-[9px] text-text-secondary">
            · as of {asOfLabel}
          </span>
        )}
      </div>
    </div>
  );
}
