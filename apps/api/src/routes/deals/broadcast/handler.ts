import { jsonResponse, type RouteResult } from '../../../http/response.js';

export interface DealBroadcastBody {
  dealId?: unknown;
  recipientEmails?: unknown;
  subject?: unknown;
  message?: unknown;
  includeBusinessCard?: unknown;
}

export interface DealBroadcastTokenPayload {
  dealId: string;
  slug: string;
  address: string;
  senderName: string;
  recipientEmail: string;
  subject: string;
  message: string;
  includeBusinessCard?: boolean;
  type: 'broadcast';
}

export type GenerateBroadcastTokenFn = (payload: DealBroadcastTokenPayload) => string;

export type RenderBroadcastEmailFn = (
  payload: DealBroadcastTokenPayload,
  token: string,
) => string;

export interface DealsBroadcastPostDeps {
  generateToken?: GenerateBroadcastTokenFn;
  renderEmail?: RenderBroadcastEmailFn;
  now?: () => Date;
}

/**
 * POST /api/deals/broadcast — migrated from PaperWorking (token generation injected).
 */
export async function handleDealsBroadcastPost(
  body: DealBroadcastBody,
  deps: DealsBroadcastPostDeps = {},
): Promise<RouteResult> {
  try {
    const dealId = typeof body.dealId === 'string' ? body.dealId : '';
    const recipientEmails = Array.isArray(body.recipientEmails)
      ? body.recipientEmails.filter((e): e is string => typeof e === 'string')
      : [];

    if (!dealId || recipientEmails.length === 0) {
      return jsonResponse(400, { error: 'Invalid broadcast payload' });
    }

    const broadcastRecord = {
      id: `broadcast_${deps.now?.().getTime() ?? Date.now()}`,
      dealId,
      senderId: 'user_owner_1',
      senderName: 'Yves Darbouze',
      recipientEmails,
      subject:
        typeof body.subject === 'string' ? body.subject : 'Check out this deal on PaperWorking',
      message: typeof body.message === 'string' ? body.message : '',
      includeBusinessCard: body.includeBusinessCard !== false,
      createdAt: (deps.now?.() ?? new Date()).toISOString(),
    };

    const generateToken =
      deps.generateToken ??
      ((payload: DealBroadcastTokenPayload) => `token_${payload.recipientEmail}`);
    const renderEmail =
      deps.renderEmail ??
      ((payload: DealBroadcastTokenPayload, token: string) =>
        `<html>${payload.address} ${token}</html>`);

    const recipientTokens = recipientEmails.map((email) => {
      const payload: DealBroadcastTokenPayload = {
        dealId,
        slug: '123mainstaustintx78701',
        address: '123 Main St, Austin, TX 78701',
        senderName: 'Yves Darbouze',
        recipientEmail: email,
        subject: broadcastRecord.subject,
        message: broadcastRecord.message,
        includeBusinessCard: broadcastRecord.includeBusinessCard,
        type: 'broadcast',
      };
      const token = generateToken(payload);
      const html = renderEmail(payload, token);
      return { email, token, html };
    });

    return jsonResponse(200, {
      success: true,
      broadcast: broadcastRecord,
      dispatchedCount: recipientTokens.length,
    });
  } catch {
    return jsonResponse(500, { error: 'Failed to process broadcast' });
  }
}
