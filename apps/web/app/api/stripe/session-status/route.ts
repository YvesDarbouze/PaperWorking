import { NextResponse } from 'next/server';
import { billingErrorResponse } from '@/lib/api/billing-route-errors';
import { buildBillingCheckoutService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/stripe/session-status — verify checkout session ownership. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessionId = new URL(request.url).searchParams.get('session_id') ?? undefined;

  try {
    const result = await buildBillingCheckoutService().getSessionStatus(user, sessionId);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = billingErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to verify checkout session', details: message },
      { status: 500 },
    );
  }
}
