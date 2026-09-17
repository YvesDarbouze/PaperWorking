import { NextResponse } from 'next/server';
import { buildHandlerDeps } from '@/lib/api/handler-deps';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { handleHealthGet } from '@paperworking/api';
import { resolveBuildSha, resolveBuiltAt } from '@/lib/build-info';

export const dynamic = 'force-dynamic';

/** GET /api/health — same-origin adapter (Nest parity via shared handler) + build provenance. */
export async function GET() {
  const result = await handleHealthGet(buildHandlerDeps().health);
  const response = toNextResponse(result);
  const data = await response.json().catch(() => ({}) as Record<string, unknown>);
  return NextResponse.json(
    {
      ok: true,
      ...data,
      buildSha: resolveBuildSha(process.env),
      builtAt: resolveBuiltAt(process.env),
    },
    { status: response.status },
  );
}
