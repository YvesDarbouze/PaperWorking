import { NextResponse } from 'next/server';
import { buildProjectsCommandService, buildProjectsReadService } from '@/lib/api/handler-deps';
import { projectsCommandErrorResponse, projectsReadErrorResponse } from '@/lib/api/project-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import { getProjectFromStore } from '@/lib/projects/project-store';
import type { UpdateProjectInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Collections owned by dedicated routes (validated, activity-logged). A
 * whole-project PATCH from a stale client must not overwrite them.
 */
const ROUTE_OWNED_COLLECTIONS = [
  'messageTopics',
  'campfireMessages',
  'checkInQuestions',
  'taskLists',
  'cardColumns',
  'hillChartItems',
  'scheduleEvents',
  'vendorAccess',
  'activity',
  'documents',
] as const;


function parsePatchBody(body: unknown): UpdateProjectInput {
  if (!body || typeof body !== 'object') return {};
  return body as UpdateProjectInput;
}

/** GET /api/projects/[id] — project detail for authorized user. */
export async function GET(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await buildProjectsReadService().getProjectDetail(user, id);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = projectsReadErrorResponse(error);
    if (mapped) return mapped;
    // Store fallback keeps the route available when the read service is offline.
    try {
      const stored = await getProjectFromStore(id);
      if (stored) {
        return NextResponse.json({ success: true, project: stored });
      }
    } catch {
      // fall through to structured error
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch project', details: message },
      { status: 500 },
    );
  }
}

/** PATCH /api/projects/[id] — update project fields for authorized user. */
export async function PATCH(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const sanitizedBody: Record<string, unknown> = { ...(body as Record<string, unknown>) };
  for (const key of ROUTE_OWNED_COLLECTIONS) delete sanitizedBody[key];

  try {
    const result = await buildProjectsCommandService().updateProject(
      user,
      id,
      parsePatchBody(sanitizedBody),
    );
    return NextResponse.json(result);
  } catch (error) {
    const mapped = projectsCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update project', details: message },
      { status: 500 },
    );
  }
}
