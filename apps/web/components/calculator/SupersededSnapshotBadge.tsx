import React from 'react';

export interface SupersededSnapshotBadgeProps {
  className?: string;
  showTooltip?: boolean;
}

/**
 * Institutional badge displayed on any UI that renders a snapshot sealed
 * under legacy or superseded financial engines (engineVersion < 2).
 *
 * Requirements:
 * - Exact authorized label: "Superseded — pre-DCF engine"
 * - Invariant: NEVER silently recompute a sealed record and NEVER silently keep displaying it as current.
 */
export function SupersededSnapshotBadge({
  className = '',
  showTooltip = true,
}: SupersededSnapshotBadgeProps) {
  return (
    <span
      role="status"
      data-testid="superseded-snapshot-badge"
      aria-label="Superseded — pre-DCF engine"
      title={
        showTooltip
          ? 'This snapshot was sealed under the legacy heuristic financial engine (v1). Outputs are retained for historical audit integrity but must not be used for current investment decisions. Re-underwrite using the v2 True DCF engine.'
          : undefined
      }
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 tracking-wide ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
      <span>Superseded — pre-DCF engine</span>
    </span>
  );
}

export default SupersededSnapshotBadge;
