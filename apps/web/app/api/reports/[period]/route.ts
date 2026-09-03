import { NextResponse } from 'next/server';
import { reportsErrorResponse } from '@/lib/api/reports-route-errors';
import { buildReportsReadService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ period: string }> };

const RESERVED = new Set(['portfolio', 'generate']);

/** GET /api/reports/[period] — project-scoped period ledger (stub-empty transactions). */
export async function GET(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { period } = await context.params;
  if (!period || RESERVED.has(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 403 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId') ?? undefined;
  const organizationId = url.searchParams.get('organizationId') ?? undefined;

  try {
    const result = await buildReportsReadService().getPeriodReport(user, period, {
      projectId,
      organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = reportsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load period report', details: message }, { status: 500 });
  }
}
