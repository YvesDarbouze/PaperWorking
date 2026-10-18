import {
  handleProjectUnderwritingGet,
  handleProjectUnderwritingPut,
} from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { getProjectFromStore, updateProjectInStore } from '@/lib/projects/project-store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const auth = await requireDevSessionAuth();

  const project = await getProjectFromStore(projectId);
  if (!project) {
    return toNextResponse({ status: 404, body: { error: 'Project not found' } });
  }
  const projectOrg = project.organizationId ?? 'org-1';

  const result = await handleProjectUnderwritingGet(projectId, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid, organizationId: projectOrg };
    },
    getProject: async (id) => {
      const p = await getProjectFromStore(id);
      if (!p) return null;
      return {
        id: p.id,
        organizationId: p.organizationId ?? 'org-1',
        userId: 'dev-user-1',
        underwritingRecord:
          (p as { underwritingRecord?: Record<string, unknown> | null }).underwritingRecord ?? null,
      };
    },
  });

  return toNextResponse(result);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const auth = await requireDevSessionAuth();
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const project = await getProjectFromStore(projectId);
  if (!project) {
    return toNextResponse({ status: 404, body: { error: 'Project not found' } });
  }
  const projectOrg = project.organizationId ?? 'org-1';

  const result = await handleProjectUnderwritingPut(projectId, body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid, organizationId: projectOrg };
    },
    getProject: async (id) => {
      const p = await getProjectFromStore(id);
      if (!p) return null;
      return {
        id: p.id,
        organizationId: p.organizationId ?? 'org-1',
        userId: 'dev-user-1',
        underwritingRecord:
          (p as { underwritingRecord?: Record<string, unknown> | null }).underwritingRecord ?? null,
      };
    },
    saveUnderwriting: async (id, data) => {
      const record = data as { purchasePrice?: unknown; rehabBudget?: unknown };
      await updateProjectInStore(id, {
        underwritingRecord: data,
        purchasePrice: Number(record.purchasePrice) || undefined,
        purchase_price: Number(record.purchasePrice) || undefined,
        rehab_costs: Number(record.rehabBudget) || undefined,
      } as never);
      return data;
    },
  });

  return toNextResponse(result);
}
