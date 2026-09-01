import { NextResponse } from 'next/server';
import { buildInboxCommandService } from '@/lib/api/handler-deps';
import { inboxCommandErrorResponse } from '@/lib/api/inbox-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { InboxPatchInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function parsePatchBody(body: unknown): InboxPatchInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  const input: InboxPatchInput = {};
  if (typeof record.read === 'boolean') input.read = record.read;
  if (typeof record.archived === 'boolean') input.archived = record.archived;
  if (typeof record.title === 'string') input.title = record.title;
  if (typeof record.body === 'string') input.body = record.body;
  if (typeof record.href === 'string') input.href = record.href;
  return input;
}

/** PATCH /api/inbox/[id] — update owned inbox item (read/archive/content). */
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

  try {
    const result = await buildInboxCommandService().updateInboxItem(user, id, parsePatchBody(body));
    return NextResponse.json(result);
  } catch (error) {
    const mapped = inboxCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update inbox item', details: message },
      { status: 500 },
    );
  }
}

/** DELETE /api/inbox/[id] — delete owned inbox item. */
export async function DELETE(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await buildInboxCommandService().deleteInboxItem(user, id);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = inboxCommandErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete inbox item', details: message },
      { status: 500 },
    );
  }
}
