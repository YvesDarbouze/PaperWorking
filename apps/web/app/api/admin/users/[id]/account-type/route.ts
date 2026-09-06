import { NextResponse } from 'next/server';
import { AdminUserCommandError } from '@paperworking/services';
import { adminErrorResponse } from '@/lib/api/admin-route-errors';
import { buildAdminUserCommandService } from '@/lib/api/handler-deps';
import { isAuthorizedAdmin, resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/users/:id/account-type
 * Body: { accountType: "investor" | "investment_team" | "vendor" | "admin" }
 */
export async function PATCH(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAuthorizedAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden', reason: 'admin_required' }, { status: 403 });
  }

  const { id } = await context.params;
  let body: { accountType?: unknown };
  try {
    body = (await request.json()) as { accountType?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const result = await buildAdminUserCommandService().updateAccountType(
      user,
      decodeURIComponent(id),
      body.accountType,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminUserCommandError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const mapped = adminErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update account type', details: message },
      { status: 500 },
    );
  }
}
