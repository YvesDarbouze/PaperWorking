'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { usePanelContext } from './HorizontalPanelShell';
import { PHASE_BACKGROUNDS, PHASE_IS_DARK } from '@/lib/constants/phaseMessages';

/* ═══════════════════════════════════════════════════════════════
   PhaseRailVertical — Desktop Left-Side Phase Rail

   Visible only on lg+ (≥1024px). Sits between AppSidebar and
   main content. Each tile fills an equal slice of the full
   viewport height minus the TopHeader (64px).

   Palette: #CCCCCC (step 0, findandfund) → #595959 (step 6, exit)
   Active tile: right-edge indicator bar + full opacity
   Locked tile: 40% opacity, not-allowed cursor
   Past tile: 65% opacity

   Typography:
   • #808080, #6D6D6D, #595959 (PHASE_IS_DARK) → white (#ffffff)
   • #CCCCCC, #B9B9B9, #A6A6A6, #939393 → dark (#1A1A1A)
   ═══════════════════════════════════════════════════════════════ */

export const PHASE_RAIL_WIDTH = 72; // px

export default function PhaseRailVertical() {
  const { lanes, activeIndex, scrollToPanel, lockedLanes } = usePanelContext();

  return (
    <aside
      aria-label="Phase navigation"
      className="hidden lg:flex flex-col shrink-0 sticky top-0 overflow-hidden"
      style={{
        width: PHASE_RAIL_WIDTH,
        height: '100vh',
        borderRight: '1px solid rgba(0,0,0,0.08)',
        zIndex: 30,
      }}
    >
      {/* Spacer aligned with TopHeader */}
      <div
        className="shrink-0"
        style={{
          height: 64,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-ui)',
        }}
        aria-hidden
      />

      {/* Phase tile strip fills remaining height */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {lanes.map((lane, i) => {
          const isActive = i === activeIndex;
          const isPast   = i < activeIndex;
          const isLocked = lockedLanes.has(lane.id);
          const phaseBg  = PHASE_BACKGROUNDS[lane.id] ?? '#CCCCCC';
          const isDark   = PHASE_IS_DARK[lane.id] ?? false;

          const textColor      = isDark ? '#ffffff' : '#1A1A1A';
          const indicatorColor = isDark ? '#ffffff' : '#1A1A1A';

          return (
            <motion.button
              key={lane.id}
              onClick={() => scrollToPanel(i)}
              aria-label={`${isLocked ? '(Locked) ' : ''}Navigate to ${lane.label}`}
              aria-current={isActive ? 'step' : undefined}
              aria-disabled={isLocked}
              className="flex-1 relative flex flex-col items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
              style={{
                background: phaseBg,
                color: textColor,
                opacity: isLocked ? 0.4 : isPast ? 0.65 : 1,
                cursor: isLocked ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.18s ease',
              }}
              whileHover={!isActive && !isLocked ? { opacity: 1 } : {}}
              whileTap={!isLocked ? { scale: 0.97 } : {}}
            >
              {/* Phase index */}
              <span
                className="text-[9px] font-bold leading-none"
                style={{ opacity: 0.45 }}
                aria-hidden
              >
                {String(i + 1).padStart(2, '0')}
              </span>

              {/* Short label — rotated so it reads bottom-to-top */}
              <span
                className="text-[10px] font-black uppercase leading-none"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  letterSpacing: '0.12em',
                  maxHeight: 72,
                  overflow: 'hidden',
                }}
              >
                {lane.shortLabel}
              </span>

              {isLocked && (
                <Lock className="w-3 h-3 mt-0.5" style={{ opacity: 0.55 }} aria-hidden />
              )}

              {/* Active: right-edge indicator bar */}
              {isActive && (
                <motion.div
                  layoutId="phase-rail-v-active"
                  className="absolute right-0 top-3 bottom-3 rounded-l-full"
                  style={{ width: 3, background: indicatorColor }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
}
