import { REIPhase } from './wizard-engine/questionTree';
import { generateTodosForPhase } from './todo-engine';
import { logGovernanceOverride, GovernanceLog } from './governance';

export const PHASE_ORDER: REIPhase[] = ['acquisition', 'purchase', 'hold', 'exit'];

export const PHASE_THEME_COLORS: Record<REIPhase, string> = {
  acquisition: '#1a3a5c', // Deep Blue
  purchase: '#2d5a3d',    // Forest Green
  hold: '#8b6914',        // Gold/Amber
  exit: '#5c1a1a',        // Burgundy
};

export interface PhaseTransitionResult {
  success: boolean;
  error?: string;
  project?: any;
  governanceLog?: GovernanceLog;
}

export function canAdvancePhase(
  currentPhase: REIPhase,
  completionPct: number,
  isForceAdvance: boolean = false,
  reason?: string
): { allowed: boolean; reason?: string } {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return { allowed: false, reason: 'Project is already in the final Exit phase.' };
  }

  if (completionPct >= 100) {
    return { allowed: true };
  }

  if (isForceAdvance) {
    if (!reason || reason.trim().length < 5) {
      return { allowed: false, reason: 'A valid explanation note (at least 5 characters) is required to force advance.' };
    }
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Current phase completion is at ${completionPct}%. Phase must reach 100% completion or be explicitly force-advanced with a governance note.`,
  };
}

export function advanceProjectPhase(
  project: any,
  userId: string,
  isForceAdvance: boolean = false,
  reason?: string
): PhaseTransitionResult {
  const currentPhase: REIPhase = project.phase || 'acquisition';
  const completionPct: number = project.phase_completion_pct || 0;

  const check = canAdvancePhase(currentPhase, completionPct, isForceAdvance, reason);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  const nextPhase = PHASE_ORDER[currentIndex + 1];

  let govLog: GovernanceLog | undefined;
  if (isForceAdvance && reason) {
    govLog = logGovernanceOverride({
      project_id: project.project_id || project.id,
      user_id: userId,
      action: 'FORCE_ADVANCE_PHASE',
      reason,
      old_value: currentPhase,
      new_value: nextPhase,
    });
  }

  const newTodos = generateTodosForPhase(nextPhase, project.answers || {});

  const updatedProject = {
    ...project,
    phase: nextPhase,
    currentPhase: currentIndex + 2,
    phaseStatus: `Phase: ${nextPhase.toUpperCase()}`,
    phase_completion_pct: 0,
    bgColor: PHASE_THEME_COLORS[nextPhase],
    todos: [...(project.todos || []), ...newTodos],
    updatedAt: new Date().toISOString(),
  };

  return {
    success: true,
    project: updatedProject,
    governanceLog: govLog,
  };
}

/**
 * Calculates daily and cumulative holding cost for a property in the Hold phase.
 */
export function calculateHoldingCost(
  purchasePrice: number,
  rehabBudget: number,
  daysHeld: number,
  monthlyCosts: { mortgage?: number; insurance?: number; taxes?: number; utilities?: number; hoa?: number; maintenance?: number } = {}
): { dailyHoldingCost: number; totalHoldingCost: number; totalCapitalInvested: number } {
  const monthlyTotal =
    (monthlyCosts.mortgage || 0) +
    (monthlyCosts.insurance || 0) +
    (monthlyCosts.taxes || 0) +
    (monthlyCosts.utilities || 0) +
    (monthlyCosts.hoa || 0) +
    (monthlyCosts.maintenance || 0);

  const dailyHoldingCost = Math.round((monthlyTotal * 12) / 365);
  const totalHoldingCost = dailyHoldingCost * Math.max(0, daysHeld);
  const totalCapitalInvested = purchasePrice + rehabBudget + totalHoldingCost;

  return {
    dailyHoldingCost,
    totalHoldingCost,
    totalCapitalInvested,
  };
}
