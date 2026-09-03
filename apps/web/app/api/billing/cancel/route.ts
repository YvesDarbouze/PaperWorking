import { NextResponse } from 'next/server';
import { billingErrorResponse } from '@/lib/api/billing-route-errors';
import { buildBillingSubscriptionCommandService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** POST /api/billing/cancel — cancel own subscription (Stripe or free). */
export async function POST(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await buildBillingSubscriptionCommandService().cancelSubscription(user);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = billingErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to cancel subscription', details: message }, { status: 500 });
  }
}
