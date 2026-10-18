import { NextResponse } from 'next/server';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { requireWebOrgRole, resolveWebCallerOrg } from '@/lib/auth/require-role';
import { getGlobalEverythingForOrg } from '@/lib/projects/everything';

export const dynamic = 'force-dynamic';

function requestedOrgId(request?: Request): string | null {
  if (!request) return null;
  return new URL(request.url).searchParams.get('organizationId');
}

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
  const events = summary.upcomingDeadlines.map((item) => ({
    id: item.event.id,
    projectId: item.projectId,
    projectName: item.projectName,
    title: item.event.title,
    date: item.event.date,
    category: item.event.category,
    phase: item.event.phase,
    isHardDate: Boolean(item.event.isHardDate),
    responsibleParty: item.event.responsibleParty,
    notes: item.event.notes,
  }));

  return NextResponse.json(
    {
      connected: true,
      events,
      upcomingDeadlines: summary.upcomingDeadlines,
      assignments: summary.assignments,
      totalProjects: summary.totalProjects,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
