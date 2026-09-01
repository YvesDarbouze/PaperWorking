import { NextResponse } from 'next/server';
import { buildProjectsReadService } from '@/lib/api/handler-deps';
import { projectsReadErrorResponse } from '@/lib/api/project-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/projects — list projects visible to authenticated user. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? undefined;

  try {
    const result = await buildProjectsReadService().listProjects(user, q);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = projectsReadErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: message },
      { status: 500 },
    );
  }
}
