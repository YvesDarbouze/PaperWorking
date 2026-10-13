import { NextResponse } from 'next/server';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { requireWebOrgRole, resolveWebCallerOrg } from '@/lib/auth/require-role';
import { deleteStackForOrg, listStacksForOrg } from '@/lib/projects/stack-store';
import { projectApiError } from '@/lib/projects/project-access';

function requestedOrgId(request?: Request): string | null {
  if (!request) return null;
  return new URL(request.url).searchParams.get('organizationId');
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: stackId } = await context.params;
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const org = await resolveWebCallerOrg({ uid: auth.uid }, requestedOrgId(request));
  if (!org.ok) return org.response;
  const roleCheck = await requireWebOrgRole({ uid: auth.uid }, org.organizationId, 'member');
  if (!roleCheck.ok) return roleCheck.response;

  const deleted = await deleteStackForOrg(org.organizationId, stackId);
  if (!deleted) {
    return projectApiError(404, 'Project stack not found', 'NOT_FOUND');
  }

  const remaining = await listStacksForOrg(org.organizationId);
  return NextResponse.json({ success: true, stacks: remaining });
}
