import { NextResponse } from 'next/server';
import {
  listProjectMembers,
  ORG_ID,
  upsertProjectMember,
  type ProjectMemberSeed,
} from '@/lib/membership/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

/**
 * GET /api/project-members?projectId=&userId=
 * Lists queryable project memberships (SoT for RBAC).
 */
export async function GET(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId') ?? undefined;
  const userId = url.searchParams.get('userId') ?? undefined;
  const members = listProjectMembers(projectId, userId);

  return NextResponse.json({
    success: true,
    collection: 'projectMembers',
    count: members.length,
    members,
  });
}

/**
 * POST /api/project-members
 * Creates/upserts a projectMembers doc (membership SoT).
 */
export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: Partial<ProjectMemberSeed> = {};
  try {
    body = (await request.json()) as Partial<ProjectMemberSeed>;
  } catch {
    body = {};
  }

  if (!body.projectId || !body.userId || !body.role) {
    return NextResponse.json(
      { error: 'projectId, userId, and role are required' },
      { status: 400 },
    );
  }

  const role = body.role;
  if (!['OWNER', 'TEAM_LEAD', 'TEAM_MEMBER', 'VENDOR'].includes(role)) {
    return NextResponse.json(
      { error: 'role must be OWNER | TEAM_LEAD | TEAM_MEMBER | VENDOR' },
      { status: 400 },
    );
  }

  const id = body.id ?? `${body.projectId}_${body.userId}`;
  const member = upsertProjectMember({
    id,
    projectId: body.projectId,
    userId: body.userId,
    organizationId: body.organizationId ?? ORG_ID,
    role,
    status: body.status ?? 'active',
    displayName: body.displayName,
    email: body.email,
    invitedBy: body.invitedBy ?? auth.uid,
    acceptedAt: body.acceptedAt ?? new Date().toISOString(),
  });

  return NextResponse.json({ success: true, member });
}
