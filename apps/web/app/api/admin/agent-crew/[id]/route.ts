import { NextResponse } from 'next/server';
import { adminErrorResponse } from '@/lib/api/admin-route-errors';
import {
  buildAdminAgentCrewCommandService,
  buildAdminAgentCrewReadService,
} from '@/lib/api/handler-deps';
import { isAuthorizedAdmin, resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/admin/agent-crew/:id — synthetic agent detail (admin read). */
export async function GET(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAuthorizedAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden', reason: 'admin_required' }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const result = await buildAdminAgentCrewReadService().getAgent(user, id);
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load agent detail', details: message }, { status: 500 });
  }
}

/** DELETE /api/admin/agent-crew/:id — delete synthetic agent (admin mutation). */
export async function DELETE(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAuthorizedAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden', reason: 'admin_required' }, { status: 403 });
  }

  const { id } = await context.params;
  try {
    const result = await buildAdminAgentCrewCommandService().deleteAgent(user, id);
    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to delete agent', details: message }, { status: 500 });
  }
}
