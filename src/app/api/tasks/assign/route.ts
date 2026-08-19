import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/firebase-admin/auth-guard';
import { adminDb } from '@/lib/firebase/admin';

// POST /api/tasks/assign — Assign task to collaborator/vendor
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (isAuthError(auth)) return auth;
    const { uid } = auth;

    const userSnap = await adminDb.collection('users').doc(uid).get();
    const userData = userSnap.data();
    const accountType = userData?.accountType || userData?.account_type || 'investor';

    // BLOCKED for Investor (solo)
    if (accountType === 'investor' || accountType === 'standard') {
      return NextResponse.json(
        {
          error: 'Upgrade to Investment Team to assign tasks.',
          upgradeUrl: '/settings/upgrade?target=investment_team',
          message: 'Get this done faster. Upgrade to Investment Team and collaborate with vendors and team members.'
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { taskId, assigneeUid, projectId } = body || {};

    if (!taskId || !assigneeUid) {
      return NextResponse.json({ error: 'taskId and assigneeUid are required' }, { status: 400 });
    }

    // Record assignment
    const assignmentRef = adminDb.collection('taskAssignments').doc();
    await assignmentRef.set({
      id: assignmentRef.id,
      taskId,
      projectId: projectId || null,
      assignedBy: uid,
      assignedTo: assigneeUid,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, assignmentId: assignmentRef.id });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Task assignment failed', details: errMsg }, { status: 500 });
  }
}
