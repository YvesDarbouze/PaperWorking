import { buildHandlerDeps } from '@/lib/api/handler-deps';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { handleHealthGet } from '@paperworking/api';

export const dynamic = 'force-dynamic';

/** GET /api/health — same-origin adapter (Nest parity via shared handler). */
export async function GET() {
  const result = await handleHealthGet(buildHandlerDeps().health);
  return toNextResponse(result);
}
