import { NextResponse } from 'next/server';
import { handleProjectAcquisitionStatusPatch } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { requireWebOrgRole } from '@/lib/auth/require-role';
import {
  getProjectFromStore,
  updateProjectInStore,
} from '@/lib/projects/project-store';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const project = await getProjectFromStore(projectId);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const projectOrg = (project as any).organizationId || 'org-1';
  const roleCheck = await requireWebOrgRole({ uid: auth.uid }, projectOrg, 'admin');
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await handleProjectAcquisitionStatusPatch(projectId, body, {
    requireAuth: async () => {
      return { uid: auth.uid, organizationId: projectOrg };
    },
    getProject: async (id) => {
      const p = await getProjectFromStore(id);
      return p ? (p as unknown as Record<string, unknown>) : null;
    },
    updateProject: async (id, updates) => {
      const updated = await updateProjectInStore(id, updates as any);
      return (updated ?? { id, ...updates }) as unknown as Record<string, unknown>;
    },
  });

  return toNextResponse(result);
}
