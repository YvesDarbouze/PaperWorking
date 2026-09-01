import { NextResponse } from 'next/server';
import { profileErrorResponse } from '@/lib/api/profile-route-errors';
import {
  buildProfileCommandService,
  buildProfileReadService,
} from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/settings/profile — self-scoped profile read from Neon. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await buildProfileReadService().getProfile(user);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = profileErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load profile', details: message }, { status: 500 });
  }
}

/** PUT /api/settings/profile — allowlisted profile field update. */
export async function PUT(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  try {
    const result = await buildProfileCommandService().updateProfile(user, body);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = profileErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update profile', details: message }, { status: 500 });
  }
}
