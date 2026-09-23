import { NextResponse } from 'next/server';
import { isRecord, updateProjectSubresource } from '@/lib/projects/project-subresource';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** PUT /api/projects/[id]/earnest-money — merge earnest money terms. */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const result = await updateProjectSubresource(request, id, (current) => {
    const existing = isRecord(current.earnestMoney) ? current.earnestMoney : {};
    return {
      earnestMoney: {
        ...existing,
        ...body,
        updatedAt: new Date().toISOString(),
      },
    };
  });

  if (!result.ok) return result.response;

  return NextResponse.json({ success: true, earnestMoney: result.project.earnestMoney ?? null });
}
