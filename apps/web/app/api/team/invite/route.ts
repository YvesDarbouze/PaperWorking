import { NextResponse } from 'next/server';
import { buildTeamCommandService } from '@/lib/api/handler-deps';
import { teamCommandErrorResponse } from '@/lib/api/team-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { TeamInviteInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

function parseInviteBody(body: unknown): TeamInviteInput {
  if (!body || typeof body !== 'object') return { email: '' };
  const record = body as Record<string, unknown>;
  return {
    email: typeof record.email === 'string' ? record.email : String(record.email ?? ''),
    role: typeof record.role === 'string' ? record.role : undefined,
    organizationId:
      typeof record.organizationId === 'string' ? record.organizationId : undefined,
  };
}

/** POST /api/team/invite — invite a member to the trusted organization. */
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
    const result = await buildTeamCommandService().inviteMember(user, parseInviteBody(body));
    return NextResponse.json(result);
  } catch (error) {
    const mapped = teamCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to invite team member', details: message },
      { status: 500 },
    );
  }
}
