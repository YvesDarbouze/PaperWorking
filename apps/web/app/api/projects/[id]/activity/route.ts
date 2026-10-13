import { NextResponse } from 'next/server';
import { filterActivityForGuest, resolveProjectAccess } from '@/lib/projects/project-access';

/** Newest-first activity log. Guests see only entries about items shared with guests. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await context.params;
  const access = await resolveProjectAccess(projectId, 'viewer');
  if (!access.ok) return access.response;

  const activity = access.project.activity ?? [];
  return NextResponse.json({
    activity: access.kind === 'guest' ? filterActivityForGuest(activity) : activity,
  });
}
