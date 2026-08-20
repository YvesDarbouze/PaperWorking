import { jsonResponse, type RouteResult } from '../../../http/response.js';
import {
  formatThreadMessagesResponse,
  validateThreadId,
} from '../../../lib/messages/thread.js';

export type LoadThreadMessagesFn = (
  threadId: string,
) => Promise<Array<Record<string, unknown>>>;

export interface MessagesThreadGetDeps {
  loadMessages?: LoadThreadMessagesFn;
}

/**
 * GET /api/messages/thread/[threadId]
 */
export async function handleMessagesThreadGet(
  threadId: string,
  deps: MessagesThreadGetDeps = {},
): Promise<RouteResult> {
  const validated = validateThreadId(threadId);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error });
  }

  try {
    const messages = deps.loadMessages ? await deps.loadMessages(validated.threadId) : [];
    return jsonResponse(200, formatThreadMessagesResponse(validated.threadId, messages));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Messages Thread GET Error]', message);
    return jsonResponse(500, { error: 'Failed to fetch message thread', message });
  }
}
