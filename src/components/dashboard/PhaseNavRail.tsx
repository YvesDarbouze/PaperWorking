'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { usePanelContext } from './HorizontalPanelShell';
import { PHASE_BACKGROUNDS, PHASE_IS_DARK } from '@/lib/constants/phaseMessages';

/* ═══════════════════════════════════════════════════════════════
   PhaseNavRail — Mobile & Tablet Horizontal Phase Bar

   Breakpoints:
   ┌─ Mobile   <1024px ─────────────────────────────────────────┐
   │  Horizontally scrollable tile bar, 44px, sticky below      │
   │  TopHeader. Active tile auto-scrolls into view.            │
   └────────────────────────────────────────────────────────────┘
   ┌─ Desktop  ≥1024px ─────────────────────────────────────────┐
   │  Hidden — PhaseRailVertical (left rail) handles desktop    │
   └────────────────────────────────────────────────────────────┘

   Palette: #CCCCCC (findandfund) → #595959 (exit)
   Typography: dark phases (#808080, #6D6D6D, #595959) → white text
               light phases (#CCCCCC → #939393) → #1A1A1A text
   ═══════════════════════════════════════════════════════════════ */

export const PHASE_NAV_HEIGHT = 44; // px — consumed by PanelTrack height calc

export default function PhaseNavRail() {
  const { lanes, activeIndex, scrollToPanel, lockedLanes } = usePanelContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeTile = container.children[activeIndex] as HTMLElement | undefined;
    if (activeTile) {
      activeTile.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeIndex]);

  return (
    <nav
      aria-label="Phase navigation"
      className="lg:hidden flex items-center w-full shrink-0 relative"
      style={{
        height: PHASE_NAV_HEIGHT,
        borderBottom: '1px solid rgba(0,0,0,0.10)',
        position: 'sticky',
        top: 64,
        zIndex: 40,
        background: 'var(--bg-surface)',
      }}
    >
      <div
        ref={scrollRef}
        className="flex items-center h-full overflow-x-auto scroll-smooth gap-1 px-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {lanes.map((lane, i) => {
          const isActive  = i === activeIndex;
          const isPast    = i < activeIndex;
          const isLocked  = lockedLanes.has(lane.id);
          const phaseBg   = PHASE_BACKGROUNDS[lane.id] ?? '#CCCCCC';
          const isDark    = PHASE_IS_DARK[lane.id] ?? false;

          return (
            <PhaseTile
              key={lane.id}
              label={lane.shortLabel}
              fullLabel={lane.label}
              isActive={isActive}
              isPast={isPast}
              isLocked={isLocked}
              phaseBg={phaseBg}
              isDark={isDark}
              onClick={() => scrollToPanel(i)}
            />
          );
        })}
      </div>

      {/* Fade mask on right edge — signals scrollable overflow */}
      <div
        className="absolute right-0 top-0 h-full w-8 pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, var(--bg-surface))' }}
        aria-hidden
      />
    </nav>
  );
}

/* ─── Individual Phase Tile ─── */

interface PhaseTileProps {
  label: string;
  fullLabel: string;
  isActive: boolean;
  isPast: boolean;
  isLocked: boolean;
  phaseBg: string;
  isDark: boolean;
  onClick: () => void;
}

function PhaseTile({
  label,
  fullLabel,
  isActive,
  isPast,
  isLocked,
  phaseBg,
  isDark,
  onClick,
}: PhaseTileProps) {
  const textColor = isDark ? '#ffffff' : '#1A1A1A';

  return (
    <motion.button
      onClick={onClick}
      aria-label={`${isLocked ? '(Locked) ' : ''}Navigate to ${fullLabel}`}
      aria-current={isActive ? 'step' : undefined}
      aria-disabled={isLocked}
      whileHover={!isActive && !isLocked ? { scale: 1.04 } : {}}
      whileTap={!isLocked ? { scale: 0.96 } : {}}
      transition={{ duration: 0.1 }}
      className="relative flex items-center gap-1 shrink-0 rounded-md px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
      style={{
        background: phaseBg,
        color: textColor,
        opacity: isLocked ? 0.4 : isPast ? 0.65 : 1,
        cursor: isLocked ? 'not-allowed' : 'pointer',
        minWidth: 60,
        height: 30,
        outline: isActive ? `2px solid ${textColor}` : 'none',
        outlineOffset: -2,
      }}
    >
      <span className="truncate">{label}</span>
      {isLocked && <Lock className="w-2.5 h-2.5 shrink-0" aria-hidden />}
      {isActive && (
        <motion.div
          layoutId="phase-nav-underline"
          className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
          style={{ background: textColor }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </motion.button>
  );
}
