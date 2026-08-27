import {
  handleInboxByIdDelete,
  handleInboxByIdPatch,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  deleteInboxItem,
  getInboxItem,
  updateInboxItem,
} from '@/lib/inbox/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

type Ctx = { params: Promise<{ id: string }> };

function deps(uid: string) {
  return {
    verifyIdToken: async () => ({ uid }),
    getInboxItem: async (itemId: string) => {
      const item = getInboxItem(itemId);
      return item ? { recipientUid: item.recipientUid } : null;
    },
    updateInboxItem: async (itemId: string, patch: Record<string, unknown>) => {
      updateInboxItem(itemId, patch);
    },
    deleteInboxItem: async (itemId: string) => {
      deleteInboxItem(itemId);
    },
  };
}

export async function PATCH(request: Request, context: Ctx) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }

  const { id } = await context.params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await handleInboxByIdPatch(id, body, 'dev-session', deps(auth.uid));
  return toNextResponse(result);
}

export async function DELETE(_request: Request, context: Ctx) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }

  const { id } = await context.params;
  const result = await handleInboxByIdDelete(id, 'dev-session', deps(auth.uid));
  return toNextResponse(result);
}
