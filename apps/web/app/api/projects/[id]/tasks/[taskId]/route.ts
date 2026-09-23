import { NextResponse } from 'next/server';
import { isRecord, updateProjectSubresource } from '@/lib/projects/project-subresource';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

const PATCHABLE_TASK_FIELDS = [
  'title',
  'description',
  'status',
  'assignedTo',
  'assigneeName',
  'assignedToUid',
  'assigneeUid',
  'dueDate',
  'linkedContingencyId',
] as const;

/** PATCH /api/projects/[id]/tasks/[taskId] — update assignment or status. */
export async function PATCH(request: Request, context: RouteContext) {
  const { id, taskId } = await context.params;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const result = await updateProjectSubresource(request, id, (current) => {
    const tasks = Array.isArray(current.tasks) ? current.tasks : [];
    let found = false;

    const updated = tasks.map((item) => {
      if (!isRecord(item) || item.id !== taskId) return item;
      found = true;
      const next: Record<string, unknown> = { ...item, updatedAt: new Date().toISOString() };
      for (const key of PATCHABLE_TASK_FIELDS) {
        if (body[key] !== undefined) next[key] = body[key];
      }
      if (next.status === 'complete' && !next.completedAt) {
        next.completedAt = new Date().toISOString();
      }
      return next;
    });

    return found ? { tasks: updated } : null;
  });

  if (!result.ok) return result.response;

  const tasks = Array.isArray(result.project.tasks) ? result.project.tasks : [];
  const task = tasks.find((item) => isRecord(item) && item.id === taskId) ?? null;

  return NextResponse.json({ success: true, task });
}
