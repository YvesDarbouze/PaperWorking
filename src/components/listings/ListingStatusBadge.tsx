'use client';

import React from 'react';
import type { ListingStatus } from '@/types/listing';

/* ═══════════════════════════════════════════════════════
   ListingStatusBadge (AQ-27)
   
   Pill badge showing the listing lifecycle state:
   draft (gray) · published (green) · paused (amber) · closed (red)
   ═══════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<ListingStatus, { label: string; className: string }> = {
  draft: {
    label: 'DRAFT',
    className: 'bg-[var(--color-muted)]/15 text-[var(--color-muted)] border-[var(--color-muted)]/25',
  },
  published: {
    label: 'PUBLISHED',
    className: 'bg-[var(--color-positive)]/15 text-[var(--color-positive)] border-[var(--color-positive)]/25',
  },
  paused: {
    label: 'PAUSED',
    className: 'bg-amber-500/15 text-amber-500 border-amber-500/25',
  },
  closed: {
    label: 'CLOSED',
    className: 'bg-[var(--color-error)]/15 text-[var(--color-error)] border-[var(--color-error)]/25',
  },
};

interface ListingStatusBadgeProps {
  status: ListingStatus;
  className?: string;
}

export default function ListingStatusBadge({ status, className = '' }: ListingStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full border
        text-[10px] font-bold uppercase tracking-[0.06em]
        ${config.className}
        ${className}
      `}
    >
      {/* Pulse dot for published listings */}
      {status === 'published' && (
        <span className="relative flex h-1.5 w-1.5 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-positive)] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--color-positive)]" />
        </span>
      )}
      {config.label}
    </span>
  );
}
