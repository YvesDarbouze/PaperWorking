import { NextResponse } from 'next/server';
import { billingErrorResponse } from '@/lib/api/billing-route-errors';
import { buildBillingPortalService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** POST /api/stripe/portal — create Stripe Customer Portal session. */
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
    const result = await buildBillingPortalService().createPortalSession(user, body);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = billingErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create portal session', details: message },
      { status: 500 },
    );
  }
}
