import { NextResponse } from 'next/server';
import { normalizeToStructuredError } from '@paperworking/shared';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';
import {
  getProjectDraft,
  saveProjectDraft,
  deleteProjectDraft,
  type DraftProjectData,
} from '@/lib/projects/drafts-store';

export async function GET() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const draft = getProjectDraft(auth.uid);
  return NextResponse.json({ draft });
}

export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  try {
    const body = (await request.json()) as Partial<DraftProjectData>;
    const updated = saveProjectDraft(auth.uid, body);
    return NextResponse.json({ draft: updated });
  } catch (error) {
    const structured = normalizeToStructuredError('Invalid draft payload', 400);
    return NextResponse.json(structured, { status: 400, headers: { 'X-Trace-Id': structured.error.traceId } });
  }
}

export async function DELETE() {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  deleteProjectDraft(auth.uid);
  return NextResponse.json({ success: true });
}
