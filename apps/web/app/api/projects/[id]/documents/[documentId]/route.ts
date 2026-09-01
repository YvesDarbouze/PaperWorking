import { NextResponse } from 'next/server';
import { buildProjectDocumentsReadService } from '@/lib/api/handler-deps';
import { projectsDocumentErrorResponse } from '@/lib/api/project-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; documentId: string }> };

/** GET /api/projects/[id]/documents/[documentId] — authorized download access. */
export async function GET(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, documentId } = await context.params;

  try {
    const result = await buildProjectDocumentsReadService().getDocumentAccess(
      user,
      id,
      documentId,
    );
    return NextResponse.json(result);
  } catch (error) {
    const mapped = projectsDocumentErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to access project document', details: message },
      { status: 500 },
    );
  }
}
