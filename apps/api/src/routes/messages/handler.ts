import { jsonResponse, type RouteResult } from '../../http/response.js';
import {
  groupMessagesIntoThreads,
  validateCreateMessageBody,
  generateMessageId,
  generateThreadId,
  type MessageRecord,
} from '../../lib/messages/threads.js';

export type ListMessagesFn = (query: {
  userId?: string | null;
  threadId?: string | null;
}) => Promise<MessageRecord[]>;

export type CreateMessageFn = (input: {
  id: string;
  threadId: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  attachmentProjectId: string | null;
}) => Promise<MessageRecord>;

export interface MessagesGetQuery {
  userId?: string | null;
  user?: string | null;
  handle?: string | null;
  threadId?: string | null;
}

export interface MessagesGetDeps {
  listMessages?: ListMessagesFn;
}

export interface MessagesPostDeps {
  createMessage?: CreateMessageFn;
  generateMessageId?: () => string;
  generateThreadId?: () => string;
}

export interface MessagesPostBody {
  threadId?: unknown;
  senderId?: unknown;
  recipientId?: unknown;
  subject?: unknown;
  body?: unknown;
  content?: unknown;
  attachmentProjectId?: unknown;
  projectId?: unknown;
}

/**
 * GET /api/messages — inbox or thread messages.
 */
export async function handleMessagesGet(
  query: MessagesGetQuery,
  deps: MessagesGetDeps = {},
): Promise<RouteResult> {
  try {
    const threadId = query.threadId;
    const userId = query.userId || query.user || query.handle;

    const messages = deps.listMessages
      ? await deps.listMessages({ userId, threadId })
      : [];

    if (threadId) {
      return jsonResponse(200, {
        success: true,
        threadId,
        messages,
      });
    }

    const unreadCount = messages.filter((m) => !m.read).length;
    const threads = groupMessagesIntoThreads(messages);

    return jsonResponse(200, {
      success: true,
      count: messages.length,
      unreadCount,
      threads,
      messages,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Messages GET Error]', message);
    return jsonResponse(500, { error: 'Failed to fetch messages', message });
  }
}

/**
 * POST /api/messages — send a message.
 */
export async function handleMessagesPost(
  body: MessagesPostBody,
  deps: MessagesPostDeps = {},
): Promise<RouteResult> {
  try {
    const validated = validateCreateMessageBody(body);
    if (!validated.ok) {
      return jsonResponse(400, { error: validated.error });
    }

    const msgId = deps.generateMessageId?.() ?? generateMessageId();
    const threadId =
      (typeof body.threadId === 'string' && body.threadId) ||
      deps.generateThreadId?.() ||
      generateThreadId();

    const attachmentProjectId =
      (typeof body.attachmentProjectId === 'string' ? body.attachmentProjectId : null) ||
      (typeof body.projectId === 'string' ? body.projectId : null);

    const created = deps.createMessage
      ? await deps.createMessage({
          id: msgId,
          threadId,
          senderId: validated.senderId,
          recipientId: validated.recipientId,
          subject: typeof body.subject === 'string' ? body.subject : 'Re: Message',
          body: validated.content,
          attachmentProjectId,
        })
      : ({
          id: msgId,
          threadId,
          senderId: validated.senderId,
          recipientId: validated.recipientId,
          subject: typeof body.subject === 'string' ? body.subject : 'Re: Message',
          body: validated.content,
          read: false,
          createdAt: new Date().toISOString(),
        } satisfies MessageRecord);

    return jsonResponse(200, { success: true, message: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Messages POST Error]', message);
    return jsonResponse(500, { error: 'Failed to create message', message });
  }
}
