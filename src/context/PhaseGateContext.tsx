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

    // evaluation: unlocks when any deal is Under Contract
    const hasUnderContract = projects.some((p) => p.status === 'Under Contract');
    if (!hasUnderContract) locked.add('evaluation');

    // closing: unlocks when any Phase2Snapshot.isClearToClose is true
    // Approximated by projects that have explicit financing confirmation.
    // Without async snapshot reads here, we fall back to "Under Contract" as a proxy
    // until the PhaseSnapshot subcollection listener is wired up.
    const hasClearToClose = projects.some(
      (p) => (p as any).isClearToClose === true || p.status === 'Renovating' || p.status === 'Listed' || p.status === 'Sold'
    );
    if (!hasClearToClose) locked.add('closing');

    // rehab: unlocks when any deal is Renovating (post-closing)
    const hasRenovating = projects.some((p) => p.status === 'Renovating');
    if (!hasRenovating) locked.add('rehab');

    // exit: unlocks when any deal is Listed
    const hasListed = projects.some((p) => p.status === 'Listed' || p.status === 'Sold');
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
