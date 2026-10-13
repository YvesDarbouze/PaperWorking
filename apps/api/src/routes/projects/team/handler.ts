import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { requireOrgRole, recordAuthzAuditEvent } from '../../../lib/auth/require-role.js';

export interface ProjectTeamDeps {
  requireAuth?: RequireAuthFn;
  getProject?: (projectId: string) => Promise<{ id: string; organizationId?: string; teamMembers?: any[] } | null>;
  addTeamMember?: (projectId: string, memberData: any) => Promise<any>;
}

export async function handleProjectTeamGet(
  projectId: string,
  deps: ProjectTeamDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

    if (!deps.getProject) return jsonResponse(500, { error: 'Project getter not configured' });
    const project = await deps.getProject(projectId);
    if (!project) return jsonResponse(404, { error: 'Project not found' });

    // AuthZ
    const userOrg = (auth as any).organizationId;
    if (project.organizationId && userOrg && project.organizationId !== userOrg) {
      return jsonResponse(403, { error: 'Forbidden' });
    }
    if (project.organizationId) {
      const roleCheck = await requireOrgRole(auth, project.organizationId, 'viewer');
      if (!roleCheck.ok) return jsonResponse(roleCheck.status, roleCheck.body);
    }

    return jsonResponse(200, {
      projectId,
      teamMembers: project.teamMembers ?? [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to fetch team members', details: message });
  }
}

export async function handleProjectTeamPost(
  projectId: string,
  body: unknown,
  deps: ProjectTeamDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) return jsonResponse(500, { error: 'Auth not configured' });
    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) return jsonResponse(auth.status, auth.body);

    if (!deps.getProject) return jsonResponse(500, { error: 'Project getter not configured' });
    const project = await deps.getProject(projectId);
    if (!project) return jsonResponse(404, { error: 'Project not found' });

    // AuthZ
    const userOrg = (auth as any).organizationId;
    if (project.organizationId && userOrg && project.organizationId !== userOrg) {
      return jsonResponse(403, { error: 'Forbidden' });
    }
    let callerRole = 'admin';
    if (project.organizationId) {
      const roleCheck = await requireOrgRole(auth, project.organizationId, 'admin');
      if (!roleCheck.ok) return jsonResponse(roleCheck.status, roleCheck.body);
      callerRole = roleCheck.role;
    }

    if (!body || typeof body !== 'object') {
      return jsonResponse(400, { error: 'Invalid request body' });
    }

    const payload = body as Record<string, any>;
    if (!payload.name || !payload.role) {
      return jsonResponse(400, { error: 'name and role are required' });
    }

    if (!deps.addTeamMember) {
      return jsonResponse(500, { error: 'Team member adder not configured' });
    }

    const created = await deps.addTeamMember(projectId, {
      ...payload,
      isExternal: Boolean(payload.isExternal),
    });

    if (project.organizationId) {
      await recordAuthzAuditEvent({
        organizationId: project.organizationId,
        projectId,
        actorUid: auth.uid,
        actorRole: callerRole,
        action: 'member.invited',
        targetType: 'team_member',
        targetId: created?.id || payload.name,
        metadata: { name: payload.name, role: payload.role },
      }).catch(() => undefined);
    }

    return jsonResponse(201, {
      success: true,
      projectId,
      member: created,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to add team member', details: message });
  }
}
