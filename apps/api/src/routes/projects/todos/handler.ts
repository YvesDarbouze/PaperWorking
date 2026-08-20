import { jsonResponse, type RouteResult } from '../../../http/response.js';
import { hasCrossTenantProjectAccess } from '../../../lib/projects/rehab.js';
import {
  validateTodoPermissionChanges,
  validateTodosUpdateBody,
} from '../../../lib/projects/todos.js';

export type VerifyIdTokenFn = (idToken: string) => Promise<{ uid: string; email?: string | null }>;
export type LoadProjectTodosContextFn = (
  projectId: string,
  uid: string,
) => Promise<{
  exists: boolean;
  organizationId?: string;
  actionItems?: Array<Record<string, unknown>>;
  projectTeam?: Array<{ email?: string; status?: string }>;
  profile?: Record<string, unknown> | null;
} | null>;
export type SaveProjectTodosFn = (projectId: string, todos: Array<Record<string, unknown>>) => Promise<void>;

export interface ProjectsTodosPostDeps {
  verifyIdToken?: VerifyIdTokenFn;
  loadContext?: LoadProjectTodosContextFn;
  saveTodos?: SaveProjectTodosFn;
  isE2eTest?: boolean;
}

/**
 * POST /api/projects/todos
 */
export async function handleProjectsTodosPost(
  body: Record<string, unknown>,
  deps: ProjectsTodosPostDeps = {},
): Promise<RouteResult> {
  const validated = validateTodosUpdateBody(body);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  if (!deps.verifyIdToken) return jsonResponse(500, { error: 'Auth not configured' });

  try {
    const decoded = await deps.verifyIdToken(String(body.idToken));
    const context = deps.loadContext
      ? await deps.loadContext(validated.projectId, decoded.uid)
      : {
          exists: true,
          organizationId: 'org-1',
          actionItems: [],
          profile: {},
        };

    if (!context?.exists && !deps.isE2eTest) {
      return jsonResponse(404, { error: 'Deal not found.' });
    }

    if (!context?.profile && !deps.isE2eTest) {
      return jsonResponse(404, { error: 'User profile not found.' });
    }

    const hasAccess =
      deps.isE2eTest ||
      hasCrossTenantProjectAccess(context?.profile, context?.organizationId);
    if (!hasAccess) {
      return jsonResponse(403, { error: 'Cross-tenant access denied.' });
    }

    const permission = validateTodoPermissionChanges({
      currentActionItems: (context?.actionItems || []) as Array<{
        id: string;
        completed?: boolean;
        assignee?: string;
      }>,
      proposedTodos: validated.todos,
      profile: context?.profile || {},
      userEmail: String(context?.profile?.email || decoded.email || ''),
      projectTeam: context?.projectTeam,
    });
    if (!permission.ok) return jsonResponse(permission.status, { error: permission.error });

    if (deps.saveTodos) {
      await deps.saveTodos(validated.projectId, validated.todos as Array<Record<string, unknown>>);
    }

    return jsonResponse(200, { success: true });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'auth/id-token-expired') {
      return jsonResponse(401, { error: 'Session expired.' });
    }
    console.error('[Action Items Update] Error:', error);
    return jsonResponse(500, {
      error: 'Failed to update action items.',
      details: err.message || 'Unknown error',
    });
  }
}
