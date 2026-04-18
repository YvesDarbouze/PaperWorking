'use client';

import React from 'react';
import { usePanelContext } from './HorizontalPanelShell';
import { LayoutGrid } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   LaneIndicator — Mobile Bottom Navigation

   • Visible only on mobile/tablet (< 768px via CSS .mobile-lane-nav)
   • Slim dot indicators with active pulse
   • Board view toggle on mobile
   • Desktop uses header phase tabs instead
   ═══════════════════════════════════════════════════════ */

export default function LaneIndicator() {
  const { activeIndex, scrollToPanel, lanes, viewMode, toggleViewMode } = usePanelContext();

  return (
    <nav
      className="mobile-lane-nav fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-200"
      style={{ height: 48 }}
      aria-label="Mobile dashboard navigation"
    >
      <div className="h-full max-w-md mx-auto flex items-center justify-between px-5">
        {/* Board toggle */}
        <button
          onClick={toggleViewMode}
          className={`
            flex items-center gap-1 text-xs font-bold uppercase tracking-wider
            px-2.5 py-1 rounded-md transition-all
            ${viewMode === 'minimized'
              ? 'bg-gray-900 text-white'
              : 'text-gray-400 hover:text-gray-700'
            }
          `}
          aria-label="Toggle board view"
        >
          <LayoutGrid className="w-3 h-3" />
        </button>

        {/* Phase dots */}
        <div className="flex items-center gap-3">
          {lanes.map((lane, i) => {
            const isActive = i === activeIndex;
            const isPast = i < activeIndex;
            return (
              <button
                key={lane.id}
                onClick={() => scrollToPanel(i)}
                className="flex flex-col items-center gap-0.5 group"
                aria-label={`Go to ${lane.label}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`
                    rounded-full transition-all duration-300
                    ${isActive
                      ? 'w-6 h-2 bg-gray-900'
                      : isPast
                        ? 'w-2 h-2 bg-gray-900'
                        : 'w-2 h-2 bg-gray-300 group-hover:bg-gray-500'
                    }
                  `}
                />
                <span
                  className={`
                    text-xs font-semibold uppercase tracking-wider transition-colors
                    ${isActive ? 'text-gray-900' : 'text-gray-400'}
                  `}
                >
                  {lane.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Spacer for alignment */}
        <div className="w-8" />
      </div>
    </nav>
  );
}
