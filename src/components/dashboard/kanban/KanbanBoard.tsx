'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, useMotionValue, animate, PanInfo } from 'framer-motion';
import { useProjectStore } from '@/store/projectStore';
import { Project } from '@/types/schema';
import KanbanColumn from './KanbanColumn';
import { transitionProjectPhase, ProjectPhase } from '@/lib/services/projectStateMachine';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import TransitionConfirmationModal from './TransitionConfirmationModal';

const COLUMNS = [
  { id: 'acquisition', title: 'Acquisition' },
  { id: 'fund', title: 'Fund' },
  { id: 'hold', title: 'Hold' },
  { id: 'exit', title: 'Exit' },
];

const SWIPE_VELOCITY_THRESHOLD = 300;
const SWIPE_OFFSET_THRESHOLD = 80;

// Map display column IDs to the actual status values in the Project type
function getProjectsForColumn(colId: string, projects: Project[]): Project[] {
  return projects.filter(d => d.status === colId);
}

export default function KanbanBoard() {
  const projects = useProjectStore(state => state.projects);
  const { user } = useAuth();
  const [pendingTransition, setPendingTransition] = useState<{
    deal: Project;
    targetPhase: string;
  } | null>(null);

  // ── Mobile swipe state ──
  const [mobileColIndex, setMobileColIndex] = useState(0);
  const x = useMotionValue(0);
  const [containerWidth, setContainerWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 390
  );

  useEffect(() => {
    const onResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Re-sync position on resize (e.g. rotation)
  useEffect(() => {
    x.set(-(mobileColIndex * containerWidth));
  }, [containerWidth, mobileColIndex, x]);

  const snapToColumn = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, COLUMNS.length - 1));
    setMobileColIndex(clamped);
    animate(x, -(clamped * containerWidth), {
      type: 'spring',
      stiffness: 300,
      damping: 35,
      mass: 0.8,
    });
  }, [x, containerWidth]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const { velocity, offset } = info;
    let next = mobileColIndex;
    if (Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD) {
      next = velocity.x < 0
        ? Math.min(mobileColIndex + 1, COLUMNS.length - 1)
        : Math.max(mobileColIndex - 1, 0);
    } else if (Math.abs(offset.x) > SWIPE_OFFSET_THRESHOLD) {
      next = offset.x < 0
        ? Math.min(mobileColIndex + 1, COLUMNS.length - 1)
        : Math.max(mobileColIndex - 1, 0);
    }
    snapToColumn(next);
  }, [mobileColIndex, snapToColumn]);

  // ── Phase transition ──
  const confirmTransition = async () => {
    if (!pendingTransition || !user) return;
    const { deal, targetPhase } = pendingTransition;
    try {
      await transitionProjectPhase(
        deal.id,
        deal.status as ProjectPhase,
        targetPhase as ProjectPhase,
        user.uid
      );
      toast.success(`Deal moved to ${targetPhase}`);
    } catch (error) {
      toast.error('Failed to transition phase');
      console.error(error);
    } finally {
      setPendingTransition(null);
    }
  };

  const handleMoveDeal = (deal: Project, target: string) =>
    setPendingTransition({ deal, targetPhase: target });

  return (
    <div className="flex-1 w-full bg-bg-primary overflow-hidden flex flex-col">

      {/* ── Desktop: multi-column horizontal scroll ── */}
      <div className="hidden md:flex flex-1 overflow-x-auto p-6 space-x-6 min-h-0 custom-scrollbar">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            projects={getProjectsForColumn(col.id, projects)}
            onMoveDeal={handleMoveDeal}
          />
        ))}
      </div>

      {/* ── Mobile: Framer Motion swipe track ── */}
      <div
        className="flex md:hidden flex-1 flex-col overflow-hidden"
        style={{ touchAction: 'pan-y' }}
      >
        <motion.div
          style={{
            display: 'flex',
            width: `${COLUMNS.length * 100}vw`,
            height: '100%',
            x,
            cursor: 'grab',
          }}
          drag="x"
          dragConstraints={{
            left: -((COLUMNS.length - 1) * containerWidth),
            right: 0,
          }}
          dragElastic={0.1}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              style={{ width: '100vw', height: '100%', flexShrink: 0, overflow: 'hidden' }}
            >
              <KanbanColumn
                id={col.id}
                title={col.title}
                projects={getProjectsForColumn(col.id, projects)}
                onMoveDeal={handleMoveDeal}
                mobileFullWidth
              />
            </div>
          ))}
        </motion.div>

        {/* Active column label */}
        <p className="text-center text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] pt-2 flex-shrink-0" aria-live="polite" aria-atomic="true">
          {COLUMNS[mobileColIndex].title}
        </p>

        {/* Dot indicators */}
        <div className="flex justify-center items-center gap-2 py-3 bg-bg-primary border-t border-border-accent/20 flex-shrink-0">
          {COLUMNS.map((col, i) => (
            <button
              key={col.id}
              onClick={() => snapToColumn(i)}
              aria-label={`Go to ${col.title}`}
              className={`transition-all duration-200 rounded-full ${
                i === mobileColIndex
                  ? 'w-4 h-1.5 bg-pw-black'
                  : 'w-1.5 h-1.5 bg-[#CCCCCC]'
              }`}
            />
          ))}
        </div>
      </div>

      <TransitionConfirmationModal
        isOpen={!!pendingTransition}
        onClose={() => setPendingTransition(null)}
        onConfirm={confirmTransition}
        dealName={pendingTransition?.deal.propertyName || ''}
        targetPhase={pendingTransition?.targetPhase || ''}
      />
      
      {/* Screen reader announcements */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {pendingTransition ? `Confirm moving ${pendingTransition.deal.propertyName} to ${pendingTransition.targetPhase}?` : ''}
      </div>
    </div>
  );
}
