import { jsonResponse, type RouteResult } from '../../../http/response.js';
import type { RequireAuthFn } from '../../../lib/auth/auth-types.js';
import { isAuthFailure } from '../../../lib/auth/auth-types.js';
import { computeContingencyAlerts, type ContingencyAlert } from '../../../lib/reil/acquisition-state-machine.js';

export type GetProjectForAlertsFn = (projectId: string) => Promise<{
  id: string;
  organizationId?: string;
  userId?: string;
  contingencies?: Array<{
    id: string;
    name: string;
    deadlineDate: string | Date;
    status: string;
  }>;
} | null>;

export interface ProjectAlertsGetDeps {
  requireAuth?: RequireAuthFn;
  getProject?: GetProjectForAlertsFn;
}

/**
 * GET /api/projects/:id/alerts
 * Computes progressive hard-date alerts (72h notice, 48h warning, 24h critical modal barrier)
 * with multi-tenant AuthZ.
 */
export async function handleProjectAlertsGet(
  projectId: string,
  deps: ProjectAlertsGetDeps = {},
): Promise<RouteResult> {
  try {
    if (!deps.requireAuth) {
      return jsonResponse(500, { error: 'Auth not configured' });
    }

    const auth = await deps.requireAuth();
    if (isAuthFailure(auth)) {
      return jsonResponse(auth.status, auth.body);
    }

    if (!deps.getProject) {
      return jsonResponse(500, { error: 'Project getter not configured' });
    }

    const project = await deps.getProject(projectId);
    if (!project) {
      return jsonResponse(404, { error: 'Project not found' });
    }

    // Tenant / Team AuthZ check
    const userOrg = (auth as any).organizationId;
    if (project.organizationId && userOrg && project.organizationId !== userOrg) {
      return jsonResponse(403, { error: 'Forbidden: You do not have permission to view alerts for this project.' });
    }

    const rawContingencies = project.contingencies ?? [];
    const normalizedContingencies = rawContingencies.map((c: any) => ({
      id: c.id,
      name: c.name ?? c.label ?? 'Contingency',
      deadlineDate: c.deadlineDate
        ? (c.deadlineDate instanceof Date ? c.deadlineDate.toISOString() : String(c.deadlineDate))
        : String(c.deadline ?? new Date().toISOString()),
      status: c.status as 'open' | 'satisfied' | 'waived' | 'terminated',
    }));

    const alerts = computeContingencyAlerts(normalizedContingencies);

    return jsonResponse(200, {
      projectId,
      alertsCount: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === 'critical_24h').length,
      warningCount: alerts.filter((a) => a.severity === 'warning_48h').length,
      noticeCount: alerts.filter((a) => a.severity === 'notice_72h').length,
      alerts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse(500, { error: 'Failed to compute project alerts', details: message });
  }
}
