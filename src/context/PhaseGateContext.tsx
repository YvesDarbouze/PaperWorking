'use client';

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { PHASE_UNLOCK_HINTS } from '@/lib/constants/phaseMessages';

interface PhaseGateContextValue {
  /** Set of lane IDs that are currently locked. */
  lockedLanes: Set<string>;
  /** Returns the toast message to show when a locked lane is attempted. */
  lockMessage: (laneId: string) => string;
  /** Currently focused deal ID — persists across lane transitions. */
  selectedDealId: string | null;
  setSelectedDealId: (id: string | null) => void;
}

const PhaseGateContext = createContext<PhaseGateContextValue>({
  lockedLanes: new Set(),
  lockMessage: () => '',
  selectedDealId: null,
  setSelectedDealId: () => {},
});

export function usePhaseGate() {
  return useContext(PhaseGateContext);
}

export function PhaseGateProvider({ children }: { children: React.ReactNode }) {
  const projects = useProjectStore((s) => s.projects);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  const lockedLanes = useMemo<Set<string>>(() => {
    const locked = new Set<string>();

    // pipeline: unlocks when user has ≥ 1 project
    if (projects.length === 0) locked.add('pipeline');

    // evaluation: unlocks when any deal is in fund phase
    const hasUnderContract = projects.some((p) => p.status === 'fund');
    if (!hasUnderContract) locked.add('evaluation');

    // closing: unlocks when any Phase2Snapshot.isClearToClose is true or in a later phase
    const hasClearToClose = projects.some(
      (p) => (p as any).isClearToClose === true || p.status === 'hold' || p.status === 'exit'
    );
    if (!hasClearToClose) locked.add('closing');

    // rehab: unlocks when any deal is in hold phase
    const hasRenovating = projects.some((p) => p.status === 'hold');
    if (!hasRenovating) locked.add('rehab');

    // exit: unlocks when any deal is in exit phase
    const hasListed = projects.some((p) => p.status === 'exit');
    if (!hasListed) locked.add('exit');

    // findandfund (0) and engine (5) are always unlocked — never added

    return locked;
  }, [projects]);

  const lockMessage = useCallback(
    (laneId: string) => PHASE_UNLOCK_HINTS[laneId] ?? `Complete earlier phases to unlock this workspace.`,
    []
  );

  return (
    <PhaseGateContext.Provider value={{ lockedLanes, lockMessage, selectedDealId, setSelectedDealId }}>
      {children}
    </PhaseGateContext.Provider>
  );
}
