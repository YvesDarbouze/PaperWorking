'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePanelContext } from './HorizontalPanelShell';
import { LayoutGrid, Columns3 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   PhaseNav — Persistent Top Navigation Tabs

   • Renders clickable phase tabs driven by PanelContext
   • Spring-animated active underline indicator
   • "Board View" toggle switches minimized ↔ expanded
   • On < 640px: tabs become a scrollable pill row with
     active state as filled pill instead of underline
   ═══════════════════════════════════════════════════════ */

export default function PhaseNav() {
  const {
    activeIndex,
    scrollToPanel,
    lanes,
    viewMode,
    toggleViewMode,
  } = usePanelContext();

  const tabsRef = useRef<HTMLDivElement>(null);

  /* Auto-scroll the active tab into view on mobile */
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeTab = tabsRef.current.children[activeIndex] as HTMLElement;
    if (activeTab) {
      activeTab.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeIndex]);

  return (
    <div className="flex items-center gap-3 flex-1 justify-center mx-4 min-w-0">
      {/* Phase tabs */}
      <nav ref={tabsRef} className="phase-tabs" aria-label="Kanban phases">
        {lanes.map((lane, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={lane.id}
              className="phase-tab"
              data-active={isActive}
              onClick={() => {
                scrollToPanel(i);
                // If in minimized mode, switch back to expanded on tab click
                if (viewMode === 'minimized') {
                  toggleViewMode();
                }
              }}
              aria-label={`Go to ${lane.label}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {lane.shortLabel}
              {/* Animated underline indicator (desktop only, via CSS) */}
              {isActive && (
                <motion.div
                  className="phase-tab-indicator"
                  layoutId="phase-tab-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Board View toggle */}
      <button
        onClick={toggleViewMode}
        className={`
          hidden sm:flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider
          px-3 py-1.5 rounded-md border transition-all
          ${viewMode === 'minimized'
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-bg-surface text-text-secondary border-border-accent hover:border-gray-400 hover:text-text-primary'
          }
        `}
        title={viewMode === 'minimized' ? 'Switch to Expanded View' : 'Switch to Board View'}
      >
        {viewMode === 'minimized' ? (
          <>
            <Columns3 className="w-3 h-3" />
            <span>Lanes</span>
          </>
        ) : (
          <>
            <LayoutGrid className="w-3 h-3" />
            <span>Board</span>
          </>
        )}
      </button>
    </div>
  );
}
