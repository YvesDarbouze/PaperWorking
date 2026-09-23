import { NextResponse } from 'next/server';
import { buildProjectsCommandService, buildProjectsReadService } from '@/lib/api/handler-deps';
import { projectsReadErrorResponse } from '@/lib/api/project-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export type ProjectSubresourceResult =
  | { ok: true; project: Record<string, unknown> }
  | { ok: false; response: NextResponse };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Shared read → merge → patch flow for project sub-resource routes
 * (tasks, contingencies, earnest money). RBAC/ACL is enforced by the shared
 * projects services; `buildPatch` returns `null` to signal "not found".
 */
export async function updateProjectSubresource(
  request: Request,
  projectId: string,
  buildPatch: (current: Record<string, unknown>) => Record<string, unknown> | null,
): Promise<ProjectSubresourceResult> {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  try {
    const { project } = await buildProjectsReadService().getProjectDetail(user, projectId);
    const current = project as unknown as Record<string, unknown>;

    const patch = buildPatch(current);
    if (!patch) {
      return { ok: false, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
    }

    const result = await buildProjectsCommandService().updateProject(user, projectId, patch);
    return { ok: true, project: result.project as unknown as Record<string, unknown> };
  } catch (error) {
    const mapped = projectsReadErrorResponse(error);
    if (mapped) return { ok: false, response: mapped };
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Failed to update project', details: message },
        { status: 500 },
      ),
    };
  }
}
