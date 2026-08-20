import { jsonResponse, type RouteResult } from '../../../../http/response.js';
import type { RequireAuthFn } from '../../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../../lib/auth/auth-types.js';
import { canReadReilProject, canWriteReilProject } from '../../../../lib/reil/access.js';
import {
  validateReilAssignmentBody,
  validateReilStatusBody,
  validateReilTermsBody,
  validateReilInviteBody,
} from '../../../../lib/reil/validation.js';
import { validateAssignmentStatusPatch } from '../../../../lib/projects/hold-registry.js';
import type { GetReilProjectFn } from '../handler.js';

export type ListFieldAssignmentsFn = (projectId: string) => Promise<Array<Record<string, unknown>>>;
export type UpsertFieldAssignmentFn = (
  projectId: string,
  fieldKey: string,
  assignedToId: string,
  assignedById: string,
) => Promise<Record<string, unknown>>;
export type PatchFieldAssignmentFn = (
  assignmentId: string,
  status: 'OPEN' | 'FILLED',
) => Promise<Record<string, unknown>>;
export type ListStatusEventsFn = (projectId: string) => Promise<Array<Record<string, unknown>>>;
export type CreateStatusEventFn = (
  projectId: string,
  status: string,
  uid: string,
  note: string | null,
) => Promise<Record<string, unknown>>;
export type GetPurchaseTermsFn = (projectId: string) => Promise<Record<string, unknown> | null>;
export type UpsertPurchaseTermsFn = (
  projectId: string,
  data: Record<string, unknown>,
) => Promise<Record<string, unknown>>;
export type InviteCollaboratorFn = (
  projectId: string,
  email: string,
  inviterId: string,
  role: string,
) => Promise<Record<string, unknown>>;
export type SendInviteEmailFn = (input: {
  email: string;
  role: string;
  projectId: string;
  projectName: string;
}) => Promise<void>;

interface ReilProjectRouteDeps {
  requireAuth?: RequireAuthFn;
  getProject?: GetReilProjectFn;
}

/**
 * GET /api/reil/projects/[id]/assignments
 */
export async function handleReilProjectAssignmentsGet(
  projectId: string,
  deps: ReilProjectRouteDeps & { listAssignments?: ListFieldAssignmentsFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canReadReilProject(project as { createdById: string; collaborators?: Array<{ userId: string }> }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const assignments = deps.listAssignments ? await deps.listAssignments(projectId) : [];
  return jsonResponse(200, assignments);
}

/**
 * POST /api/reil/projects/[id]/assignments
 */
export async function handleReilProjectAssignmentsPost(
  projectId: string,
  body: Record<string, unknown>,
  deps: ReilProjectRouteDeps & { upsertAssignment?: UpsertFieldAssignmentFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canWriteReilProject(project as { createdById: string }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const validated = validateReilAssignmentBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error, issues: validated.issues });
  }

  const assignment = deps.upsertAssignment
    ? await deps.upsertAssignment(projectId, validated.fieldKey, validated.assignedToId, auth.uid)
    : { fieldKey: validated.fieldKey, assignedToId: validated.assignedToId };
  return jsonResponse(201, assignment);
}

/**
 * PATCH /api/reil/projects/[id]/assignments/[aid]
 */
export async function handleReilProjectAssignmentPatch(
  projectId: string,
  assignmentId: string,
  body: Record<string, unknown>,
  deps: ReilProjectRouteDeps & { patchAssignment?: PatchFieldAssignmentFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canReadReilProject(project as { createdById: string; collaborators?: Array<{ userId: string }> }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const validated = validateAssignmentStatusPatch(body);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  const updated = deps.patchAssignment
    ? await deps.patchAssignment(assignmentId, validated.status)
    : { id: assignmentId, status: validated.status };
  return jsonResponse(200, updated);
}

/**
 * GET /api/reil/projects/[id]/status
 */
export async function handleReilProjectStatusGet(
  projectId: string,
  deps: ReilProjectRouteDeps & { listStatusEvents?: ListStatusEventsFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canReadReilProject(project as { createdById: string; collaborators?: Array<{ userId: string }> }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const events = deps.listStatusEvents ? await deps.listStatusEvents(projectId) : [];
  return jsonResponse(200, events);
}

/**
 * POST /api/reil/projects/[id]/status
 */
export async function handleReilProjectStatusPost(
  projectId: string,
  body: Record<string, unknown>,
  deps: ReilProjectRouteDeps & { createStatusEvent?: CreateStatusEventFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canWriteReilProject(project as { createdById: string }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const validated = validateReilStatusBody(body);
  if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

  const event = deps.createStatusEvent
    ? await deps.createStatusEvent(projectId, validated.status, auth.uid, validated.note)
    : { status: validated.status, note: validated.note };
  return jsonResponse(201, event);
}

/**
 * GET /api/reil/projects/[id]/terms
 */
export async function handleReilProjectTermsGet(
  projectId: string,
  deps: ReilProjectRouteDeps & { getTerms?: GetPurchaseTermsFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canReadReilProject(project as { createdById: string; collaborators?: Array<{ userId: string }> }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const terms = deps.getTerms ? await deps.getTerms(projectId) : {};
  return jsonResponse(200, terms);
}

/**
 * POST /api/reil/projects/[id]/terms
 */
export async function handleReilProjectTermsPost(
  projectId: string,
  body: Record<string, unknown>,
  deps: ReilProjectRouteDeps & { upsertTerms?: UpsertPurchaseTermsFn } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canWriteReilProject(project as { createdById: string }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const validated = validateReilTermsBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error, issues: validated.issues });
  }

  const saved = deps.upsertTerms
    ? await deps.upsertTerms(projectId, validated.data)
    : validated.data;
  return jsonResponse(200, saved);
}

/**
 * POST /api/reil/projects/[id]/invite
 */
export async function handleReilProjectInvitePost(
  projectId: string,
  body: Record<string, unknown>,
  deps: ReilProjectRouteDeps & {
    inviteCollaborator?: InviteCollaboratorFn;
    sendInviteEmail?: SendInviteEmailFn;
  } = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const project = deps.getProject ? await deps.getProject(projectId) : null;
  if (!project) return jsonResponse(404, { error: 'Not found' });
  if (!canWriteReilProject(project as { createdById: string }, auth.uid)) {
    return jsonResponse(403, { error: 'Forbidden' });
  }

  const validated = validateReilInviteBody(body);
  if (!validated.ok) {
    return jsonResponse(validated.status, { error: validated.error, issues: validated.issues });
  }

  const collaborator = deps.inviteCollaborator
    ? await deps.inviteCollaborator(projectId, validated.email, auth.uid, validated.role)
    : { email: validated.email, role: validated.role };

  if (deps.sendInviteEmail) {
    const projectName = String(project.displayName ?? project.addressLine ?? 'a project');
    await deps.sendInviteEmail({
      email: validated.email,
      role: validated.role,
      projectId,
      projectName,
    }).catch(() => undefined);
  }

  return jsonResponse(201, { collaborator, invited: validated.email });
}
