/** Investor-facing cash-flow event stored on project.financials.cashFlowEvents */
export type StoredCashFlowEvent = {
  id: string;
  date: string;
  amount: number;
  type: 'investment' | 'return';
  description?: string;
};

/** Engine contract — signed amounts (negative = outflow, positive = inflow). */
export type EngineCashFlowEvent = {
  date: string;
  amount: number;
};

export type CashFlowEventValidationError = {
  field: string;
  message: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseValidDate(value: string): string | null {
  if (!ISO_DATE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() + 1 !== m || parsed.getUTCDate() !== d) {
    return null;
  }
  return value;
}

/** Parse persisted financials into UI/storage events (camelCase or legacy snake_case). */
export function parseStoredCashFlowEvents(financials: unknown): StoredCashFlowEvent[] {
  if (!isRecord(financials)) return [];
  const raw = financials.cashFlowEvents ?? financials.cash_flow_events;
  if (!Array.isArray(raw)) return [];

  const events: StoredCashFlowEvent[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const date = typeof item.date === 'string' ? parseValidDate(item.date.trim()) : null;
    const amount =
      typeof item.amount === 'number' && Number.isFinite(item.amount) ? Math.abs(item.amount) : null;
    const type = item.type === 'investment' || item.type === 'return' ? item.type : null;
    if (!id || !date || amount === null || amount <= 0 || !type) continue;
    events.push({
      id,
      date,
      amount,
      type,
      description:
        typeof item.description === 'string' && item.description.trim()
          ? item.description.trim()
          : undefined,
    });
  }

  return sortCashFlowEventsByDate(events);
}

export function sortCashFlowEventsByDate(events: StoredCashFlowEvent[]): StoredCashFlowEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** Validate a single event for create/update. */
export function validateCashFlowEvent(
  event: unknown,
  options: { requireId?: boolean } = {},
): CashFlowEventValidationError[] {
  const errors: CashFlowEventValidationError[] = [];
  if (!isRecord(event)) {
    return [{ field: 'event', message: 'Event must be an object' }];
  }

  const requireId = options.requireId !== false;
  const id = typeof event.id === 'string' ? event.id.trim() : '';
  if (requireId && !id) {
    errors.push({ field: 'id', message: 'Event id is required' });
  }

  const dateRaw = typeof event.date === 'string' ? event.date.trim() : '';
  if (!dateRaw) {
    errors.push({ field: 'date', message: 'Date is required' });
  } else if (!parseValidDate(dateRaw)) {
    errors.push({ field: 'date', message: 'Date must be a valid YYYY-MM-DD value' });
  }

  const amount =
    typeof event.amount === 'number' && Number.isFinite(event.amount) ? event.amount : null;
  if (amount === null) {
    errors.push({ field: 'amount', message: 'Amount is required' });
  } else if (amount <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be greater than zero' });
  }

  if (event.type !== 'investment' && event.type !== 'return') {
    errors.push({ field: 'type', message: 'Type must be investment or return' });
  }

  if (event.description !== undefined && event.description !== null) {
    if (typeof event.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be text' });
    } else if (event.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must be 500 characters or fewer' });
    }
  }

  return errors;
}

/** Validate an array of stored events (server boundary). */
export function validateCashFlowEventSchedule(events: unknown): CashFlowEventValidationError[] {
  if (events === undefined || events === null) return [];
  if (!Array.isArray(events)) {
    return [{ field: 'cashFlowEvents', message: 'Cash-flow events must be an array' }];
  }

  const errors: CashFlowEventValidationError[] = [];
  const seenIds = new Set<string>();

  events.forEach((event, index) => {
    const rowErrors = validateCashFlowEvent(event);
    for (const err of rowErrors) {
      errors.push({ field: `cashFlowEvents[${index}].${err.field}`, message: err.message });
    }
    if (isRecord(event) && typeof event.id === 'string') {
      const id = event.id.trim();
      if (id) {
        if (seenIds.has(id)) {
          errors.push({
            field: `cashFlowEvents[${index}].id`,
            message: 'Duplicate event id',
          });
        }
        seenIds.add(id);
      }
    }
  });

  if (errors.length === 0 && events.length > 50) {
    errors.push({ field: 'cashFlowEvents', message: 'Maximum 50 cash-flow events allowed' });
  }

  return errors;
}

/** UI/storage → engine signed cash flows (sorted chronologically). */
export function storedEventsToEngineEvents(events: StoredCashFlowEvent[]): EngineCashFlowEvent[] {
  return sortCashFlowEventsByDate(events).map((event) => ({
    date: event.date,
    amount: event.type === 'investment' ? -Math.abs(event.amount) : Math.abs(event.amount),
  }));
}

/** Serialize validated events for Firestore (camelCase). */
export function serializeCashFlowEventsForPersistence(
  events: StoredCashFlowEvent[],
): StoredCashFlowEvent[] {
  return sortCashFlowEventsByDate(events).map((event) => ({
    id: event.id,
    date: event.date,
    amount: Math.abs(event.amount),
    type: event.type,
    ...(event.description ? { description: event.description } : {}),
  }));
}

/** Whether schedule has both investment and return flows for IRR / equity multiple. */
export function cashFlowScheduleHasMixedSigns(engineEvents: EngineCashFlowEvent[]): boolean {
  if (engineEvents.length < 2) return false;
  const hasNegative = engineEvents.some((cf) => cf.amount < 0);
  const hasPositive = engineEvents.some((cf) => cf.amount > 0);
  return hasNegative && hasPositive;
}

export function computeEquityMultipleFromEngineEvents(
  engineEvents: EngineCashFlowEvent[],
): number | null {
  if (!cashFlowScheduleHasMixedSigns(engineEvents)) return null;
  const totalInvested = engineEvents
    .filter((cf) => cf.amount < 0)
    .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);
  const totalReturned = engineEvents
    .filter((cf) => cf.amount > 0)
    .reduce((sum, cf) => sum + cf.amount, 0);
  if (totalInvested <= 0 || totalReturned <= 0) return null;
  return Number((totalReturned / totalInvested).toFixed(2));
}
