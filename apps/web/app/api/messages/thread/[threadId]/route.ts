import { handleMessagesThreadGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { listMessages } from '@/lib/membership/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET(
  _request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }

  const { threadId } = await context.params;
  const result = await handleMessagesThreadGet(threadId, {
    loadMessages: async (id) => listMessages({ threadId: id }),
  });

  return toNextResponse(result);
}
