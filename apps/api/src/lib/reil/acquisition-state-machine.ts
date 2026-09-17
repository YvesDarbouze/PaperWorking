import type {
  AcquisitionPipelineStatus,
  DeadReasonCategory,
  DeadRecord,
  AcquisitionTask,
} from "@paperworking/validation";
import { generateUnderContractTasks } from "@paperworking/financial-engine";

export const ALLOWED_ACQUISITION_TRANSITIONS: Record<
  AcquisitionPipelineStatus,
  readonly AcquisitionPipelineStatus[]
> = {
  lead: ["analyzing", "dead"],
  analyzing: ["offer_sent", "dead"],
  offer_sent: ["negotiating", "under_contract", "dead"],
  negotiating: ["offer_sent", "under_contract", "dead"],
  under_contract: ["due_diligence", "dead"],
  due_diligence: ["clear_to_close", "dead"],
  clear_to_close: ["closed", "dead"],
  closed: [], // Terminal forward state
  dead: ["analyzing"], // Reopenable to analyzing with explicit audit
};

export const VALID_DEAD_REASONS: readonly DeadReasonCategory[] = [
  "numbers_failed",
  "offer_rejected",
  "inspection",
  "financing",
  "title",
  "other",
] as const;

export interface AcquisitionTransitionContext {
  projectId?: string;

  // Required when transitioning to "dead"
  deadReason?: DeadReasonCategory;
  deadReasonNotes?: string;

  // Required when transitioning to "under_contract"
  psaDocumentUrl?: string;
  psaExecutionDate?: string;
  emdAmount?: number;
  emdHolder?: string;
  emdDueDate?: string;

  // Optional contingency deadlines for task generation
  contingencyDeadlines?: {
    inspectionDays?: number;
    financingDays?: number;
    appraisalDays?: number;
    titleReviewDays?: number;
    closingTargetDays?: number;
  };

  // Optional closing information when transitioning to "closed"
  closingDate?: string;
  actualCashToClose?: number;
  closingDocuments?: Array<{
    id: string;
    type: string;
    name: string;
    documentUrl: string;
    uploadedAt: string;
  }>;

  // Existing project state for guard checks
  contingencies?: Array<{
    status: "open" | "satisfied" | "waived" | "terminated";
    type: string;
  }>;

  // Notes/reason for manual audit trail
  note?: string;
}

export interface TransitionValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
}

/**
 * Checks whether a direct transition from currentStatus to targetStatus is structurally allowed.
 */
export function canTransitionAcquisitionStatus(
  currentStatus: AcquisitionPipelineStatus,
  targetStatus: AcquisitionPipelineStatus,
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_ACQUISITION_TRANSITIONS[currentStatus];
  return Boolean(allowed && allowed.includes(targetStatus));
}

/**
 * Validates transition rules and entry/exit guards for an acquisition state change.
 */
export function validateAcquisitionTransition(
  currentStatus: AcquisitionPipelineStatus,
  targetStatus: AcquisitionPipelineStatus,
  context: AcquisitionTransitionContext = {},
): TransitionValidationResult {
  // 1. Same status is a no-op
  if (currentStatus === targetStatus) {
    return { valid: true };
  }

  // 2. Transition allowance check
  if (!canTransitionAcquisitionStatus(currentStatus, targetStatus)) {
    return {
      valid: false,
      error: `Invalid transition from "${currentStatus}" to "${targetStatus}". Allowed target states: [${ALLOWED_ACQUISITION_TRANSITIONS[currentStatus]?.join(", ") || "none"}].`,
      code: "INVALID_TRANSITION",
    };
  }

  // 3. Guard: Entering "dead" requires a valid dead_reason category and notes
  if (targetStatus === "dead") {
    if (!context.deadReason || !VALID_DEAD_REASONS.includes(context.deadReason)) {
      return {
        valid: false,
        error: `A valid dead_reason category is required when archiving/killing a deal. Allowed reasons: [${VALID_DEAD_REASONS.join(", ")}].`,
        code: "DEAD_REASON_REQUIRED",
      };
    }
    if (!context.deadReasonNotes || context.deadReasonNotes.trim().length < 3) {
      return {
        valid: false,
        error: "Dead reason explanatory notes (at least 3 characters) are required.",
        code: "DEAD_NOTES_REQUIRED",
      };
    }
  }

  // 4. Guard: Entering "under_contract" requires PSA execution details and positive EMD amount if provided
  if (targetStatus === "under_contract") {
    if (!context.psaDocumentUrl && !context.psaExecutionDate) {
      return {
        valid: false,
        error: "Entering \"under_contract\" requires an executed PSA document URL or PSA execution date.",
        code: "PSA_DETAILS_REQUIRED",
      };
    }
    if (context.emdAmount !== undefined && context.emdAmount <= 0) {
      return {
        valid: false,
        error: "Earnest money deposit (EMD) amount must be a positive number.",
        code: "INVALID_EMD_AMOUNT",
      };
    }
  }

  // 5. Guard: Entering "clear_to_close" checks that contingencies are not blocked/open
  if (targetStatus === "clear_to_close" && context.contingencies) {
    const hasUnresolved = context.contingencies.some(
      (c) => c.status === "open" || c.status === "terminated",
    );
    if (hasUnresolved) {
      return {
        valid: false,
        error: "Cannot transition to \"clear_to_close\" while contingencies are open or terminated. Satisfy or waive all contingencies first.",
        code: "UNRESOLVED_CONTINGENCIES",
      };
    }
  }

  // 6. Guard: Entering "closed" requires closing date
  if (targetStatus === "closed") {
    if (!context.closingDate) {
      return {
        valid: false,
        error: "Closing date is required to mark project as \"closed\".",
        code: "CLOSING_DATE_REQUIRED",
      };
    }
    if (context.actualCashToClose !== undefined && context.actualCashToClose < 0) {
      return {
        valid: false,
        error: "Actual cash to close cannot be negative.",
        code: "INVALID_CASH_TO_CLOSE",
      };
    }
  }

  return { valid: true };
}

