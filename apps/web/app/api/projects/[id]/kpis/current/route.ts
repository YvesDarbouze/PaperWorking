import { NextResponse } from 'next/server';
import { buildProjectKpiReadService } from '@/lib/api/handler-deps';
import { projectsReadErrorResponse } from '@/lib/api/project-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/projects/[id]/kpis/current — authorized project KPI scorecard. */
export async function GET(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await buildProjectKpiReadService().getCurrentProjectKpis(user, id);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = projectsReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch project KPIs', details: message },
      { status: 500 },
    );
  }
}
