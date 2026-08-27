import { NextResponse } from 'next/server';
import {
  createTaskAssignment,
  TASK_ASSIGNMENTS,
} from '@/lib/membership/seed-store';
import {
  isDevAuthFailure,
  requireDevSessionAuth,
} from '@/lib/projects/dev-session-auth';

/**
 * GET /api/task-assignments?projectId=&assigneeId=
 */
export async function GET(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');
  const assigneeId = url.searchParams.get('assigneeId');

  const tasks = TASK_ASSIGNMENTS.filter((t) => {
    if (projectId && t.projectId !== projectId) return false;
    if (assigneeId && t.assigneeId !== assigneeId) return false;
    return true;
  });

  return NextResponse.json({
    success: true,
    collection: 'taskAssignments',
    count: tasks.length,
    tasks,
  });
}

/**
 * POST /api/task-assignments — alias for assign flow writing taskAssignments SoT.
 */
export async function POST(request: Request) {
  const auth = await requireDevSessionAuth();
  if (isDevAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: {
    taskId?: string;
    title?: string;
    assigneeUid?: string;
    projectId?: string | null;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.assigneeUid) {
    return NextResponse.json({ error: 'assigneeUid is required' }, { status: 400 });
  }

  const assignmentId = createTaskAssignment({
    taskId: body.taskId ?? `task_${Date.now()}`,
    assigneeUid: body.assigneeUid,
    projectId: body.projectId ?? null,
    assignedBy: auth.uid,
    title: body.title,
  });

  return NextResponse.json({ success: true, assignmentId });
}
