'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   KPICard — Reusable Metric Display Card

   Props:
     title  — metric label (e.g. "Active Capital Deployed")
     value  — display value (e.g. "$1.2M" or "—")
     trend  — directional indicator (e.g. "+12.4%" or "—")
     icon   — optional leading icon (React node)

   Palette:
     bg     → --bg-surface (#FFFFFF)
     border → --border-ui  (#A5A5A5)
     text   → --text-primary / --text-secondary

   Trend rendering:
     • Starts with "+" or digit → green (up arrow)
     • Starts with "-"          → muted red (down arrow)
     • Otherwise ("—", "N/A")   → neutral (dash icon)
   ═══════════════════════════════════════════════════════════════ */

export interface KPICardProps {
  /** Metric label */
  title: string;
  /** Display value — string allows pre-formatted currency, counts, etc. */
  value: string | number;
  /** Trend string — "+12.4%", "-3.1%", or "—" for neutral */
  trend: string;
  /** Optional icon rendered beside the title */
  icon?: React.ReactNode;
}

function getTrendMeta(trend: string) {
  const trimmed = trend.trim();
  if (trimmed.startsWith('+') || /^\d/.test(trimmed)) {
    return {
      color: '#16a34a',         // green-600
      bgColor: '#f0fdf4',       // green-50
      Icon: ArrowUpRight,
    };
  }
  if (trimmed.startsWith('-')) {
    return {
      color: '#dc2626',         // red-600
      bgColor: '#fef2f2',       // red-50
      Icon: ArrowDownRight,
    };
  }
  return {
    color: 'var(--text-secondary)',
    bgColor: 'var(--bg-canvas)',
    Icon: Minus,
  };
}

export default function KPICard({ title, value, trend, icon }: KPICardProps) {
  const { color, bgColor, Icon } = getTrendMeta(trend);

  return (
    <article
      className="group relative overflow-hidden flex flex-col justify-between min-h-[152px] rounded-lg p-6 transition-all duration-300 hover:shadow-lg"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
      }}
    >
      {/* ── Decorative hover glow ── */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none"
        style={{ background: 'var(--bg-canvas)' }}
        aria-hidden="true"
      />

      {/* ── Header row: icon + title + trend ── */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center transition-all duration-300 group-hover:shadow-sm shrink-0"
              style={{
                background: 'var(--bg-canvas)',
                color: 'var(--text-secondary)',
              }}
            >
              {icon}
            </div>
          )}
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em] leading-tight"
            style={{ color: 'var(--text-secondary)' }}
          >
            {title}
          </p>
        </div>

        {/* Trend badge */}
        <div
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold shrink-0"
          style={{ background: bgColor, color }}
        >
          <Icon className="w-3 h-3" aria-hidden="true" />
          <span>{trend}</span>
        </div>
      </div>

      {/* ── Value ── */}
      <div className="mt-auto pt-6 relative z-10">
        <p
          className="text-3xl font-light tracking-tighter leading-none"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
          }}
        >
          {value}
        </p>
      </div>
    </article>
  );
}
