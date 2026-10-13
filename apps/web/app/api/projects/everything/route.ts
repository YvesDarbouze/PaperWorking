import { NextResponse } from 'next/server';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { requireWebOrgRole, resolveWebCallerOrg } from '@/lib/auth/require-role';
import { getGlobalEverythingForOrg } from '@/lib/projects/everything';

function requestedOrgId(request?: Request): string | null {
  if (!request) return null;
  return new URL(request.url).searchParams.get('organizationId');
}

/**
 * Global feed aggregating recent activity, assigned to-dos, and upcoming dates
 * across all projects in the caller's organization.
 */
export async function GET(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const org = await resolveWebCallerOrg({ uid: auth.uid }, requestedOrgId(request));
  if (!org.ok) return org.response;
  const roleCheck = await requireWebOrgRole({ uid: auth.uid }, org.organizationId, 'viewer');
  if (!roleCheck.ok) return roleCheck.response;

  const summary = await getGlobalEverythingForOrg(org.organizationId, auth.uid);
  return NextResponse.json(summary);
}
