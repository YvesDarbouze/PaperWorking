import { NextResponse } from 'next/server';
import { isRecord, updateProjectSubresource } from '@/lib/projects/project-subresource';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * PATCH /api/projects/[id]/contingencies — update status or record an
 * extension (new deadline + reason) for a single contingency.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const contingencyId = optionalString(body.contingencyId);
  if (!contingencyId) {
    return NextResponse.json({ error: 'contingencyId is required.' }, { status: 400 });
  }

  const status = optionalString(body.status);
  const newDeadline = optionalString(body.newDeadline);
  const reason = optionalString(body.reason);

  const result = await updateProjectSubresource(request, id, (current) => {
    const contingencies = Array.isArray(current.contingencies) ? current.contingencies : [];
    let found = false;

    const updated = contingencies.map((item) => {
      if (!isRecord(item) || item.id !== contingencyId) return item;
      found = true;
      const next: Record<string, unknown> = { ...item, updatedAt: new Date().toISOString() };

      if (status) next.status = status;
      if (newDeadline) {
        const history = Array.isArray(item.extensionHistory) ? item.extensionHistory : [];
        next.deadline = newDeadline;
        next.extensionHistory = [
          ...history,
          {
            extensionId: crypto.randomUUID(),
            previousDeadline: typeof item.deadline === 'string' ? item.deadline : newDeadline,
            newDeadline,
            reason: reason ?? 'Extension requested',
            requestedAt: new Date().toISOString(),
            approvedBySeller: false,
          },
        ];
      }
      return next;
    });

    return found ? { contingencies: updated } : null;
  });

  if (!result.ok) return result.response;

  return NextResponse.json({
    success: true,
    contingencies: result.project.contingencies ?? [],
  });
}
