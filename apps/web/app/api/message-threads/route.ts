import { NextResponse } from 'next/server';
import { listMessageThreads } from '@/lib/membership/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

/**
 * GET /api/message-threads — lists messageThreads SoT for the session user.
 */
export async function GET(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const userId = new URL(request.url).searchParams.get('userId') ?? auth.uid;
  const threads = listMessageThreads(userId);

  return NextResponse.json({
    success: true,
    collection: 'messageThreads',
    count: threads.length,
    threads,
  });
}
