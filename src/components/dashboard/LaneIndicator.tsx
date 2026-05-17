'use client';

import React from 'react';
import { usePanelContext } from './HorizontalPanelShell';
import { LayoutGrid, Lock } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   LaneIndicator — Mobile Bottom Navigation

   • Visible only on mobile/tablet (< 768px via CSS .mobile-lane-nav)
   • Slim dot indicators with active pulse
   • Board view toggle on mobile
   • Desktop uses header phase tabs instead
   ═══════════════════════════════════════════════════════ */

export default function LaneIndicator() {
  const { activeIndex, scrollToPanel, lanes, viewMode, toggleViewMode, lockedLanes } = usePanelContext();

  return (
    <nav
      className="mobile-lane-nav hidden fixed bottom-0 left-0 right-0 z-50 bg-bg-surface/95 backdrop-blur-md border-t border-border-accent"
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
              ? 'bg-[#595959] text-white'
              : 'text-text-secondary hover:text-text-primary'
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
            const isLocked = lockedLanes.has(lane.id);
            return (
              <button
                key={lane.id}
                onClick={() => scrollToPanel(i)}
                className="flex flex-col items-center gap-0.5 group"
                aria-label={`${isLocked ? '(Locked) ' : ''}Go to ${lane.label}`}
                aria-current={isActive ? 'step' : undefined}
                aria-disabled={isLocked}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`
                      rounded-full transition-all duration-300
                      ${isActive
                        ? 'w-6 h-2 bg-[#595959]'
                        : isPast && !isLocked
                          ? 'w-2 h-2 bg-[#595959]'
                          : isLocked
                            ? 'w-2 h-2 bg-[#CCCCCC]'
                            : 'w-2 h-2 bg-[#CCCCCC] group-hover:bg-[#A5A5A5]'
                      }
                    `}
                  />
                  {isLocked && (
                    <Lock
                      className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-2 h-2 text-[#CCCCCC]"
                      aria-hidden
                    />
                  )}
                </div>
                <span
                  className={`
                    text-xs font-semibold uppercase tracking-wider transition-colors mt-1
                    ${isActive ? 'text-text-primary' : isLocked ? 'text-[#CCCCCC]' : 'text-text-secondary'}
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
