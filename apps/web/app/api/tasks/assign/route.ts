import { handleTasksAssignPost } from '@paperworking/api';
import { toNextResponse } from '@/lib/api/adapt-route-result';
import { createTaskAssignment } from '@/lib/membership/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  let body: Record<string, unknown> = {};

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const result = await handleTasksAssignPost(body, {
    requireAuth: async () => {
      if (isDevAuthFailure(auth)) return auth;
      return { uid: auth.uid };
    },
    getUserAccountType: async () => 'team',
    createTaskAssignment: async ({ taskId, assigneeUid, projectId, assignedBy }) =>
      createTaskAssignment({ taskId, assigneeUid, projectId, assignedBy }),
  });

  return toNextResponse(result);
}

