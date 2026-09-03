import { NextResponse } from 'next/server';
import { buildTeamCommandService } from '@/lib/api/handler-deps';
import { teamCommandErrorResponse, teamCommandResultResponse } from '@/lib/api/team-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { TeamCreateMemberInput, TeamUpdateMemberInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function parseUpdateBody(body: unknown): TeamUpdateMemberInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  const input: TeamUpdateMemberInput = {};
  if (typeof record.role === 'string') input.role = record.role;
  if (typeof record.status === 'string') input.status = record.status;
  return input;
}

async function handleUpdate(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await buildTeamCommandService().updateMember(user, id, parseUpdateBody(body));
    return NextResponse.json(result);
  } catch (error) {
    const mapped = teamCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update team member', details: message },
      { status: 500 },
    );
  }
}

/** PATCH /api/team/members/[id] — update org member role/status. */
export async function PATCH(request: Request, context: RouteContext) {
  return handleUpdate(request, context);
}

/** PUT /api/team/members/[id] — update org member role/status (Nest parity). */
export async function PUT(request: Request, context: RouteContext) {
  return handleUpdate(request, context);
}

/** DELETE /api/team/members/[id] — remove org member. */
export async function DELETE(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await buildTeamCommandService().removeMember(user, id);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = teamCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to remove team member', details: message },
      { status: 500 },
    );
  }
}
