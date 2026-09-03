import { NextResponse } from 'next/server';
import { reportsErrorResponse } from '@/lib/api/reports-route-errors';
import { buildReportsGenerateService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** POST /api/reports/generate — live Firestore portfolio PDF/CSV export. */
export async function POST(request: Request) {
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
    const result = await buildReportsGenerateService().generateExport(user, body);
    const bodyInit =
      typeof result.body === 'string'
        ? result.body
        : new Uint8Array(result.body);
    return new NextResponse(bodyInit, {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    const mapped = reportsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
