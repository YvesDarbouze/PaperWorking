export const SSE_PROJECT_EVENTS = [
  'transactions:new',
  'transactions:approved',
  'account:updated',
  'liabilities:updated',
  'kpi:updated',
  'consent:changed',
] as const;

export type SseProjectEvent = (typeof SSE_PROJECT_EVENTS)[number];

export function validateEventsStreamQuery(
  projectId: string | null | undefined,
): { ok: true; projectId: string } | { ok: false; error: string; status: number } {
  const id = projectId?.trim() || '';
  if (!id) {
    return { ok: false, error: 'Missing projectId parameter', status: 400 };
  }
  return { ok: true, projectId: id };
}

export function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function formatSseHeartbeat(): string {
  return ': heartbeat\n\n';
}

export function projectEventChannel(event: SseProjectEvent, projectId: string): string {
  return `${event}:${projectId}`;
}

export const SSE_HEARTBEAT_MS = 15_000;
