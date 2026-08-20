import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { buildInboxItemUpdate, type UpdateInboxItemBody } from '../../../lib/inbox/validation.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;

export type GetInboxItemFn = (itemId: string) => Promise<{ recipientUid: string } | null>;

export type UpdateInboxItemFn = (itemId: string, update: Record<string, unknown>) => Promise<void>;

export type DeleteInboxItemFn = (itemId: string) => Promise<void>;

export interface InboxByIdDeps {
  verifyIdToken?: VerifyIdTokenFn;
  getInboxItem?: GetInboxItemFn;
  updateInboxItem?: UpdateInboxItemFn;
  deleteInboxItem?: DeleteInboxItemFn;
}

/**
 * PATCH /api/inbox/[id]
 */
export async function handleInboxByIdPatch(
  itemId: string,
  body: UpdateInboxItemBody,
  idToken: string | null | undefined,
  deps: InboxByIdDeps = {},
): Promise<RouteResult> {
  try {
    if (!idToken) {
      return jsonResponse(401, { success: false, error: 'Unauthorized' });
    }

    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: 'user-demo' };

    const item = deps.getInboxItem ? await deps.getInboxItem(itemId) : { recipientUid: decoded.uid };
    if (!item) {
      return jsonResponse(404, { success: false, error: 'Inbox item not found' });
    }
    if (item.recipientUid !== decoded.uid) {
      return jsonResponse(403, { success: false, error: 'Forbidden' });
    }

    const updateData = buildInboxItemUpdate(body);
    if (!updateData) {
      return jsonResponse(400, { success: false, error: 'No valid fields to update' });
    }

    if (deps.updateInboxItem) {
      await deps.updateInboxItem(itemId, updateData);
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Inbox] Error updating inbox item:', message);
    if (message.includes('id-token-expired')) {
      return jsonResponse(401, { success: false, error: 'Session expired.' });
    }
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
}

/**
 * DELETE /api/inbox/[id]
 */
export async function handleInboxByIdDelete(
  itemId: string,
  idToken: string | null | undefined,
  deps: InboxByIdDeps = {},
): Promise<RouteResult> {
  try {
    if (!idToken) {
      return jsonResponse(401, { success: false, error: 'Unauthorized' });
    }

    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: 'user-demo' };

    const item = deps.getInboxItem ? await deps.getInboxItem(itemId) : { recipientUid: decoded.uid };
    if (!item) {
      return jsonResponse(404, { success: false, error: 'Inbox item not found' });
    }
    if (item.recipientUid !== decoded.uid) {
      return jsonResponse(403, { success: false, error: 'Forbidden' });
    }

    if (deps.deleteInboxItem) {
      await deps.deleteInboxItem(itemId);
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Inbox] Error deleting inbox item:', message);
    if (message.includes('id-token-expired')) {
      return jsonResponse(401, { success: false, error: 'Session expired.' });
    }
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
}
