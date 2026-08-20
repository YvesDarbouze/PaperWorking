import { handleProjectGet } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import { seedProjectForApiGet } from '@/lib/projects/seed-data';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const auth = await requireDevSessionAuth();

  const result = await handleProjectGet(
    { projectId: id },
    {
      authenticate: async () => {
        if (isDevAuthFailure(auth)) return auth;
        return { uid: auth.uid };
      },
      getProject: async (projectId) => {
        const project = seedProjectForApiGet(projectId);
        if (!project) return null;
        return { id: projectId, project_id: projectId, ...project };
      },
    },
  );

  return toNextResponse(result);
}
