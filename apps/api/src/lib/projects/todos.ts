export interface TodoItem {
  id: string;
  completed?: boolean;
  assignee?: string;
  [key: string]: unknown;
}

export function validateTodosUpdateBody(body: {
  idToken?: unknown;
  projectId?: unknown;
  todos?: unknown;
}): { ok: true; projectId: string; todos: TodoItem[] } | { ok: false; error: string; status: number } {
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  if (!body.idToken || !projectId || !Array.isArray(body.todos)) {
    return {
      ok: false,
      error: 'Missing required fields: idToken, projectId, todos',
      status: 400,
    };
  }
  return { ok: true, projectId, todos: body.todos as TodoItem[] };
}

export function isSubscriptionActive(profile: Record<string, unknown>): boolean {
  const status = String(profile.subscriptionStatus || 'inactive');
  return status === 'active' || status === 'trialing';
}

export function validateTodoPermissionChanges(input: {
  currentActionItems: TodoItem[];
  proposedTodos: TodoItem[];
  profile: Record<string, unknown>;
  userEmail: string;
  projectTeam?: Array<{ email?: string; status?: string }>;
}): { ok: true } | { ok: false; error: string; status: number } {
  const hasActiveSub = isSubscriptionActive(input.profile);
  const plan = hasActiveSub ? String(input.profile.subscriptionPlan || 'None') : 'None';
  const isVendor =
    input.profile.role === 'Vendor' || input.profile.accountType === 'vendor';
  const isReadOnly = isVendor || plan === 'Vendor Network';

  for (const proposedTodo of input.proposedTodos) {
    const currentTodo = input.currentActionItems.find((item) => item.id === proposedTodo.id);
    const wasCompleted = !!currentTodo?.completed;
    const isCompleted = !!proposedTodo.completed;
    if (wasCompleted !== isCompleted && (plan === 'None' || isReadOnly)) {
      return {
        ok: false,
        error: 'Your current subscription plan or role does not permit completing action items.',
        status: 403,
      };
    }

    const currentAssignee = currentTodo?.assignee || '';
    const proposedAssignee = proposedTodo.assignee || '';
    if (currentAssignee !== proposedAssignee) {
      if (plan === 'None' || isReadOnly) {
        return {
          ok: false,
          error: 'Your current subscription plan or role does not permit assigning tasks.',
          status: 403,
        };
      }
      if (plan === 'Individual' && proposedAssignee !== '' && proposedAssignee !== input.userEmail) {
        return {
          ok: false,
          error: 'Individual plan users can only assign tasks to themselves.',
          status: 403,
        };
      }
      if (plan === 'Team' && proposedAssignee !== '') {
        const activeTeamEmails = (input.projectTeam || [])
          .filter((member) => member.status === 'active')
          .map((member) => member.email)
          .filter(Boolean) as string[];
        const allowedEmails = [input.userEmail, ...activeTeamEmails];
        if (!allowedEmails.includes(proposedAssignee)) {
          return {
            ok: false,
            error: 'Assignee must be the current user or an active member of the project team.',
            status: 403,
          };
        }
      }
    }
  }

  return { ok: true };
}

export { hasCrossTenantProjectAccess } from './rehab.js';
