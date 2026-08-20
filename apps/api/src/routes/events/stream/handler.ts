import { jsonResponse, sseResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  formatSseEvent,
  formatSseHeartbeat,
  projectEventChannel,
  SSE_HEARTBEAT_MS,
  SSE_PROJECT_EVENTS,
  type SseProjectEvent,
  validateEventsStreamQuery,
} from '../../../lib/events/sse.js';

export type SseSubscribeFn = (
  channel: string,
  listener: (data: unknown) => void,
) => void;

export type SseUnsubscribeFn = (
  channel: string,
  listener: (data: unknown) => void,
) => void;

export interface EventsStreamGetDeps {
  requireAuth?: RequireAuthFn;
  subscribe?: SseSubscribeFn;
  unsubscribe?: SseUnsubscribeFn;
}

/**
 * GET /api/events/stream — Server-Sent Events for project-scoped updates.
 */
export async function handleEventsStreamGet(
  query: { projectId?: string | null },
  deps: EventsStreamGetDeps = {},
  abortSignal?: AbortSignal,
): Promise<RouteResult> {
  if (!deps.requireAuth) {
    return jsonResponse(500, { error: 'Auth not configured' });
  }

  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) {
    return jsonResponse(auth.status, auth.body);
  }

  const validated = validateEventsStreamQuery(query.projectId);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const listeners = new Map<SseProjectEvent, (data: unknown) => void>();

      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(formatSseEvent(event, data)));
      };

      const interval = setInterval(() => {
        controller.enqueue(encoder.encode(formatSseHeartbeat()));
      }, SSE_HEARTBEAT_MS);

      for (const eventName of SSE_PROJECT_EVENTS) {
        const listener = (data: unknown) => sendEvent(eventName, data);
        listeners.set(eventName, listener);
        deps.subscribe?.(projectEventChannel(eventName, validated.projectId), listener);
      }

      const cleanup = () => {
        clearInterval(interval);
        for (const eventName of SSE_PROJECT_EVENTS) {
          const listener = listeners.get(eventName);
          if (listener) {
            deps.unsubscribe?.(projectEventChannel(eventName, validated.projectId), listener);
          }
        }
      };

      abortSignal?.addEventListener('abort', cleanup, { once: true });
    },
  });

  return sseResponse(stream);
}
