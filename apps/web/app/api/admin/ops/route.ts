import { NextResponse } from 'next/server';
import { adminErrorResponse } from '@/lib/api/admin-route-errors';
import { buildAdminOpsReadService } from '@/lib/api/handler-deps';
import { isAuthorizedAdmin, resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/admin/ops?section=* — admin-only platform ops read. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAuthorizedAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden', reason: 'admin_required' }, { status: 403 });
  }

  const section = new URL(request.url).searchParams.get('section') ?? undefined;
  try {
    const result = await buildAdminOpsReadService().getOpsSection(user, section);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load admin ops', details: message }, { status: 500 });
  }
}
