import { jsonResponse, type RouteResult } from '../../../http/response.js';

export type UpdateMessageReadFn = (
  messageId: string,
  read: boolean,
) => Promise<Record<string, unknown>>;

export interface MessageReadPatchDeps {
  updateReadState?: UpdateMessageReadFn;
}

export interface MessageReadPatchBody {
  read?: unknown;
}

/**
 * PATCH /api/messages/[id]/read
 */
export async function handleMessageReadPatch(
  messageId: string,
  body: MessageReadPatchBody = {},
  deps: MessageReadPatchDeps = {},
): Promise<RouteResult> {
  try {
    if (!messageId) {
      return jsonResponse(400, { error: 'Message ID is required' });
    }

    const readState = typeof body.read === 'boolean' ? body.read : true;

    const updated = deps.updateReadState
      ? await deps.updateReadState(messageId, readState)
      : { id: messageId, read: readState };

    return jsonResponse(200, { success: true, message: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Messages PATCH read Error]', message);
    return jsonResponse(500, {
      error: 'Failed to update message read status',
      message,
    });
  }
}
