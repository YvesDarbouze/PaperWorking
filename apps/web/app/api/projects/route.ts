import { NextResponse } from 'next/server';
import { buildProjectsCommandService, buildProjectsReadService } from '@/lib/api/handler-deps';
import { projectsCommandErrorResponse, projectsReadErrorResponse } from '@/lib/api/project-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { CreateProjectInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

function parseCreateBody(body: unknown): CreateProjectInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  return {
    name: typeof record.name === 'string' ? record.name : undefined,
    propertyName: typeof record.propertyName === 'string' ? record.propertyName : undefined,
    address: typeof record.address === 'string' ? record.address : undefined,
    city: typeof record.city === 'string' ? record.city : undefined,
    state: typeof record.state === 'string' ? record.state : undefined,
    zip: typeof record.zip === 'string' ? record.zip : undefined,
    purchasePrice:
      typeof record.purchasePrice === 'number' ? record.purchasePrice : undefined,
    organizationId:
      typeof record.organizationId === 'string' ? record.organizationId : undefined,
  };
}

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

/** POST /api/projects — create project for authorized user. */
export async function POST(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await buildProjectsCommandService().createProject(user, parseCreateBody(body));
    return NextResponse.json(result);
  } catch (error) {
    const mapped = projectsCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create project', details: message },
      { status: 500 },
    );
  }
}
