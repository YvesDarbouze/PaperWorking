import { handleProjectGet, handleProjectsListGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  seedProjectForApiGet,
  seedProjectsForApiList,
} from '@/lib/projects/seed-data';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const auth = await requireDevSessionAuth();

  const result = await handleProjectsListGet(
    { q: url.searchParams.get('q') ?? undefined },
    {
      requireAuth: async () => {
        if (isDevAuthFailure(auth)) return auth;
        return { uid: auth.uid };
      },
      loadUserOrganization: async () => ({ organizationId: 'org-1' }),
      listProjects: async () => seedProjectsForApiList(),
    },
  );

  return toNextResponse(result);
}
