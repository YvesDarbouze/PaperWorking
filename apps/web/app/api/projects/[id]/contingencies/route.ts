import { NextResponse } from 'next/server';
import {
  handleProjectContingenciesGet,
  handleProjectContingenciesPost,
} from '@paperworking/api';
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
import { isRecord, updateProjectSubresource } from '@/lib/projects/project-subresource';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  context: RouteContext,
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

  const projectOrg = (project as { organizationId?: string }).organizationId || 'org-1';
  const roleCheck = await requireWebOrgRole({ uid: auth.uid }, projectOrg, 'viewer');
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  const result = await handleProjectContingenciesGet(projectId, {
    requireAuth: async () => ({ uid: auth.uid, organizationId: projectOrg }),
    getProject: async (id) => {
      const p = await getProjectFromStore(id);
      if (!p) return null;
      return {
        id: p.id,
        organizationId: p.organizationId ?? 'org-1',
        contingencies: p.contingencies ?? [],
      };
    },
  });

  return toNextResponse(result);
}

export async function POST(
  request: Request,
  context: RouteContext,
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

  const projectOrg = (project as { organizationId?: string }).organizationId || 'org-1';
  const roleCheck = await requireWebOrgRole({ uid: auth.uid }, projectOrg, 'member');
  if (!roleCheck.ok) {
    return roleCheck.response;
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await handleProjectContingenciesPost(projectId, body, {
    requireAuth: async () => ({ uid: auth.uid, organizationId: projectOrg }),
    getProject: async (id) => {
      const p = await getProjectFromStore(id);
      if (!p) return null;
      return {
        id: p.id,
        organizationId: p.organizationId ?? 'org-1',
        contingencies: p.contingencies ?? [],
      };
    },
    createContingency: async (id, data) => {
      const p = await getProjectFromStore(id);
      const existing = (p?.contingencies ?? []) as unknown[];
      const contingencyWithId = {
        id: `ctg-${Date.now().toString().slice(-6)}`,
        label: data.name,
        deadline: data.deadlineDate,
        ...data,
      };
      const updated = [...existing, contingencyWithId];
      await updateProjectInStore(id, { contingencies: updated } as never);
      return contingencyWithId;
    },
  });

  return toNextResponse(result);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * PATCH /api/projects/[id]/contingencies — update status or record an
 * extension (new deadline + reason) for a single contingency.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const contingencyId = optionalString(body.contingencyId);
  if (!contingencyId) {
    return NextResponse.json({ error: 'contingencyId is required.' }, { status: 400 });
  }

  const status = optionalString(body.status);
  const newDeadline = optionalString(body.newDeadline);
  const reason = optionalString(body.reason);

  const result = await updateProjectSubresource(request, id, (current) => {
    const contingencies = Array.isArray(current.contingencies) ? current.contingencies : [];
    let found = false;

    const updated = contingencies.map((item) => {
      if (!isRecord(item) || item.id !== contingencyId) return item;
      found = true;
      const next: Record<string, unknown> = { ...item, updatedAt: new Date().toISOString() };

      if (status) next.status = status;
      if (newDeadline) {
        const history = Array.isArray(item.extensionHistory) ? item.extensionHistory : [];
        next.deadline = newDeadline;
        next.extensionHistory = [
          ...history,
          {
            extensionId: crypto.randomUUID(),
            previousDeadline: typeof item.deadline === 'string' ? item.deadline : newDeadline,
            newDeadline,
            reason: reason ?? 'Extension requested',
            requestedAt: new Date().toISOString(),
            approvedBySeller: false,
          },
        ];
      }
      return next;
    });

    return found ? { contingencies: updated } : null;
  });

  if (!result.ok) return result.response;

  return NextResponse.json({
    success: true,
    contingencies: result.project.contingencies ?? [],
  });
}
