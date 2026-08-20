export interface TaskAssignBody {
  taskId?: unknown;
  assigneeUid?: unknown;
  projectId?: unknown;
}

export function validateTaskAssignBody(
  body: TaskAssignBody,
): { ok: true; taskId: string; assigneeUid: string; projectId: string | null } | { ok: false; error: string } {
  if (typeof body.taskId !== 'string' || !body.taskId.trim()) {
    return { ok: false, error: 'taskId and assigneeUid are required' };
  }
  if (typeof body.assigneeUid !== 'string' || !body.assigneeUid.trim()) {
    return { ok: false, error: 'taskId and assigneeUid are required' };
  }

  return {
    ok: true,
    taskId: body.taskId,
    assigneeUid: body.assigneeUid,
    projectId: typeof body.projectId === 'string' ? body.projectId : null,
  };
}

export function isTaskAssignBlocked(accountType: string): boolean {
  return accountType === 'investor' || accountType === 'standard';
}

export const TASK_ASSIGN_UPGRADE_RESPONSE = {
  error: 'Upgrade to Investment Team to assign tasks.',
  upgradeUrl: '/settings/upgrade?target=investment_team',
  message:
    'Get this done faster. Upgrade to Investment Team and collaborate with vendors and team members.',
} as const;
