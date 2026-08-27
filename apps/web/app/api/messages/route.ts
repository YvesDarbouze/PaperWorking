import {
  handleMessagesGet,
  handleMessagesPost,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  createMessage,
  listMessages,
} from '@/lib/membership/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function GET(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }

  const url = new URL(request.url);
  const result = await handleMessagesGet(
    {
      userId: url.searchParams.get('userId') ?? auth.uid,
      user: url.searchParams.get('user'),
      handle: url.searchParams.get('handle'),
      threadId: url.searchParams.get('threadId'),
    },
    {
      listMessages: async (query) => listMessages(query),
    },
  );

  return toNextResponse(result);
}

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return toNextResponse({ status: auth.status, body: auth.body });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  if (!body.senderId) body.senderId = auth.uid;

  const result = await handleMessagesPost(body, {
    createMessage: async (input) => createMessage(input),
  });

  return toNextResponse(result);
}
