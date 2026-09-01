import { NextResponse } from 'next/server';
import { adminErrorResponse } from '@/lib/api/admin-route-errors';
import { buildAdminAgentCrewReadService } from '@/lib/api/handler-deps';
import { isAuthorizedAdmin, resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/admin/agent-crew — synthetic agent roster (admin read). */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAuthorizedAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden', reason: 'admin_required' }, { status: 403 });
  }

  try {
    const result = await buildAdminAgentCrewReadService().listAgents(user);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load agent crew', details: message }, { status: 500 });
  }
}
