import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { appendProjectNote, isInboxAction } from '../../../lib/inbox/validation.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string }>;

export type GetInboxActionItemFn = (itemId: string) => Promise<{
  recipientUid: string;
  metadata?: { projectId?: string; expectedDate?: string; expectedAmount?: string | number };
} | null>;

export type ExecuteInboxActionFn = (input: {
  itemId: string;
  userId: string;
  action: string;
  paidDate?: string;
  projectId: string;
}) => Promise<{ rentFound?: boolean; message: string }>;

export interface InboxActionsPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  getInboxItem?: GetInboxActionItemFn;
  executeAction?: ExecuteInboxActionFn;
}

/**
 * POST /api/inbox/[id]/actions
 */
export async function handleInboxActionsPost(
  itemId: string,
  body: { action?: unknown; paidDate?: unknown },
  idToken: string | null | undefined,
  deps: InboxActionsPostDeps = {},
): Promise<RouteResult> {
  if (!idToken) {
    return jsonResponse(401, { success: false, error: 'Unauthorized' });
  }

  try {
    const decoded = deps.verifyIdToken
      ? await deps.verifyIdToken(idToken)
      : { uid: 'user-demo' };

    const item = deps.getInboxItem
      ? await deps.getInboxItem(itemId)
      : { recipientUid: decoded.uid, metadata: { projectId: 'proj-1' } };

    if (!item) {
      return jsonResponse(404, { success: false, error: 'Inbox item not found' });
    }
    if (item.recipientUid !== decoded.uid) {
      return jsonResponse(403, { success: false, error: 'Forbidden' });
    }

    if (!isInboxAction(body.action)) {
      return jsonResponse(400, { success: false, error: 'Unknown action' });
    }

    const projectId = item.metadata?.projectId;
    if (!projectId) {
      return jsonResponse(400, { success: false, error: 'Missing projectId in item metadata' });
    }

    const result = deps.executeAction
      ? await deps.executeAction({
          itemId,
          userId: decoded.uid,
          action: body.action,
          paidDate: typeof body.paidDate === 'string' ? body.paidDate : undefined,
          projectId,
        })
      : {
          message:
            body.action === 'search_again'
              ? 'Plaid sync completed. Rent payment is still missing.'
              : body.action === 'mark_late'
                ? 'Rent marked as late.'
                : 'Rent marked as paid manually.',
          rentFound: body.action === 'search_again' ? false : undefined,
        };

    return jsonResponse(200, {
      success: true,
      ...(result.rentFound !== undefined ? { rentFound: result.rentFound } : {}),
      message: result.message,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Inbox Actions API] Error:', message);
    return jsonResponse(500, { success: false, error: message });
  }
}

export { appendProjectNote };
