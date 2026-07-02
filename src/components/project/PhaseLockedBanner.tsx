'use client';

import React from 'react';
import { Lock } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PhaseLockedBanner

   Rendered at the top of form sections in a COMPLETED phase.
   Informs the user that values are locked and downstream phases
   reference them. Does not block scrolling or reading.

   Usage:
     <PhaseLockedBanner
       phaseLabel="Phase 1: Acquisition"
       capturedAt={snapshot.capturedAt}
       referencedBy={['Phase 3', 'Phase 4']}
     />
   ═══════════════════════════════════════════════════════════════ */

interface PhaseLockedBannerProps {
  phaseLabel: string;
  capturedAt?: Date;
  referencedBy?: string[];
}

export function PhaseLockedBanner({
  phaseLabel,
  capturedAt,
  referencedBy = [],
}: PhaseLockedBannerProps) {
  const formatted = capturedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day:   'numeric',
        year:  'numeric',
      }).format(new Date(capturedAt))
    : null;

  return (
    <div
      role="status"
      aria-label={`${phaseLabel} data is locked`}
      className="flex items-start gap-3 p-3.5 border bg-[var(--pw-glass-bg)] backdrop-blur-xl border-[var(--pw-border)] rounded-[var(--radius-lg)] mb-5"
    >
      {/* Lock icon */}
      <div className="w-7 h-7 rounded-md bg-[var(--color-surface-container-high)] flex items-center justify-center shrink-0 mt-0.5">
        <Lock size={13} strokeWidth={2} className="text-[var(--color-on-surface)]" />
      </div>

      {/* Text block */}
      <div className="flex-1 min-w-0">
        <p className="m-0 text-[11px] font-bold text-[var(--color-on-surface)] leading-normal">
          {phaseLabel} data locked
          {formatted && (
            <span className="font-normal text-[var(--color-on-surface-variant)] ml-1.5">
              — captured {formatted}
            </span>
          )}
        </p>

        {referencedBy.length > 0 && (
          <p className="m-0 mt-1 text-[10px] text-[var(--color-on-surface-variant)] leading-normal">
            These values are referenced read-only by{' '}
            {referencedBy.join(' and ')}.
          </p>
        )}
      </div>
    </div>
  );
}
