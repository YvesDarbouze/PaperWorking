'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { useWorkspaceProject } from '@/app/dashboard/projects/[id]/layout';
import { projectsService } from '@/lib/firebase/deals';
import type {
  PhaseSnapshotMap,
  PhaseSnapshotKey,
  Phase1Snapshot,
  Phase2Snapshot,
  Phase3Snapshot,
} from '@/types/schema';

/* ═══════════════════════════════════════════════════════════════
   ProjectPipelineContext

   Single source of truth for cross-phase financial inheritance.

   Architecture:
   ┌─ Phase 1 (DealCalculator) ─────────────────────────────────┐
   │  saves → project.financials.{purchasePrice, ARV, ...}      │
   │  on advance → writes phaseSnapshots/phase-1 (immutable)    │
   └────────────────────────────────────────────────────────────┘
             ▼
   ProjectPipelineContext  (this file)
             │  derives phase1Live from live project.financials
             │  fetches immutable snapshots from Firestore
             ▼
   Phase 2, 3, 4 pages via usePipelineData() / usePhaseSummary()

   No additional Firestore listener is opened — the context piggy-
   backs on the project object from WorkspaceContext (fetched once
   by the workspace layout shell).
   ═══════════════════════════════════════════════════════════════ */

// ── Live Phase 1 financial summary (derived from project.financials) ──
export interface Phase1Live {
  purchasePrice:         number;
  estimatedARV:          number;
  loanAmount:            number;
  loanInterestRate:      number;
  loanOriginationPoints: number;
  projectedRehabCost:    number;
  estimatedTimelineDays: number;
  fixedAcquisitionCosts: number;
  maxOffer:              number;
}

// ── Full pipeline data shape exposed to consumers ─────────────
export interface PipelineData {
  /** Live Phase 1 values read directly from project.financials.
   *  Available in every phase; these are the "current" inputs. */
  phase1Live: Phase1Live;

  /** Immutable snapshots from completed phases (may be partial). */
  snapshots: PhaseSnapshotMap;

  /** Derived all-in cost: purchasePrice + capitalizedBasis + rehabActual + holdingTotal.
   *  Used by Phase 4 P&L seed without re-entry. */
  derivedAllInCost: number;

  /** True if the given phase has been formally advanced past. */
  isPhaseComplete: (key: PhaseSnapshotKey) => boolean;

  /** Whether the pipeline context is still loading snapshots. */
  snapshotsLoading: boolean;
}

// ── Context default (pre-load safe values) ────────────────────
const EMPTY_PHASE1: Phase1Live = {
  purchasePrice:         0,
  estimatedARV:          0,
  loanAmount:            0,
  loanInterestRate:      0,
  loanOriginationPoints: 0,
  projectedRehabCost:    0,
  estimatedTimelineDays: 0,
  fixedAcquisitionCosts: 0,
  maxOffer:              0,
};

const PipelineContext = createContext<PipelineData>({
  phase1Live:       EMPTY_PHASE1,
  snapshots:        {},
  derivedAllInCost: 0,
  isPhaseComplete:  () => false,
  snapshotsLoading: true,
});

// ── Provider ──────────────────────────────────────────────────
export function ProjectPipelineProvider({ children }: { children: React.ReactNode }) {
  const { project } = useWorkspaceProject();
  const [snapshots, setSnapshots] = useState<PhaseSnapshotMap>({});
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);

  // Fetch immutable snapshots once per project ID
  useEffect(() => {
    if (!project?.id) return;
    let active = true;

    setSnapshotsLoading(true);
    projectsService.getPhaseSnapshots(project.id)
      .then(map => { if (active) { setSnapshots(map); setSnapshotsLoading(false); } })
      .catch(() => { if (active) setSnapshotsLoading(false); });

    return () => { active = false; };
  }, [project?.id]);

  // Derive Phase 1 live values from project.financials (always current)
  const phase1Live = useMemo<Phase1Live>(() => {
    const f = project?.financials;
    if (!f) return EMPTY_PHASE1;
    return {
      purchasePrice:         f.purchasePrice         ?? 0,
      estimatedARV:          f.estimatedARV           ?? 0,
      loanAmount:            f.loanAmount             ?? 0,
      loanInterestRate:      f.loanInterestRate       ?? 0,
      loanOriginationPoints: f.loanOriginationPoints  ?? 0,
      projectedRehabCost:    f.projectedRehabCost     ?? 0,
      estimatedTimelineDays: f.estimatedTimelineDays  ?? 0,
      fixedAcquisitionCosts: f.fixedAcquisitionCosts  ?? 0,
      maxOffer:              f.maxOffer               ?? 0,
    };
  }, [project?.financials]);

  // Derived all-in cost: purchasePrice + capitalized basis + rehab actuals + holding
  const derivedAllInCost = useMemo(() => {
    const basis = phase1Live.purchasePrice;

    // Capitalized basis from Phase 2 cost ledger (if captured)
    const p2 = snapshots['phase-2'];
    const capitalizedBasis = p2?.initialCapitalizedBasis ?? 0;

    // Rehab actuals + holding totals from Phase 3 snapshot (if captured)
    const p3 = snapshots['phase-3'];
    const rehabActual  = p3?.totalRehabActual  ?? (project?.financials?.projectedRehabCost ?? 0);
    const holdingTotal = p3?.totalHoldingCosts ?? 0;

    return basis + capitalizedBasis + rehabActual + holdingTotal;
  }, [phase1Live.purchasePrice, snapshots, project?.financials?.projectedRehabCost]);

  const isPhaseComplete = useCallback((key: PhaseSnapshotKey): boolean => {
    return key in snapshots;
  }, [snapshots]);

  const value = useMemo<PipelineData>(() => ({
    phase1Live,
    snapshots,
    derivedAllInCost,
    isPhaseComplete,
    snapshotsLoading,
  }), [phase1Live, snapshots, derivedAllInCost, isPhaseComplete, snapshotsLoading]);

  return (
    <PipelineContext.Provider value={value}>
      {children}
    </PipelineContext.Provider>
  );
}

// ── Consumer hooks ────────────────────────────────────────────

/** Access the full pipeline data object. */
export function usePipelineData(): PipelineData {
  return useContext(PipelineContext);
}

/**
 * Typed per-phase summary accessor.
 *
 * Usage in Phase 3:
 *   const snap = usePhaseSummary('phase-1');
 *   // snap is Phase1Snapshot | undefined
 *
 * Falls back to live project.financials for phase-1 when no snapshot
 * exists (i.e., the user hasn't formally advanced yet).
 */
export function usePhaseSummary(key: 'phase-1'): Phase1Snapshot | Phase1Live;
export function usePhaseSummary(key: 'phase-2'): Phase2Snapshot | undefined;
export function usePhaseSummary(key: 'phase-3'): Phase3Snapshot | undefined;
export function usePhaseSummary(key: PhaseSnapshotKey) {
  const { snapshots, phase1Live } = usePipelineData();

  if (key === 'phase-1') {
    // Return immutable snapshot if captured, otherwise live values
    return (snapshots['phase-1'] as Phase1Snapshot | undefined) ?? phase1Live;
  }
  if (key === 'phase-2') {
    return snapshots['phase-2'] as Phase2Snapshot | undefined;
  }
  return snapshots['phase-3'] as Phase3Snapshot | undefined;
}