// ── Typed Error Classes for Acquisition State Machine ──────────────────────────

export class AcquisitionStateError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AcquisitionStateError';
    this.code = code;
  }
}

export class IllegalStateTransitionError extends AcquisitionStateError {
  readonly fromStatus: AcquisitionPipelineStatus;
  readonly toStatus: AcquisitionPipelineStatus;

  constructor(fromStatus: AcquisitionPipelineStatus, toStatus: AcquisitionPipelineStatus) {
    super(
      `Illegal transition from "${fromStatus}" to "${toStatus}". Allowed targets: [${ALLOWED_ACQUISITION_TRANSITIONS[fromStatus]?.join(', ') || 'none'}].`,
      'ILLEGAL_STATE_TRANSITION',
    );
    this.name = 'IllegalStateTransitionError';
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

export class DeadReasonRequiredError extends AcquisitionStateError {
  constructor(
    message: string = 'A valid dead_reason category and explanatory notes are required when archiving a deal.',
  ) {
    super(message, 'DEAD_REASON_REQUIRED');
    this.name = 'DeadReasonRequiredError';
  }
}

export class MissingContractDataError extends AcquisitionStateError {
  constructor(
    message: string = 'Entering "under_contract" requires PSA document execution details.',
  ) {
    super(message, 'MISSING_CONTRACT_DATA');
    this.name = 'MissingContractDataError';
  }
}

export class UnresolvedContingenciesError extends AcquisitionStateError {
  constructor(
    message: string = 'Cannot transition to "clear_to_close" while contingencies remain open or terminated.',
  ) {
    super(message, 'UNRESOLVED_CONTINGENCIES');
    this.name = 'UnresolvedContingenciesError';
  }
}

export class ClosingDataRequiredError extends AcquisitionStateError {
  constructor(message: string = 'Closing date is required to mark project as "closed".') {
    super(message, 'CLOSING_DATA_REQUIRED');
    this.name = 'ClosingDataRequiredError';
  }
}

export interface StateTransitionResult {
  updatedStatus: AcquisitionPipelineStatus;
  deadRecord?: DeadRecord;
  autoGeneratedTasks?: AcquisitionTask[];
  transitionLogEntry: {
    from: AcquisitionPipelineStatus;
    to: AcquisitionPipelineStatus;
    timestamp: string;
    actorUid: string;
    note?: string;
  };
}

/**
 * Applies the state transition, generating audit records and triggering automated tasks.
 * Throws typed errors on illegal transitions or violated guards.
 */
export function executeAcquisitionTransition(
  currentStatus: AcquisitionPipelineStatus,
  targetStatus: AcquisitionPipelineStatus,
  context: AcquisitionTransitionContext,
  actorUid: string,
): StateTransitionResult {
  const validation = validateAcquisitionTransition(currentStatus, targetStatus, context);
  if (!validation.valid) {
    switch (validation.code) {
      case 'INVALID_TRANSITION':
        throw new IllegalStateTransitionError(currentStatus, targetStatus);
      case 'DEAD_REASON_REQUIRED':
      case 'DEAD_NOTES_REQUIRED':
        throw new DeadReasonRequiredError(validation.error);
      case 'PSA_DETAILS_REQUIRED':
      case 'INVALID_EMD_AMOUNT':
        throw new MissingContractDataError(validation.error);
      case 'UNRESOLVED_CONTINGENCIES':
        throw new UnresolvedContingenciesError(validation.error);
      case 'CLOSING_DATE_REQUIRED':
      case 'INVALID_CASH_TO_CLOSE':
        throw new ClosingDataRequiredError(validation.error);
      default:
        throw new AcquisitionStateError(validation.error ?? 'State machine transition blocked', validation.code ?? 'TRANSITION_FAILED');
    }
  }

  const timestamp = new Date().toISOString();
  let deadRecord: DeadRecord | undefined;
  let autoGeneratedTasks: AcquisitionTask[] | undefined;

  // If entering dead, build deadRecord
  if (targetStatus === 'dead' && context.deadReason) {
    deadRecord = {
      deadReasonCategory: context.deadReason,
      deadReasonNotes: context.deadReasonNotes ?? '',
      archivedAt: timestamp,
      archivedByUid: actorUid,
      previousStatus: currentStatus,
    };
  }

  // If entering under_contract, trigger automated task generation
  if (targetStatus === 'under_contract') {
    const executionDate = context.psaExecutionDate ?? timestamp;
    const closingDate =
      context.closingDate ??
      new Date(new Date(executionDate).getTime() + 30 * 86400000).toISOString();
    autoGeneratedTasks = generateUnderContractTasks({
      projectId: context.projectId ?? 'proj-unknown',
      executionDate,
      closingDate,
      inspectionPeriodDays: context.contingencyDeadlines?.inspectionDays ?? 10,
      financingContingencyDays: context.contingencyDeadlines?.financingDays ?? 21,
      appraisalContingencyDays: context.contingencyDeadlines?.appraisalDays ?? 14,
    });
  }

  return {
    updatedStatus: targetStatus,
    deadRecord,
    autoGeneratedTasks,
    transitionLogEntry: {
      from: currentStatus,
      to: targetStatus,
      timestamp,
      actorUid,
      note: context.note,
    },
  };
}

// ── Progressive Hard-Date Alerts Engine ────────────────────────────────────────

export interface ContingencyAlert {
  id: string;
  contingencyId: string;
  contingencyName: string;
  deadlineDate: string;
  hoursRemaining: number;
  severity: 'notice_72h' | 'warning_48h' | 'critical_24h';
  title: string;
  message: string;
}

/**
 * Computes progressive warning alerts for active contingencies:
 * - 48h to 72h: Notice (amber badge)
 * - 24h to 48h: Warning (top banner)
 * - < 24h: Critical (red modal barrier)
 */
export function computeContingencyAlerts(
  contingencies: Array<{
    id: string;
    name: string;
    deadlineDate: string;
    status: 'open' | 'satisfied' | 'waived' | 'terminated';
  }>,
  referenceDate: Date = new Date(),
): ContingencyAlert[] {
  const alerts: ContingencyAlert[] = [];
  const refTime = referenceDate.getTime();

  for (const c of contingencies) {
    if (c.status !== 'open') continue;

    const deadlineTime = new Date(c.deadlineDate).getTime();
    if (Number.isNaN(deadlineTime)) continue;

    const diffMs = deadlineTime - refTime;
    const hoursRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

    if (diffMs <= 0) {
      alerts.push({
        id: `alert-expired-${c.id}`,
        contingencyId: c.id,
        contingencyName: c.name,
        deadlineDate: c.deadlineDate,
        hoursRemaining: 0,
        severity: 'critical_24h',
        title: `Contingency Expired: ${c.name}`,
        message: `The deadline for ${c.name} has passed. Take immediate contractual action to avoid forfeiture of rights.`,
      });
    } else if (hoursRemaining < 24) {
      alerts.push({
        id: `alert-24h-${c.id}`,
        contingencyId: c.id,
        contingencyName: c.name,
        deadlineDate: c.deadlineDate,
        hoursRemaining,
        severity: 'critical_24h',
        title: `Critical (${hoursRemaining}h remaining): ${c.name}`,
        message: `Dates that go hard: ${c.name} contingency expires in ${hoursRemaining} hours. Complete or waive before date goes hard.`,
      });
    } else if (hoursRemaining < 48) {
      alerts.push({
        id: `alert-48h-${c.id}`,
        contingencyId: c.id,
        contingencyName: c.name,
        deadlineDate: c.deadlineDate,
        hoursRemaining,
        severity: 'warning_48h',
        title: `Warning (${hoursRemaining}h remaining): ${c.name}`,
        message: `${c.name} deadline is approaching in ${hoursRemaining} hours. Audit diligence reports now.`,
      });
    } else if (hoursRemaining <= 72) {
      alerts.push({
        id: `alert-72h-${c.id}`,
        contingencyId: c.id,
        contingencyName: c.name,
        deadlineDate: c.deadlineDate,
        hoursRemaining,
        severity: 'notice_72h',
        title: `Notice (${hoursRemaining}h remaining): ${c.name}`,
        message: `${c.name} contingency expires in 3 days. Verify that inspector or lender conditions are on track.`,
      });
    }
  }

  return alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}

