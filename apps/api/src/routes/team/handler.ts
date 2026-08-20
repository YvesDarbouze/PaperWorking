import { jsonResponse, type RouteResult } from '../../http/response.js';
import type { RequireAuthFn } from '../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../lib/auth/auth-types.js';
import {
  countOtherActiveAdmins,
  isUserAdmin,
  validateTeamInviteBody,
  validateTeamRoleUpdateBody,
} from '../../lib/team/helpers.js';

export type LoadTeamContextFn = (uid: string) => Promise<{
  orgId: string;
  userData: Record<string, unknown>;
}>;

export type ListTeamMembersFn = (orgId: string) => Promise<{
  members: Array<Record<string, unknown>>;
  invites: Array<Record<string, unknown>>;
}>;

export type CreateTeamInviteFn = (input: {
  orgId: string;
  email: string;
  role: string;
  invitedBy: string;
}) => Promise<{ inviteId: string }>;

export type LoadTeamMemberFn = (
  memberId: string,
) => Promise<{ id: string; role?: string; status?: string } | null>;

export type ListOrgMembersForAdminCheckFn = (
  orgId: string,
) => Promise<Array<{ id: string; role?: string; status?: string }>>;

export type UpdateTeamMemberRoleFn = (memberId: string, role: string) => Promise<void>;
export type ReactivateTeamMemberFn = (memberId: string) => Promise<void>;
export type RemoveTeamMemberFn = (memberId: string, hardDelete: boolean) => Promise<void>;
export type CheckExistingMemberByEmailFn = (orgId: string, email: string) => Promise<boolean>;

export interface TeamHandlerDeps {
  requireAuth?: RequireAuthFn;
  loadContext?: LoadTeamContextFn;
  listMembers?: ListTeamMembersFn;
  createInvite?: CreateTeamInviteFn;
  loadMember?: LoadTeamMemberFn;
  listMembersForAdminCheck?: ListOrgMembersForAdminCheckFn;
  updateRole?: UpdateTeamMemberRoleFn;
  reactivateMember?: ReactivateTeamMemberFn;
  removeMember?: RemoveTeamMemberFn;
  checkExistingMember?: CheckExistingMemberByEmailFn;
}

/**
 * GET /api/team/*
 */
export async function handleTeamGet(
  actionPath: string[],
  deps: TeamHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const context = deps.loadContext
    ? await deps.loadContext(auth.uid)
    : { orgId: 'org_placeholder', userData: {} };

  if (actionPath.length === 1 && actionPath[0] === 'members') {
    if (!context.orgId || context.orgId === 'org_placeholder') {
      return jsonResponse(200, { members: [], invites: [] });
    }
    const listed = deps.listMembers
      ? await deps.listMembers(context.orgId)
      : { members: [], invites: [] };
    return jsonResponse(200, listed);
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}

/**
 * POST /api/team/*
 */
export async function handleTeamPost(
  actionPath: string[],
  body: Record<string, unknown>,
  deps: TeamHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const context = deps.loadContext
    ? await deps.loadContext(auth.uid)
    : { orgId: 'org_placeholder', userData: {} };

  if (actionPath.length === 1 && actionPath[0] === 'invite') {
    const validated = validateTeamInviteBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const exists = deps.checkExistingMember
      ? await deps.checkExistingMember(context.orgId, validated.email)
      : false;
    if (exists) {
      return jsonResponse(400, { error: 'This user is already a member.' });
    }

    const invitedBy =
      String(context.userData.displayName || context.userData.email || 'Admin');
    const invite = deps.createInvite
      ? await deps.createInvite({
          orgId: context.orgId,
          email: validated.email,
          role: validated.role,
          invitedBy,
        })
      : { inviteId: `invite_${Date.now()}` };

    return jsonResponse(200, { success: true, inviteId: invite.inviteId });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}

/**
 * PUT /api/team/*
 */
export async function handleTeamPut(
  actionPath: string[],
  body: Record<string, unknown>,
  deps: TeamHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const context = deps.loadContext
    ? await deps.loadContext(auth.uid)
    : { orgId: 'org_placeholder', userData: {} };

  if (actionPath.length === 3 && actionPath[0] === 'members' && actionPath[2] === 'role') {
    const memberId = actionPath[1];
    const validated = validateTeamRoleUpdateBody(body);
    if (!validated.ok) return jsonResponse(validated.status, { error: validated.error });

    const callerRole = String(context.userData.role || '');
    const target = deps.loadMember ? await deps.loadMember(memberId) : { id: memberId, role: 'Contributor' };
    if (!target) return jsonResponse(404, { error: 'User not found' });

    if (memberId === auth.uid && isUserAdmin(callerRole) && !isUserAdmin(validated.role)) {
      return jsonResponse(403, { error: 'Transfer ownership before downgrading yourself.' });
    }

    if (isUserAdmin(target.role) && !isUserAdmin(validated.role)) {
      const members = deps.listMembersForAdminCheck
        ? await deps.listMembersForAdminCheck(context.orgId)
        : [];
      if (countOtherActiveAdmins(members, memberId) === 0) {
        return jsonResponse(403, {
          error: 'You must assign another Admin before removing this user.',
        });
      }
    }

    if (deps.updateRole) await deps.updateRole(memberId, validated.role);
    return jsonResponse(200, { success: true });
  }

  if (actionPath.length === 3 && actionPath[0] === 'members' && actionPath[2] === 'reactivate') {
    const memberId = actionPath[1];
    if (deps.reactivateMember) await deps.reactivateMember(memberId);
    return jsonResponse(200, { success: true });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}

/**
 * DELETE /api/team/*
 */
export async function handleTeamDelete(
  actionPath: string[],
  query: { hard?: string | null },
  deps: TeamHandlerDeps = {},
): Promise<RouteResult> {
  if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
  const auth = await deps.requireAuth();
  if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

  const context = deps.loadContext
    ? await deps.loadContext(auth.uid)
    : { orgId: 'org_placeholder', userData: {} };
  const hardDelete = query.hard === 'true';

  if (actionPath.length === 2 && actionPath[0] === 'members') {
    const memberId = actionPath[1];
    const target = deps.loadMember ? await deps.loadMember(memberId) : { id: memberId, role: 'Contributor' };
    if (!target) return jsonResponse(404, { error: 'User not found' });

    if (isUserAdmin(target.role)) {
      const members = deps.listMembersForAdminCheck
        ? await deps.listMembersForAdminCheck(context.orgId)
        : [];
      if (countOtherActiveAdmins(members, memberId) === 0) {
        return jsonResponse(403, {
          error: 'You must assign another Admin before removing this user.',
        });
      }
    }

    if (deps.removeMember) await deps.removeMember(memberId, hardDelete);
    return jsonResponse(200, { success: true });
  }

  return jsonResponse(404, { error: 'Endpoint not found' });
}
