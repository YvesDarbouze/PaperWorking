/**
 * usePhaseSummary — cross-phase financial data accessor
 *
 * Re-export from ProjectPipelineContext.
 * Import this hook in phase pages for typed, read-only access
 * to upstream financial data without prop drilling.
 *
 * Usage:
 *   // In Phase 3 page — read Phase 1 financials (live or snapshot)
 *   const p1 = usePhaseSummary('phase-1');
 *   console.log(p1.purchasePrice);   // always available
 *
 *   // In Phase 4 page — read Phase 3 actuals
 *   const p3 = usePhaseSummary('phase-3');
 *   console.log(p3?.totalRehabActual);  // undefined if Phase 3 not yet complete
 *
 *   // Access derived all-in cost and completion gates
 *   const { derivedAllInCost, isPhaseComplete } = usePipelineData();
 */
export {
  usePhaseSummary,
  usePipelineData,
  ProjectPipelineProvider,
} from '@/context/ProjectPipelineContext';
export type { PipelineData, Phase1Live } from '@/context/ProjectPipelineContext';
