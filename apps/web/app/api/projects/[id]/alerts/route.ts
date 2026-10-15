import { handleProjectAlertsGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { getProjectFromStore } from '@/lib/projects/project-store';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const auth = await requireDevSessionAuth();

  const result = await handleProjectAlertsGet(projectId, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid, organizationId: (auth as any).organizationId ?? 'org-1' };
    },
    getProject: async (id) => {
      const p = await getProjectFromStore(id);
      if (!p) return null;
      return {
        id: p.id,
        organizationId: p.organizationId ?? 'org-1',
        userId: 'dev-user-1',
        contingencies: p.contingencies?.map((c) => ({
          id: c.id,
          name: (c as any).name ?? (c as any).label ?? 'Contingency',
          deadlineDate: (c as any).deadlineDate ?? (c as any).deadline ?? new Date().toISOString(),
          status: c.status,
        })) ?? [],
      };
    },
  });

  return toNextResponse(result);
}
