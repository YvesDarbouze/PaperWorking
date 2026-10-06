import { NextResponse } from 'next/server';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { markAllInboxThreadsReadInStore } from '@/lib/inbox/inbox-store';

export async function POST(_request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const count = await markAllInboxThreadsReadInStore({
    organizationId: auth.organizationId,
    recipientUid: auth.uid,
  });

  return NextResponse.json({
    success: true,
    markedCount: count,
  });
}
