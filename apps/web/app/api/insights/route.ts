import { NextResponse } from 'next/server';
import { insightsErrorResponse } from '@/lib/api/insights-route-errors';
import { buildPortfolioInsightsReadService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/insights — portfolio insights rollup from accessible projects. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = new URL(request.url).searchParams.get('scope') ?? undefined;

  try {
    const result = await buildPortfolioInsightsReadService().getPortfolioInsights(user, scope);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = insightsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load insights', details: message }, { status: 500 });
  }
}
