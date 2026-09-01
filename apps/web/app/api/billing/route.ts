import { NextResponse } from 'next/server';
import { billingErrorResponse } from '@/lib/api/billing-route-errors';
import { buildBillingReadService } from '@/lib/api/handler-deps';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';

export const dynamic = 'force-dynamic';

/** GET /api/billing — subscription summary from Neon projection. */
export async function GET(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await buildBillingReadService().getSummary(user);
    return NextResponse.json(result);
  } catch (error) {
    const mapped = billingErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to load billing', details: message }, { status: 500 });
  }
}
