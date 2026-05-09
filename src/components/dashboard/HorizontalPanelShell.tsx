'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { motion, useMotionValue, animate, PanInfo, MotionValue } from 'framer-motion';
import toast from 'react-hot-toast';
import { PHASE_BACKGROUNDS } from '@/lib/constants/phaseMessages';

/* ═══════════════════════════════════════════════════════
   HorizontalPanelShell — Gesture-Driven Kanban Engine

   Architecture:
   1. PanelProvider — wraps the entire dashboard (layout level)
      to expose context to header, overlays, and bottom nav.
   2. PanelTrack — the draggable horizontal strip of lane panels.

   Features:
   • framer-motion drag for touch-responsive swipe navigation
   • Spring-physics panel snapping with velocity threshold
   • viewMode toggle: 'expanded' (full workspace) | 'minimized' (board)
   • Keyboard navigation (← →)
   ═══════════════════════════════════════════════════════ */

export interface LaneDef {
  id: string;
  label: string;
  shortLabel: string;
}

export type ViewMode = 'expanded' | 'minimized';

interface PanelContextValue {
  activeIndex: number;
  laneCount: number;
  scrollToPanel: (index: number) => void;
  lanes: LaneDef[];
  viewMode: ViewMode;
  toggleViewMode: () => void;
  setViewMode: (mode: ViewMode) => void;
  /** Lane IDs that are currently locked by the PhaseGate. */
  lockedLanes: Set<string>;
  setLockedLanes: (s: Set<string>) => void;
  /** Callback for when a locked lane is attempted — shows gate message. */
  onLockedLaneAttempt?: (laneId: string) => void;
  setOnLockedLaneAttempt: (fn: (laneId: string) => void) => void;
}

const PanelContext = createContext<PanelContextValue>({
  activeIndex: 0,
  laneCount: 0,
  scrollToPanel: () => {},
  lanes: [],
  viewMode: 'expanded',
  toggleViewMode: () => {},
  setViewMode: () => {},
  lockedLanes: new Set(),
  setLockedLanes: () => {},
  onLockedLaneAttempt: undefined,
  setOnLockedLaneAttempt: () => {},
});

export function usePanelContext() {
  return useContext(PanelContext);
}

/* ─── Gesture Config ─── */
const SWIPE_VELOCITY_THRESHOLD = 300;
const SWIPE_OFFSET_THRESHOLD = 80;

/* ═══════════════════════════════════════════
   PanelProvider — Context wrapper (layout level)
   ═══════════════════════════════════════════ */

interface PanelProviderProps {
  lanes: LaneDef[];
  initialLane?: number;
  children: React.ReactNode;
}

export function PanelProvider({
  lanes,
  initialLane = 0,
  children,
}: PanelProviderProps) {
  const [activeIndex, setActiveIndex] = useState(initialLane);
  const [viewMode, setViewMode] = useState<ViewMode>('expanded');
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1440
  );
  const [lockedLanes, setLockedLanes] = useState<Set<string>>(new Set());
  const [onLockedLaneAttempt, setOnLockedLaneAttempt] = useState<((laneId: string) => void) | undefined>(undefined);

  useEffect(() => {
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const x = useMotionValue(-(initialLane * containerWidth));

  const scrollToPanel = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, lanes.length - 1));
      const targetLane = lanes[clamped];
      if (targetLane && lockedLanes.has(targetLane.id)) {
        onLockedLaneAttempt?.(targetLane.id);
        return;
      }
      setActiveIndex(clamped);
      animate(x, -(clamped * containerWidth), {
        type: 'spring',
        stiffness: 300,
        damping: 35,
        mass: 0.8,
      });
    },
    [x, containerWidth, lanes, lockedLanes, onLockedLaneAttempt]
  );

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === 'expanded' ? 'minimized' : 'expanded'));
  }, []);

  /* Keyboard navigation */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToPanel(activeIndex + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToPanel(activeIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, scrollToPanel]);

  /* Sync transform on resize */
  useEffect(() => {
    x.set(-(activeIndex * containerWidth));
  }, [containerWidth, activeIndex, x]);

  return (
    <PanelContext.Provider
      value={{
        activeIndex,
        laneCount: lanes.length,
        scrollToPanel,
        lanes,
        viewMode,
        toggleViewMode,
        setViewMode,
        lockedLanes,
        setLockedLanes,
        onLockedLaneAttempt,
        setOnLockedLaneAttempt: (fn) => setOnLockedLaneAttempt(() => fn),
      }}
    >
      {/* Store motion value reference for child PanelTrack */}
      <MotionXContext.Provider value={{ x, containerWidth, lanes }}>
        {children}
      </MotionXContext.Provider>
    </PanelContext.Provider>
  );
}

