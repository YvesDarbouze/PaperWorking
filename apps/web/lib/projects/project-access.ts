import { NextResponse } from 'next/server';
import type { ZodType, ZodTypeDef } from 'zod';
import { normalizeToStructuredError, type OrgRole } from '@paperworking/shared';
import { isDevAuthFailure, requireDevSessionAuth } from './dev-session-auth';
import { requireWebOrgRole } from '@/lib/auth/require-role';
import { getProjectFromStore } from './project-store';
import type {
  AcquisitionTask,
  ProjectActivityEntry,
  ProjectCardColumn,
  ProjectGuestAccess,
  ProjectMessageTopic,
  ProjectScheduleEvent,
  ProjectTaskList,
  ProjectWorkspace,
} from './types';

export type ProjectTeamAccess = {
  ok: true;
  kind: 'team';
  role: OrgRole;
  uid: string;
  project: ProjectWorkspace;
};

export type ProjectGuestAccessGrant = {
  ok: true;
  kind: 'guest';
  uid: string;
  project: ProjectWorkspace;
  guest: ProjectGuestAccess;
};

export type ProjectAccess = ProjectTeamAccess | ProjectGuestAccessGrant;
export type ProjectAccessResult = ProjectAccess | { ok: false; response: NextResponse };

/** Structured error envelope, same shape as requireWebOrgRole failures. */
export function projectApiError(
  status: number,
  message: string,
  code?: string,
  extra: Record<string, unknown> = {},
): NextResponse {
  const structured = normalizeToStructuredError(message, status, undefined, code);
  return NextResponse.json({ ...structured, code: structured.error.code, ...extra }, { status });
}

export function guestForbidden(): NextResponse {
  return projectApiError(403, 'Forbidden: this tool is available to the project team only', 'FORBIDDEN_GUEST_ACCESS');
}

/**
 * Decides whether the caller is on the project team (org member with at least
 * `minTeamRole`), an invited guest, or neither. Guests are returned regardless
 * of `minTeamRole`; each route decides what a guest may do.
 */
export async function resolveProjectAccess(
  projectId: string,
  minTeamRole: OrgRole,
): Promise<ProjectAccessResult> {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return { ok: false, response: NextResponse.json(auth.body, { status: auth.status }) };
  }

  const project = await getProjectFromStore(projectId);
  if (!project) {
    return { ok: false, response: projectApiError(404, 'Project not found', 'NOT_FOUND') };
  }

  const projectOrg = project.organizationId || 'org-1';

  // Project owners/creators retain full access regardless of roster drift.
  const ownerFields = project as { ownerId?: string; ownerUid?: string; creatorId?: string };
  const isOwner =
    ownerFields.ownerId === auth.uid ||
    ownerFields.ownerUid === auth.uid ||
    ownerFields.creatorId === auth.uid;
  if (isOwner) {
    return { ok: true, kind: 'team', role: 'owner', uid: auth.uid, project };
  }

  const membership = await requireWebOrgRole({ uid: auth.uid }, projectOrg, 'viewer');
  if (membership.ok) {
    if (minTeamRole !== 'viewer') {
      const elevated = await requireWebOrgRole({ uid: auth.uid }, projectOrg, minTeamRole);
      if (!elevated.ok) return { ok: false, response: elevated.response };
    }
    return { ok: true, kind: 'team', role: membership.role, uid: auth.uid, project };
  }

  const guest = (project.vendorAccess ?? []).find((g) => g.uid === auth.uid);
  if (guest) {
    return { ok: true, kind: 'guest', uid: auth.uid, project, guest };
  }

  return { ok: false, response: membership.response };
}

/** Parses a JSON body against a zod schema; invalid JSON or input becomes a structured 400. */
export async function parseProjectBody<T>(
  request: Request,
  schema: ZodType<T, ZodTypeDef, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: projectApiError(400, 'Request body must be valid JSON', 'VALIDATION_ERROR') };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    const first = issues[0];
    const message = first ? `Invalid ${first.path || 'request'}: ${first.message}` : 'Invalid request body';
    return { ok: false, response: projectApiError(400, message, 'VALIDATION_ERROR', { issues }) };
  }
  return { ok: true, data: parsed.data };
}

export function newProjectItemId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ── Authors ────────────────────────────────────────────────────────────────

export interface ProjectActorIdentity {
  id: string;
  name: string;
  role: string;
}

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const GUEST_TYPE_LABELS: Record<NonNullable<ProjectGuestAccess['guestType']>, string> = {
  vendor: 'Vendor',
  lender: 'Lender',
  title: 'Title',
  limited_partner: 'Limited Partner',
  other: 'Guest',
};

/**
 * Display identity for the authenticated caller, never from the request body.
 * Order: project team member, phase assignee, guest record, neutral fallback.
 */
export function resolveActorIdentity(access: ProjectAccess): ProjectActorIdentity {
  const { project, uid } = access;
  const member = (project.teamMembers ?? []).find(
    (m: { uid?: string; id?: string }) => m && (m.uid === uid || m.id === uid),
  ) as { name?: string; role?: string } | undefined;
  if (member?.name) {
    return { id: uid, name: member.name, role: member.role || teamRoleLabel(access) };
  }

  const assignee = Object.values(project.phaseAssignees ?? {}).find((a) => a && (a.uid === uid || a.id === uid));
  if (assignee?.name) {
    return { id: uid, name: assignee.name, role: assignee.role || teamRoleLabel(access) };
  }

  if (access.kind === 'guest') {
    const label = GUEST_TYPE_LABELS[access.guest.guestType ?? 'other'];
    return {
      id: uid,
      name: access.guest.name,
      role: access.guest.company ? `${label}, ${access.guest.company}` : label,
    };
  }

  return { id: uid, name: 'Unknown member', role: teamRoleLabel(access) };
}

function teamRoleLabel(access: ProjectAccess): string {
  return access.kind === 'team' ? ROLE_LABELS[access.role] ?? 'Member' : 'Guest';
}

// ── Guest filters (pure) ───────────────────────────────────────────────────

export function filterTopicsForGuest(topics: ProjectMessageTopic[]): ProjectMessageTopic[] {
  return topics.filter((t) => t.vendorVisible === true);
}

export function filterTasksForGuest(tasks: AcquisitionTask[]): AcquisitionTask[] {
  return tasks.filter((t) => t.vendorVisible === true);
}

/** Lists are shown to guests only when they contain at least one shared task. */
export function filterTaskListsForGuest(lists: ProjectTaskList[], visibleTasks: AcquisitionTask[]): ProjectTaskList[] {
  const listIds = new Set(visibleTasks.map((t) => t.listId).filter(Boolean));
  return lists.filter((l) => listIds.has(l.id));
}

export function filterCardColumnsForGuest(columns: ProjectCardColumn[]): ProjectCardColumn[] {
  return columns.map((c) => ({ ...c, cards: (c.cards ?? []).filter((card) => card.vendorVisible === true) }));
}

export function filterScheduleForGuest(events: ProjectScheduleEvent[]): ProjectScheduleEvent[] {
  return events.filter((e) => e.vendorVisible === true);
}

export function filterActivityForGuest(entries: ProjectActivityEntry[]): ProjectActivityEntry[] {
  return entries.filter((e) => e.vendorVisible === true);
}
