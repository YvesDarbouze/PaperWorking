'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════
   StatusBadge — Universal status indicator
   
   Uses the Antigravity grayscale palette for status states.
   ═══════════════════════════════════════════════════════ */

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'muted';

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; dot: string }> = {
  success: { bg: '#f0fdf4', text: '#166534', dot: '#3f7d20' },
  warning: { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b' },
  danger:  { bg: '#fef2f2', text: '#991b1b', dot: '#F06543' },
  info:    { bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
  neutral: { bg: '#f2f2f2', text: '#595959', dot: '#a5a5a5' },
  muted:   { bg: '#f9fafb', text: '#7f7f7f', dot: '#cccccc' },
};

interface StatusBadgeProps {
  label: string;
  variant?: Variant;
  showDot?: boolean;
}

export default function StatusBadge({ label, variant = 'neutral', showDot = true }: StatusBadgeProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ background: s.bg, color: s.text, borderRadius: 6 }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: s.dot }}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}

/** Map common status strings to badge variants */
export function getStatusVariant(status: string): Variant {
  switch (status) {
    case 'active':
    case 'resolved':
    case 'closed':
      return 'success';
    case 'past_due':
    case 'waiting':
    case 'warning':
      return 'warning';
    case 'canceled':
    case 'urgent':
    case 'critical':
      return 'danger';
    case 'trialing':
    case 'in_progress':
    case 'info':
      return 'info';
    case 'inactive':
    case 'muted':
      return 'muted';
    default:
      return 'neutral';
  }
}

export function getPriorityVariant(priority: string): Variant {
  switch (priority) {
    case 'urgent': return 'danger';
    case 'high': return 'warning';
    case 'medium': return 'info';
    case 'low': return 'muted';
    default: return 'neutral';
  }
}
