import { NextResponse } from 'next/server';
import { buildPortfolioMetricsReadService } from '@/lib/api/handler-deps';
import { projectsReadErrorResponse } from '@/lib/api/project-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/portfolio/metrics — portfolio rollup for accessible projects. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? undefined;

  try {
    const result = await buildPortfolioMetricsReadService().getPortfolioMetrics(user, { period });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = projectsReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch portfolio metrics', details: message },
      { status: 500 },
    );
  }
}
