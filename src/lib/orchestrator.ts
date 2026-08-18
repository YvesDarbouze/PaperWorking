export type OrchestratorEventType =
  | 'project:created'
  | 'phase:advanced'
  | 'expense:added'
  | 'bid:accepted'
  | 'tax:quarter_end'
  | 'plaid:transaction_synced';

export interface OrchestratorEvent {
  eventId: string;
  type: OrchestratorEventType;
  payload: Record<string, any>;
  timestamp: string;
}

export interface OrchestratorEventResult {
  eventId: string;
  type: OrchestratorEventType;
  processed: boolean;
  isDuplicate: boolean;
  actionsExecuted: string[];
}

const processedEventIds = new Set<string>();

/**
 * Dispatches an event to the Orchestration Hub with idempotency tracking
 */
export async function dispatchOrchestratorEvent(
  event: OrchestratorEvent
): Promise<OrchestratorEventResult> {
  // Idempotency check: if eventId has already been processed, skip re-execution
  if (processedEventIds.has(event.eventId)) {
    return {
      eventId: event.eventId,
      type: event.type,
      processed: false,
      isDuplicate: true,
      actionsExecuted: [],
    };
  }

  const actionsExecuted: string[] = [];

  switch (event.type) {
    case 'project:created':
      actionsExecuted.push('generate_phase_todos');
      actionsExecuted.push('allocate_storage_quota');
      break;

    case 'phase:advanced':
      actionsExecuted.push('notify_project_team');
      actionsExecuted.push('recalculate_phase_completion');
      actionsExecuted.push('log_governance_override');
      break;

    case 'expense:added':
      actionsExecuted.push('recalculate_tax_deductions');
      actionsExecuted.push('check_1099_nec_threshold');
      break;

    case 'bid:accepted':
      actionsExecuted.push('assign_vendor_to_todo');
      actionsExecuted.push('create_d10_project_expense');
      actionsExecuted.push('notify_inbox');
      break;

    case 'tax:quarter_end':
      actionsExecuted.push('generate_1040_es_pdf');
      actionsExecuted.push('send_quarterly_reminder_email');
      break;

    case 'plaid:transaction_synced':
      actionsExecuted.push('classify_transaction');
      actionsExecuted.push('create_project_expense');
      actionsExecuted.push('auto_link_receipt');
      break;

    default:
      break;
  }

  processedEventIds.add(event.eventId);

  return {
    eventId: event.eventId,
    type: event.type,
    processed: true,
    isDuplicate: false,
    actionsExecuted,
  };
}

/**
 * Resets event history (for unit testing)
 */
export function resetOrchestratorHistory() {
  processedEventIds.clear();
}
