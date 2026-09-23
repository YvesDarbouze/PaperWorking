/**
 * Shared ticket ID generation for chatbot intake, support routes, and the
 * unified ticket store.
 */

import type { TicketKind } from './ticket-types';

const TICKET_ID_PREFIXES: Record<TicketKind, string> = {
  bug: 'PW-BUG',
  feature_request: 'PW-FEAT',
  callback: 'PW-CALL',
  question: 'PW-ASK',
  idea: 'PW-IDEA',
  support: 'PW-SUP',
};

export function generateTicketId(kind: TicketKind): string {
  const prefix = TICKET_ID_PREFIXES[kind] ?? 'PW-SUP';
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${rand}`;
}
