'use client';

import React from 'react';
import { FolderPlus } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CreateProjectCTA — Primary Action Card

   A prominent, highly-clickable card that anchors the dashboard
   landing view as the primary "start a project" call-to-action.

   Design tokens:
     bg     → --bg-surface (elevated card)
     border → --border-ui
     icon   → pw-black (#1A1A1A) fill
     hover  → scale-up + shadow elevation
   ═══════════════════════════════════════════════════════════════ */

export interface CreateProjectCTAProps {
  /** Callback fired on click — wire to project creation flow */
  onClick: () => void;
  /** If true, shows a lock indicator for non-paid users */
  locked?: boolean;
}

export default function CreateProjectCTA({
  onClick,
  locked = false,
}: CreateProjectCTAProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={locked ? 'Upgrade to start a project' : 'Start a new project'}
      className="group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/20 rounded-xl"
    >
      <div
        className="relative flex flex-col items-center justify-center gap-5 px-6 py-10 rounded-xl transition-all duration-300 ease-out cursor-pointer
          hover:scale-[1.03] hover:shadow-[0_24px_48px_rgba(0,0,0,0.08)] active:scale-[0.98]"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-ui)',
        }}
      >
        {/* ── Folder + Plus Icon ── */}
        <div className="relative">
          {/* Outer glow ring on hover */}
          <div
            className="absolute -inset-3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'radial-gradient(circle, rgba(26,26,26,0.04) 0%, transparent 70%)' }}
            aria-hidden="true"
          />

          {/* Main icon container */}
          <div
            className="relative w-20 h-20 rounded-xl flex items-center justify-center transition-all duration-300
              group-hover:shadow-md"
            style={{ background: '#1A1A1A' }}
          >
            <FolderPlus
              className="w-9 h-9 transition-transform duration-300 group-hover:scale-110"
              style={{ color: '#FFFFFF' }}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>

          {/* Pulse dot — draws the eye */}
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
            style={{ background: '#1A1A1A' }}
            aria-hidden="true"
          />
        </div>

        {/* ── Label ── */}
        <div className="flex flex-col items-center gap-1.5">
          <span
            className="text-sm font-bold uppercase tracking-[0.18em] transition-colors duration-200"
            style={{ color: 'var(--text-primary)' }}
          >
            Start A Project
          </span>
          <span
            className="text-[10px] leading-relaxed max-w-[200px] text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            {locked
              ? 'Upgrade your plan to begin tracking deals'
              : 'Create a new deal and start underwriting'
            }
          </span>
        </div>

        {/* ── Hover accent line ── */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-1/2 transition-all duration-300 rounded-full"
          style={{ background: '#1A1A1A' }}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
