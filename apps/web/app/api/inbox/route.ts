import { NextResponse } from 'next/server';
import {
  handleInboxPost,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  createInboxItem,
  listInboxItems,
} from '@/lib/inbox/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

/**
 * GET /api/inbox?tab=
 * List inbox items for the session user (seed SoT until Firestore inboxItems).
 */
export async function GET(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const tab = new URL(request.url).searchParams.get('tab');
  const threads = listInboxItems(auth.uid, tab);
  const unreadCount = threads.filter((t) => t.unread).length;

  return NextResponse.json({
    success: true,
    collection: 'inboxItems',
    count: threads.length,
    unreadCount,
    threads,
  });
}

/**
 * POST /api/inbox
 */
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

  const result = await handleInboxPost(body, 'dev-session', {
    verifyIdToken: async () => ({ uid: auth.uid }),
    createInboxItem: async (item) => {
      createInboxItem(item);
    },
  });

  return toNextResponse(result);
}
