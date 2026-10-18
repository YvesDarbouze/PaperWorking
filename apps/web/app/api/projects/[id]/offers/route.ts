import {
  handleProjectOffersGet,
  handleProjectOffersPost,
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

  const result = await handleProjectOffersGet(projectId, {
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
        offers: (p as { offers?: unknown[] }).offers ?? [],
      };
    },
  });

  return toNextResponse(result);
}

export async function POST(
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

  const result = await handleProjectOffersPost(projectId, body, {
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
        offers: (p as { offers?: unknown[] }).offers ?? [],
      };
    },
    createOffer: async (id, offerData) => {
      const p = await getProjectFromStore(id);
      const existing = (p as { offers?: unknown[] } | null)?.offers ?? [];
      const offerWithId = {
        id: `offer-${Date.now().toString().slice(-6)}`,
        ...offerData,
      };
      const updatedOffers = [...existing, offerWithId];
      await updateProjectInStore(id, { offers: updatedOffers } as never);
      return offerWithId;
    },
  });

  return toNextResponse(result);
}
