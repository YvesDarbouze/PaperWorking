import {
  handleSessionDelete,
  handleSessionPost,
  type SessionPostBody,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  buildSessionDeleteDeps,
  buildSessionPostDeps,
} from '@/lib/api/handler-deps';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/session — Firebase ID token → httpOnly session cookies (V0 parity).
 * Provisioning and cookie values are shared via SessionCommandService (P1).
 */
export async function POST(request: Request) {
  let body: SessionPostBody;
  try {
    body = (await request.json()) as SessionPostBody;
  } catch {
    return toNextResponse({ status: 400, body: { error: 'Invalid request body' } });
  }

  const result = await handleSessionPost(request, body, buildSessionPostDeps());
  return toNextResponse(result);
}

/** DELETE /api/auth/session — logout; clears session cookies. */
export async function DELETE(request: Request) {
  const result = await handleSessionDelete(request, buildSessionDeleteDeps());
  return toNextResponse(result);
}
