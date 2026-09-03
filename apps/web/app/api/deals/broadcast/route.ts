import { NextResponse } from 'next/server';
import { buildDealBroadcastService } from '@/lib/api/handler-deps';
import { dealsErrorResponse } from '@/lib/api/deal-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { DealBroadcastInput } from '@paperworking/services';

export const dynamic = 'force-dynamic';

function parseBroadcastBody(body: unknown): DealBroadcastInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  const recipientEmails = Array.isArray(record.recipientEmails)
    ? record.recipientEmails.filter((email): email is string => typeof email === 'string')
    : typeof record.recipientEmails === 'string'
      ? [record.recipientEmails]
      : undefined;
  return {
    dealId: typeof record.dealId === 'string' ? record.dealId : undefined,
    recipientEmails,
    subject: typeof record.subject === 'string' ? record.subject : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
    includeBusinessCard:
      typeof record.includeBusinessCard === 'boolean' ? record.includeBusinessCard : undefined,
  };
}

/** POST /api/deals/broadcast — session-authenticated deal broadcast. */
export async function POST(request: Request) {
  const user = await resolveAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await buildDealBroadcastService().broadcastDeal(user, parseBroadcastBody(body));
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to broadcast deal', details: message },
      { status: 500 },
    );
  }
}
