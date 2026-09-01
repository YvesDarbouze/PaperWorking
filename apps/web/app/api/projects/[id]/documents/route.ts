import { NextResponse } from 'next/server';
import {
  buildProjectDocumentsCommandService,
  buildProjectDocumentsReadService,
} from '@/lib/api/handler-deps';
import { projectsDocumentErrorResponse } from '@/lib/api/project-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/projects/[id]/documents — list project documents. */
export async function GET(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await buildProjectDocumentsReadService().listDocuments(user, id);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = projectsDocumentErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to list project documents', details: message },
      { status: 500 },
    );
  }
}

/** POST /api/projects/[id]/documents — multipart file upload. */
export async function POST(request: Request, context: RouteContext) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart form data' }, { status: 400 });
  }

  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await fileEntry.arrayBuffer());
    const result = await buildProjectDocumentsCommandService().uploadDocument(user, id, {
      fileName: fileEntry.name,
      mimeType: fileEntry.type || undefined,
      sizeBytes: fileEntry.size,
      data: buffer,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const mapped = projectsDocumentErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to upload project document', details: message },
      { status: 500 },
    );
  }
}
