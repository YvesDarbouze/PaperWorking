import { NextResponse } from 'next/server';
import { adminErrorResponse } from '@/lib/api/admin-route-errors';
import { buildAdminRentcastReadService } from '@/lib/api/handler-deps';
import { isAuthorizedAdmin, resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/admin/rentcast-usage — DB-backed RentCast usage telemetry (no API keys). */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAuthorizedAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden', reason: 'admin_required' }, { status: 403 });
  }

  const url = new URL(request.url);
  const year = url.searchParams.get('year');
  const month = url.searchParams.get('month');

  try {
    const result = await buildAdminRentcastReadService().getUsage(user, {
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load rentcast usage', details: message }, { status: 500 });
  }
}
