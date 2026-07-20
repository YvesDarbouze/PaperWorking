import type { ProjectFinancials, F4VendorAssignment } from '@/types/schema';
import { isAttorneyCloseState } from '@/lib/config/attorneyStates';

/**
 * F6 Phase Gate — Blocking-line evaluators
 *
 * Each function returns { blocked: boolean; reason: string }.
 * Collect all blocking lines and prevent phase advancement when
 * any line is blocked.
 */

export interface GateBlockingLine {
  key: string;
  label: string;
  blocked: boolean;
  reason: string;
}

/**
 * Attorney blocking line:
 * If the deal's state is in the attorney-close config list,
 * a closing attorney MUST be assigned before the fund phase gate can advance.
 */
export function evaluateAttorneyBlockingLine(
  projectState: string | undefined | null,
  financials: Partial<ProjectFinancials>,
  attorneyStateList: readonly string[]
): GateBlockingLine {
  const isRequired = isAttorneyCloseState(projectState, attorneyStateList);

  if (!isRequired) {
    return {
      key: 'attorney',
      label: 'Closing Attorney Assigned',
      blocked: false,
      reason: 'Not required — property is not in an attorney-close state.',
    };
  }

  const slot = financials.f4ClosingAttorneyVendor;
  const isAssigned = !!slot && (
    typeof slot === 'string'
      ? slot.trim().length > 0
      : !!(slot as F4VendorAssignment).name?.trim()
  );

  return {
    key: 'attorney',
    label: 'Closing Attorney Assigned',
    blocked: !isAssigned,
    reason: isAssigned
      ? `Attorney assigned: ${typeof slot === 'string' ? slot : (slot as F4VendorAssignment).name}`
      : 'This property is in an attorney-close state — assign your closing attorney before proceeding.',
  };
}

/**
 * Evaluate all F6 gate blocking lines.
 * Add new blocking-line evaluators here as cards are implemented.
 */
export function evaluateF6GateLines(
  project: { state?: string; financials?: Partial<ProjectFinancials> },
  attorneyStateList: readonly string[]
): GateBlockingLine[] {
  const f = project.financials || {};

  return [
    evaluateAttorneyBlockingLine(project.state, f, attorneyStateList),
    // Future blocking lines will be added here (e.g., locked terms, title clear, etc.)
  ];
}
