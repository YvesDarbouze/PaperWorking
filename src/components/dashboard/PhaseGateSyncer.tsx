'use client';

import { useEffect } from 'react';
import { usePhaseGate } from '@/context/PhaseGateContext';
import { usePanelContext } from './HorizontalPanelShell';
import toast from 'react-hot-toast';

/**
 * Bridges PhaseGateContext → PanelContext.
 * Must render inside both PhaseGateProvider and PanelProvider.
 */
export default function PhaseGateSyncer() {
  const { lockedLanes, lockMessage } = usePhaseGate();
  const { setLockedLanes, setOnLockedLaneAttempt } = usePanelContext();

  useEffect(() => {
    setLockedLanes(lockedLanes);
  }, [lockedLanes, setLockedLanes]);

  useEffect(() => {
    setOnLockedLaneAttempt((laneId: string) => {
      toast(lockMessage(laneId), {
        icon: '🔒',
        duration: 3000,
        style: {
          background: '#0d0d0d',
          color: '#ffffff',
          fontSize: '13px',
          fontWeight: 500,
        },
      });
    });
  }, [lockMessage, setOnLockedLaneAttempt]);

  return null;
}
