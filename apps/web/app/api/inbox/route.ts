import { NextResponse } from 'next/server';
import { buildInboxReadService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/inbox — list inbox items and UI threads for authenticated recipient. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await buildInboxReadService().listInbox(user);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch inbox', details: message },
      { status: 500 },
    );
  }
}
