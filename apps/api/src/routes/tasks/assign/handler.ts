import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import {
  isTaskAssignBlocked,
  TASK_ASSIGN_UPGRADE_RESPONSE,
  validateTaskAssignBody,
  type TaskAssignBody,
} from '../../../lib/tasks/assign.js';

export type GetUserAccountTypeFn = (uid: string) => Promise<string>;

export type CreateTaskAssignmentFn = (input: {
  taskId: string;
  assigneeUid: string;
  projectId: string | null;
  assignedBy: string;
}) => Promise<string>;

export interface TasksAssignPostDeps {
  requireAuth?: RequireAuthFn;
  getUserAccountType?: GetUserAccountTypeFn;
  createTaskAssignment?: CreateTaskAssignmentFn;
}

/**
 * POST /api/tasks/assign
 */
export async function handleTasksAssignPost(
  body: TaskAssignBody,
  deps: TasksAssignPostDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    const accountType = deps.getUserAccountType
      ? await deps.getUserAccountType(auth.uid)
      : 'investment_team';

    if (isTaskAssignBlocked(accountType)) {
      return jsonResponse(403, TASK_ASSIGN_UPGRADE_RESPONSE);
    }

    const validated = validateTaskAssignBody(body);
    if (!validated.ok) {
      return jsonResponse(400, { error: validated.error });
    }

    const assignmentId = deps.createTaskAssignment
      ? await deps.createTaskAssignment({
          taskId: validated.taskId,
          assigneeUid: validated.assigneeUid,
          projectId: validated.projectId,
          assignedBy: auth.uid,
        })
      : `assignment_${Date.now()}`;

    return jsonResponse(200, { success: true, assignmentId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Task assignment failed', details: message });
  }
}
