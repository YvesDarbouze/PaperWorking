import { NextResponse } from 'next/server';
import { buildDealReplyService } from '@/lib/api/handler-deps';
import { dealsErrorResponse } from '@/lib/api/deal-route-errors';
import { resolveAuthUserFromRequest } from '@/lib/api/server-session';
import type { DealReplyInput } from '@paperworking/services';
import { resolveDealReplyWebhookSecret } from '@paperworking/services';

export const dynamic = 'force-dynamic';

function parseReplyBody(body: unknown): DealReplyInput {
  if (!body || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  return {
    dealId: typeof record.dealId === 'string' ? record.dealId : undefined,
    content: typeof record.content === 'string' ? record.content : undefined,
    message: typeof record.message === 'string' ? record.message : undefined,
    senderEmail: typeof record.senderEmail === 'string' ? record.senderEmail : undefined,
    email: typeof record.email === 'string' ? record.email : undefined,
    token: typeof record.token === 'string' ? record.token : undefined,
    broadcastToken: typeof record.broadcastToken === 'string' ? record.broadcastToken : undefined,
  };
}

/** POST /api/deals/reply — browser-safe reply modes (session or signed broadcast token). */
export async function POST(request: Request) {
  const inboundSecret = request.headers.get('x-deal-reply-secret');
  const configuredWebhookSecret = resolveDealReplyWebhookSecret();

  if (configuredWebhookSecret && inboundSecret === configuredWebhookSecret) {
    return NextResponse.json(
      {
        error: 'Forbidden',
        reason: 'deal_reply_webhook_use_nest',
      },
      { status: 403 },
    );
  }

  const user = await resolveAuthUserFromRequest(request);

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = await buildDealReplyService().replyToDeal(
      {
        authUser: user,
        inboundSecret,
        configuredWebhookSecret,
      },
      parseReplyBody(body),
    );
    return NextResponse.json(result);
  } catch (error) {
    const mapped = dealsErrorResponse(error);
    if (mapped) return mapped;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to submit deal reply', details: message },
      { status: 500 },
    );
  }
}
