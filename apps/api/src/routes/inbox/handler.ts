import { jsonResponse, type RouteResult } from '../../http/response.js';
import {
  buildInboxItemDocument,
  generateInboxItemId,
  validateCreateInboxItemBody,
  type CreateInboxItemBody,
} from '../../lib/inbox/validation.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;

export type CreateInboxItemFn = (item: Record<string, unknown>) => Promise<void>;

export interface InboxPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  createInboxItem?: CreateInboxItemFn;
  generateItemId?: () => string;
}

/**
 * POST /api/inbox
 */
export async function handleInboxPost(
  body: CreateInboxItemBody,
  idToken: string | null | undefined,
  deps: InboxPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!idToken) {
      return jsonResponse(401, { success: false, error: 'Unauthorized' });
    }

    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: 'user-demo' };

    const validated = validateCreateInboxItemBody(body);
    if (!validated.ok) {
      return jsonResponse(400, { success: false, error: validated.error });
    }

    const itemId = deps.generateItemId?.() ?? generateInboxItemId();
    const inboxItem = buildInboxItemDocument(validated.value, decoded.uid, itemId);

    if (deps.createInboxItem) {
      await deps.createInboxItem(inboxItem);
    }

    return jsonResponse(200, { success: true, itemId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Inbox] Error creating inbox item:', message);
    if (message.includes('id-token-expired')) {
      return jsonResponse(401, { success: false, error: 'Session expired.' });
    }
    return jsonResponse(500, { success: false, error: 'Internal server error' });
  }
}
