import { NextResponse } from 'next/server';
import { buildTeamCommandService } from '@/lib/api/handler-deps';
import { teamCommandErrorResponse } from '@/lib/api/team-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/team/invites — list pending invites for trusted org context. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId') ?? undefined;

  try {
    const result = await buildTeamCommandService().listInvites(user, { organizationId });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = teamCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch team invites', details: message },
      { status: 500 },
    );
  }
}
