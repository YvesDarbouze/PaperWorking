import { NextResponse } from 'next/server';
import {
  createOrgInvite,
  listOrgMembers,
  ORG_ID,
} from '@/lib/membership/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

/**
 * GET /api/organization-members
 * Lists organizationMembers SoT (org roster).
 */
export async function GET() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const listed = listOrgMembers(ORG_ID);
  return NextResponse.json({
    success: true,
    collection: 'organizationMembers',
    organizationId: ORG_ID,
    ...listed,
  });
}

/**
 * POST /api/organization-members
 * Invite into organizationMembers.
 */
export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: { email?: string; role?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.email || !body.role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }

  const invite = createOrgInvite({
    orgId: ORG_ID,
    email: body.email,
    role: body.role,
    invitedBy: auth.uid,
  });

  return NextResponse.json({ success: true, ...invite });
}
