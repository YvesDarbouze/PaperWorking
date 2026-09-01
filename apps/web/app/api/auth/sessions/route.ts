import { handleAuthSessionsGet } from '@paperworking/api';
import { buildHandlerDeps } from '@/lib/api/handler-deps';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/auth/sessions — DB-authoritative session via shared Phase 9A resolver. */
export async function GET(request: Request) {
  const deps = buildHandlerDeps();
  const user = await resolveAuthUserFromRequest(request, deps);
  const userAgent = request.headers.get('user-agent') ?? undefined;
  const result = await handleAuthSessionsGet(user, userAgent);
  return toNextResponse(result);
}
