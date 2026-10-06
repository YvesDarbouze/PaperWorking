import { NextResponse } from 'next/server';
import {
  isDevAdminAuthFailure,
  requireDevAdminAuth,
} from '@/lib/admin/dev-admin-auth';
import {
  retryDunningPayment,
  cancelDunningSubscription,
} from '@/lib/admin/subscription-store';

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

  const { dunningId, action } = body;

  if (!dunningId || typeof dunningId !== 'string') {
    return NextResponse.json(
      { error: 'dunningId is required and must be a string' },
      { status: 400 }
    );
  }

  if (action !== 'retry' && action !== 'cancel') {
    return NextResponse.json(
      { error: 'Invalid action. Must be "retry" or "cancel"' },
      { status: 400 }
    );
  }

  try {
    if (action === 'retry') {
      const result = await retryDunningPayment(dunningId);
      return NextResponse.json(result, { status: 200 });
    } else {
      const result = await cancelDunningSubscription(dunningId);
      return NextResponse.json(result, { status: 200 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Subscription operation failed';
    const status = message.includes('not found') ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
