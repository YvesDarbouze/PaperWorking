import { NextResponse } from 'next/server';
import { buildTeamCommandService, buildTeamMembersReadService } from '@/lib/api/handler-deps';
import { projectsReadErrorResponse } from '@/lib/api/project-route-errors';
import { teamCommandErrorResponse, teamCommandResultResponse } from '@/lib/api/team-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { TeamCreateMemberInput } from '@paperworking/services';

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

function parseCreateBody(body: unknown): TeamCreateMemberInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  return {
    userId: typeof record.userId === 'string' ? record.userId : undefined,
    email: typeof record.email === 'string' ? record.email : undefined,
    role: typeof record.role === 'string' ? record.role : undefined,
    organizationId:
      typeof record.organizationId === 'string' ? record.organizationId : undefined,
  };
}

/** POST /api/team/members — create org member (team.manage). */
export async function POST(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await buildTeamCommandService().createMember(user, parseCreateBody(body));
    return teamCommandResultResponse(result);
  } catch (error) {
    const mapped = teamCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create team member', details: message },
      { status: 500 },
    );
  }
}