/* ─── Internal context for motion value ─── */
const MotionXContext = createContext<{
  x: MotionValue<number>;
  containerWidth: number;
  lanes: LaneDef[];
}>({
  x: null as any,
  containerWidth: 1440,
  lanes: [],
});

/* ═══════════════════════════════════════════
   PanelTrack — Draggable horizontal strip
   ═══════════════════════════════════════════ */

/**
 * Returns the correct header offset in px for the panel height calculation.
 * Desktop (≥1024px): only TopHeader (64px) — PhaseRailVertical is horizontal space.
 * Mobile / Tablet (<1024px): TopHeader (64) + PhaseNavRail horizontal bar (44).
 */
function useResponsiveHeaderHeight(): number {
  const [height, setHeight] = useState(() => {
    if (typeof window === 'undefined') return 108;
    return window.innerWidth >= 1024 ? 64 : 108;
  });

  useEffect(() => {
    const update = () => setHeight(window.innerWidth >= 1024 ? 64 : 108);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return height;
}

interface PanelTrackProps {
  /** @deprecated Pass nothing — PanelTrack computes this responsively. */
  headerHeight?: number;
  children: React.ReactNode[];
}

export function PanelTrack({ children }: PanelTrackProps) {
  const { activeIndex, scrollToPanel, lanes } = usePanelContext();
  const { x, containerWidth } = useContext(MotionXContext);
  const headerHeight = useResponsiveHeaderHeight();

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const velocity = info.velocity.x;
      const offset = info.offset.x;
      let nextIndex = activeIndex;

      if (Math.abs(velocity) > SWIPE_VELOCITY_THRESHOLD) {
        nextIndex = velocity < 0
          ? Math.min(activeIndex + 1, lanes.length - 1)
          : Math.max(activeIndex - 1, 0);
      } else if (Math.abs(offset) > SWIPE_OFFSET_THRESHOLD) {
        nextIndex = offset < 0
          ? Math.min(activeIndex + 1, lanes.length - 1)
          : Math.max(activeIndex - 1, 0);
      }
      scrollToPanel(nextIndex);
    },
    [activeIndex, lanes.length, scrollToPanel]
  );

  const panelHeight = `calc(100vh - ${headerHeight}px)`;

  const activeLaneId = lanes[activeIndex]?.id;
  const laneBackground = PHASE_BACKGROUNDS[activeLaneId ?? ''] ?? 'var(--pw-bg)';

  return (
    <div
      className="lane-shell"
      style={{
        height: panelHeight,
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'pan-y',
        backgroundColor: laneBackground,
        transition: 'background-color 400ms ease',
      }}
    >
      <motion.div
        className="lane-track"
        style={{
          display: 'flex',
          width: lanes.length * containerWidth,
          height: '100%',
          x,
          cursor: 'grab',
        }}
        drag="x"
        dragConstraints={{
          left: -((lanes.length - 1) * containerWidth),
          right: 0,
        }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        {React.Children.map(children, (child, i) => (
          <section
            key={lanes[i]?.id || i}
            className="lane-panel"
            style={{ 
              height: '100%', 
              width: containerWidth, 
              flexShrink: 0,
              overflowY: 'auto', 
              overflowX: 'hidden' 
            }}
            data-lane={lanes[i]?.id}
            aria-label={lanes[i]?.label}
          >
            {child}
          </section>
        ))}
      </motion.div>

      {/* Swipe edge affordances */}
      {activeIndex > 0 && (
        <div className="swipe-hint swipe-hint-left" aria-hidden="true" />
      )}
      {activeIndex < lanes.length - 1 && (
        <div className="swipe-hint swipe-hint-right" aria-hidden="true" />
      )}
    </div>
  );
}

/* ─── Legacy default export for backward compat ─── */
export default function HorizontalPanelShell({
  lanes,
  initialLane = 0,
  headerHeight = 64,
  children,
}: {
  lanes: LaneDef[];
  initialLane?: number;
  headerHeight?: number;
  children: React.ReactNode[];
}) {
  return (
    <PanelProvider lanes={lanes} initialLane={initialLane}>
      <PanelTrack headerHeight={headerHeight}>
        {children}
      </PanelTrack>
    </PanelProvider>
  );
}
