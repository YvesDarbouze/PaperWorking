import { NextResponse } from 'next/server';
import { reportsErrorResponse } from '@/lib/api/reports-route-errors';
import { buildReportsReadService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/reports/portfolio — portfolio investment report summary. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const period = new URL(request.url).searchParams.get('period') ?? undefined;

  try {
    const result = await buildReportsReadService().getPortfolioReport(user, period ?? undefined);
    return NextResponse.json({ ...result, period: period ?? 'monthly' });
  } catch (error) {
    const mapped = reportsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load portfolio report', details: message }, { status: 500 });
  }
}
