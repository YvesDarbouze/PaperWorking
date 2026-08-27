import { jsonResponse, type RouteResult } from '../../../http/response.js';

export interface DealBroadcastBody {
  dealId?: unknown;
  recipientEmails?: unknown;
  subject?: unknown;
  message?: unknown;
  includeBusinessCard?: unknown;
  senderId?: unknown;
  senderName?: unknown;
  senderEmail?: unknown;
  dealSlug?: unknown;
  dealAddress?: unknown;
  dealName?: unknown;
  purchasePrice?: unknown;
  projectedRoi?: unknown;
  businessCard?: unknown;
}

export interface DealBroadcastTokenPayload {
  dealId: string;
  slug: string;
  address: string;
  dealName?: string;
  purchasePrice?: number;
  projectedRoi?: number;
  senderId?: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  message: string;
  includeBusinessCard?: boolean;
  businessCard?: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    investmentCriteria?: string;
  } | null;
  broadcast: true;
  type: 'broadcast';
}

export type GenerateBroadcastTokenFn = (payload: DealBroadcastTokenPayload) => string;

export type RenderBroadcastEmailFn = (
  payload: DealBroadcastTokenPayload,
  token: string,
) => { html: string; text?: string } | string;

export type SaveBroadcastRecordFn = (record: {
  id: string;
  dealId: string;
  senderId: string;
  senderName: string;
  recipientEmails: string[];
  subject: string;
  message: string;
  includeBusinessCard: boolean;
  createdAt: string;
}) => Promise<void> | void;

export interface DealsBroadcastPostDeps {
  generateToken?: GenerateBroadcastTokenFn;
  renderEmail?: RenderBroadcastEmailFn;
  saveRecord?: SaveBroadcastRecordFn;
  now?: () => Date;
}

/**
 * POST /api/deals/broadcast — broadcast deal underwriting analysis to external contacts.
 */
export async function handleDealsBroadcastPost(
  body: DealBroadcastBody,
  deps: DealsBroadcastPostDeps = {},
): Promise<RouteResult> {
  try {
    const dealId = typeof body.dealId === 'string' ? body.dealId : '';
    const recipientEmails = Array.isArray(body.recipientEmails)
      ? body.recipientEmails.filter((e): e is string => typeof e === 'string' && e.includes('@'))
      : [];

    if (!dealId || recipientEmails.length === 0) {
      return jsonResponse(400, {
        error: 'Invalid broadcast payload. Valid dealId and recipientEmails are required.',
      });
    }

    const senderId = typeof body.senderId === 'string' ? body.senderId : 'user_owner_1';
    const senderName = typeof body.senderName === 'string' ? body.senderName : 'Sarah Jenkins';
    const senderEmail =
      typeof body.senderEmail === 'string' ? body.senderEmail : 'sarah@leadinvestor.com';
    const slug = typeof body.dealSlug === 'string' ? body.dealSlug : '1247elmst';
    const address =
      typeof body.dealAddress === 'string' ? body.dealAddress : '1247 Elm Street, Austin, TX 78702';
    const dealName = typeof body.dealName === 'string' ? body.dealName : 'Elm Street Flip';
    const purchasePrice =
      typeof body.purchasePrice === 'number' ? body.purchasePrice : 485000;
    const projectedRoi =
      typeof body.projectedRoi === 'number' ? body.projectedRoi : 18.4;
    const includeBusinessCard = body.includeBusinessCard !== false;

    const businessCard =
      includeBusinessCard && typeof body.businessCard === 'object' && body.businessCard !== null
        ? (body.businessCard as DealBroadcastTokenPayload['businessCard'])
        : includeBusinessCard
          ? {
              name: senderName,
              email: senderEmail,
              company: 'PaperWorking Capital Partner',
              phone: '+1 (512) 555-0199',
              investmentCriteria: 'Value-add residential & multifamily',
            }
          : null;

    const broadcastRecord = {
      id: `broadcast_${deps.now?.().getTime() ?? Date.now()}`,
      dealId,
      senderId,
      senderName,
      recipientEmails,
      subject:
        typeof body.subject === 'string' && body.subject.trim().length > 0
          ? body.subject
          : `Investment Opportunity: ${dealName}`,
      message: typeof body.message === 'string' ? body.message : '',
      includeBusinessCard,
      createdAt: (deps.now?.() ?? new Date()).toISOString(),
    };

    if (deps.saveRecord) {
      await deps.saveRecord(broadcastRecord);
    }

    const defaultGenerateToken = (payload: DealBroadcastTokenPayload) => {
      const b64 = (s: string) => Buffer.from(s).toString('base64url');
      const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const bodyJson = b64(
        JSON.stringify({
          ...payload,
          exp: Math.floor(Date.now() / 1000) + 14 * 86400,
        }),
      );
      return `${header}.${bodyJson}.signature`;
    };

    const generateToken = deps.generateToken ?? defaultGenerateToken;

    const recipientTokens = recipientEmails.map((email) => {
      const payload: DealBroadcastTokenPayload = {
        dealId,
        slug,
        address,
        dealName,
        purchasePrice,
        projectedRoi,
        senderId,
        senderName,
        senderEmail,
        recipientEmail: email,
        subject: broadcastRecord.subject,
        message: broadcastRecord.message,
        includeBusinessCard,
        businessCard,
        broadcast: true,
        type: 'broadcast',
      };
      const token = generateToken(payload);
      const emailOutput = deps.renderEmail ? deps.renderEmail(payload, token) : undefined;
      const html =
        typeof emailOutput === 'string'
          ? emailOutput
          : emailOutput?.html ??
            `<html><body><p>${payload.address}</p><a href="/deals/${payload.slug}/external?token=${token}&broadcast=true">View deal</a></body></html>`;
      const text = typeof emailOutput === 'object' ? emailOutput.text : undefined;

      return { email, token, html, text };
    });

    return jsonResponse(200, {
      success: true,
      sent: recipientTokens.length,
      failed: 0,
      dispatchedCount: recipientTokens.length,
      broadcast: broadcastRecord,
      tokens: recipientTokens.map((r) => ({ email: r.email, token: r.token })),
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Failed to process broadcast',
    });
  }
}
