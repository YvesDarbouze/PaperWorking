import { NextResponse } from 'next/server';
import { buildTeamMembersReadService } from '@/lib/api/handler-deps';
import { projectsReadErrorResponse } from '@/lib/api/project-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/team/members — list organization members for trusted org context. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId') ?? undefined;

  try {
    const result = await buildTeamMembersReadService().listTeamMembers(user, {
      organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    const mapped = projectsReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch team members', details: message },
      { status: 500 },
    );
  }
}
