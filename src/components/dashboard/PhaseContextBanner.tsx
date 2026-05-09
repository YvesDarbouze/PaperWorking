'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';
import { usePanelContext } from './HorizontalPanelShell';
import { PHASE_MESSAGES, PHASE_IS_DARK } from '@/lib/constants/phaseMessages';

const STORAGE_KEY = 'pw_phase_banner_dismissed';

function getDismissedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function dismissLane(laneId: string) {
  try {
    const set = getDismissedSet();
    set.add(laneId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export default function PhaseContextBanner() {
  const { lanes, activeIndex, lockedLanes } = usePanelContext();
  const activeLane = lanes[activeIndex];
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDismissed(getDismissedSet());
  }, []);

  if (!activeLane) return null;

  const laneId = activeLane.id;
  const message = PHASE_MESSAGES[laneId];
  const isDark = PHASE_IS_DARK[laneId] ?? false;
  const isLocked = lockedLanes.has(laneId);
  const isDismissed = dismissed.has(laneId);

  if (!message || isDismissed) return null;

  const textColor = isDark ? 'rgba(255,255,255,0.75)' : 'var(--text-secondary)';
  const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'var(--border-ui)';
  const dismissColor = isDark ? 'rgba(255,255,255,0.5)' : 'var(--text-secondary)';

  function handleDismiss() {
    dismissLane(laneId);
    setDismissed((prev) => new Set([...prev, laneId]));
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={laneId}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          borderBottom: `1px solid ${borderColor}`,
          height: 36,
          flexShrink: 0,
        }}
        className="flex items-center gap-3 px-6"
      >
        {isLocked && (
          <Lock className="w-3 h-3 shrink-0" style={{ color: textColor }} aria-hidden />
        )}
        <p
          className="flex-1 text-[11px] font-medium truncate"
          style={{ color: textColor, letterSpacing: '0.01em' }}
        >
          {message}
        </p>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-0.5 rounded transition-opacity hover:opacity-100 opacity-60"
          aria-label="Dismiss phase message"
        >
          <X className="w-3 h-3" style={{ color: dismissColor }} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
