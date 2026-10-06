import { NextResponse } from 'next/server';
import {
  isDevAdminAuthFailure,
  requireDevAdminAuth,
} from '@/lib/admin/dev-admin-auth';
import {
  suspendUser,
  reactivateUser,
  sendVerificationEmail,
  resetUserPassword,
  type AdminUserActionType,
} from '@/lib/admin/user-action-store';

export async function POST(request: Request) {
  const auth = await requireDevAdminAuth(request);
  if (isDevAdminAuthFailure(auth)) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { userId, action } = body;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json(
      { error: 'userId is required and must be a string' },
      { status: 400 },
    );
  }

  const allowedActions: AdminUserActionType[] = [
    'suspend',
    'reactivate',
    'send_verification',
    'reset_password',
  ];

  if (!action || !allowedActions.includes(action)) {
    return NextResponse.json(
      { error: `Invalid action. Must be one of: ${allowedActions.join(', ')}` },
      { status: 400 },
    );
  }

  try {
    switch (action) {
      case 'suspend': {
        const result = await suspendUser(userId);
        return NextResponse.json(result, { status: 200 });
      }
      case 'reactivate': {
        const result = await reactivateUser(userId);
        return NextResponse.json(result, { status: 200 });
      }
      case 'send_verification': {
        const result = await sendVerificationEmail(userId);
        return NextResponse.json(result, { status: 200 });
      }
      case 'reset_password': {
        const result = await resetUserPassword(userId);
        return NextResponse.json(result, { status: 200 });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'User action failed';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
