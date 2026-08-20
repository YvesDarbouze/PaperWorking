import { jsonResponse, type RouteResult } from '../../../http/response.js';

export interface DealMessagePayload {
  id: string;
  dealId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  source: 'platform' | 'email_inbound';
  createdAt: string;
}

export interface EmailReplyPostBody {
  from?: unknown;
  token?: unknown;
  text?: unknown;
  slug?: unknown;
}

export interface EmailReplyGetQuery {
  dealId?: string;
  slug?: string;
}

export type VerifyDealInviteTokenFn = (
  token: string,
) => { dealId?: string; slug?: string; inviteeEmail?: string } | null;

export type StoreDealMessageFn = (message: DealMessagePayload) => Promise<void> | void;

export type ListDealMessagesFn = (dealId?: string) => Promise<DealMessagePayload[]> | DealMessagePayload[];

export interface EmailReplyWebhookDeps {
  verifyToken?: VerifyDealInviteTokenFn;
  storeMessage?: StoreDealMessageFn;
  listMessages?: ListDealMessagesFn;
  now?: () => Date;
}

/**
 * POST /api/webhooks/email-reply — records inbound deal email replies.
 */
export async function handleEmailReplyPost(
  body: EmailReplyPostBody,
  deps: EmailReplyWebhookDeps = {},
): Promise<RouteResult> {
  try {
    const text = typeof body.text === 'string' ? body.text : '';
    const token = typeof body.token === 'string' ? body.token : undefined;
    const slug = typeof body.slug === 'string' ? body.slug : undefined;

    if (!text || (!token && !slug)) {
      return jsonResponse(400, {
        error: 'Missing required email payload fields (text, token/slug).',
      });
    }

    let dealId = slug || 'deal_123mainst';
    let senderEmail = typeof body.from === 'string' ? body.from : 'external_sender@example.com';
    let senderName = senderEmail.split('@')[0];

    if (token && deps.verifyToken) {
      const verified = deps.verifyToken(token);
      if (verified) {
        dealId = verified.dealId || verified.slug || dealId;
        senderEmail = verified.inviteeEmail || senderEmail;
        senderName = senderEmail.split('@')[0];
      }
    }

    const record: DealMessagePayload = {
      id: `msg_${deps.now?.().getTime() ?? Date.now()}`,
      dealId,
      senderEmail,
      senderName,
      text,
      source: 'email_inbound',
      createdAt: (deps.now?.() ?? new Date()).toISOString(),
    };

    if (deps.storeMessage) {
      await deps.storeMessage(record);
    }

    return jsonResponse(200, {
      success: true,
      message: 'Inbound email message recorded successfully.',
      record,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error processing inbound email webhook.';
    return jsonResponse(500, { error: message });
  }
}

/**
 * GET /api/webhooks/email-reply — list stored deal messages (demo/test).
 */
export async function handleEmailReplyGet(
  query: EmailReplyGetQuery = {},
  deps: EmailReplyWebhookDeps = {},
): Promise<RouteResult> {
  const dealId = query.dealId || query.slug;
  const all = deps.listMessages ? await deps.listMessages(dealId) : [];
  const messages = dealId
    ? all.filter((m) => m.dealId === dealId)
    : all;

  return jsonResponse(200, {
    success: true,
    total: messages.length,
    messages,
  });
}
