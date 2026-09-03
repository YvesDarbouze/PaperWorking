import { handleAuthMeGet } from '@paperworking/api';
import { buildAuthMeDeps, buildHandlerDeps } from '@/lib/api/handler-deps';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/auth/me — DB-authoritative session via shared Phase 9A resolver. */
export async function GET(request: Request) {
  const deps = buildHandlerDeps();
  const user = await resolveAuthUserFromRequest(request, deps);
  const result = await handleAuthMeGet(user, buildAuthMeDeps(deps));
  return toNextResponse(result);
}
