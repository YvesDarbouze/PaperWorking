import { NextResponse } from 'next/server';
import { projectStackCreateSchema } from '@paperworking/validation';
import { isDevAuthFailure, requireDevSessionAuth } from '@/lib/projects/dev-session-auth';
import { requireWebOrgRole, resolveWebCallerOrg } from '@/lib/auth/require-role';
import { getProjectFromStore } from '@/lib/projects/project-store';
import { newProjectItemId, parseProjectBody, projectApiError } from '@/lib/projects/project-access';
import { createStackForOrg, listStacksForOrg } from '@/lib/projects/stack-store';
import type { ProjectStack } from '@/lib/projects/types';

function requestedOrgId(request: Request): string | null {
  return new URL(request.url).searchParams.get('organizationId');
}

/** Stacks for the caller's organization only (optionally ?organizationId= one they belong to). */
export async function GET(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const org = await resolveWebCallerOrg({ uid: auth.uid }, requestedOrgId(request));
  if (!org.ok) return org.response;

  return NextResponse.json({ stacks: await listStacksForOrg(org.organizationId) });
}

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const org = await resolveWebCallerOrg({ uid: auth.uid }, requestedOrgId(request));
  if (!org.ok) return org.response;
  const roleCheck = await requireWebOrgRole({ uid: auth.uid }, org.organizationId, 'member');
  if (!roleCheck.ok) return roleCheck.response;

  const parsed = await parseProjectBody(request, projectStackCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const projectIds = Array.from(new Set(body.projectIds ?? []));
  for (const projectId of projectIds) {
    const project = await getProjectFromStore(projectId);
    if (!project || (project.organizationId || 'org-1') !== org.organizationId) {
      return projectApiError(400, `Project ${projectId} is not in your organization`, 'INVALID_PROJECT_REFERENCE');
    }
  }

  const stack: ProjectStack = {
    id: newProjectItemId('stack'),
    name: body.name,
    ...(body.description ? { description: body.description } : {}),
    projectIds,
    color: body.color ?? '#6366f1',
    organizationId: org.organizationId,
    createdByUid: auth.uid,
    createdAt: new Date().toISOString(),
  };
  const saved = await createStackForOrg(org.organizationId, stack);
  return NextResponse.json(
    { success: true, stack: saved, stacks: await listStacksForOrg(org.organizationId) },
    { status: 201 },
  );
}
