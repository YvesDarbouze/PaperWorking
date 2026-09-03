import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import { AuthzForbiddenError, AuthzNotFoundError } from '@paperworking/authz';
import { verifyBroadcastToken } from './broadcast-token.js';
import { DealCommunicationValidationError } from './deal-communication-errors.js';
import type { DealCommunicationRepository } from './deal-communication-repository.js';

export type DealReplyInput = {
  dealId?: string;
  content?: string;
  message?: string;
  senderEmail?: string;
  email?: string;
  token?: string;
  broadcastToken?: string;
  senderId?: unknown;
};

export type DealReplyContext = {
  authUser?: AuthUser | null;
  inboundSecret?: string | null;
  configuredWebhookSecret?: string | null;
};

export type DealReplyResult = {
  success: true;
  message: Awaited<ReturnType<DealCommunicationRepository['createMessage']>>;
};

export type DealReplyServiceDeps = {
  authz: AuthorizationService;
  repository: DealCommunicationRepository;
};

export type DealReplyTrustMode =
  | 'WEBHOOK_SECRET'
  | 'SESSION_AUTH'
  | 'SIGNED_BROADCAST_TOKEN'
  | 'REJECTED';

function resolveTrustMode(context: DealReplyContext, input: DealReplyInput): DealReplyTrustMode {
  const configured = context.configuredWebhookSecret?.trim();
  if (configured && context.inboundSecret === configured) {
    return 'WEBHOOK_SECRET';
  }
  if (context.authUser) {
    return 'SESSION_AUTH';
  }
  if (input.token || input.broadcastToken) {
    return 'SIGNED_BROADCAST_TOKEN';
  }
  return 'REJECTED';
}

/**
 * Deal reply routing with explicit trust-mode selection (no cross-mode fallback).
 */
export class DealReplyService {
  constructor(private readonly deps: DealReplyServiceDeps) {}

  async replyToDeal(context: DealReplyContext, input: DealReplyInput): Promise<DealReplyResult> {
    const mode = resolveTrustMode(context, input);
    switch (mode) {
      case 'WEBHOOK_SECRET':
        return this.replyInbound(input);
      case 'SESSION_AUTH':
        return this.replyAuthenticated(context.authUser!, input);
      case 'SIGNED_BROADCAST_TOKEN':
        return this.replyWithBroadcastToken(input, String(input.token || input.broadcastToken || ''));
      default:
        throw new AuthzForbiddenError({
          error: 'Forbidden',
          reason: 'deal_reply_auth_required',
        });
    }
  }

  async replyInbound(input: DealReplyInput): Promise<DealReplyResult> {
    return this.createDealMessage(input, 'email_inbound', undefined);
  }

  async replyAuthenticated(user: AuthUser, input: DealReplyInput): Promise<DealReplyResult> {
    const dealId = String(input.dealId || '').trim();
    if (!dealId) {
      throw new DealCommunicationValidationError('dealId required');
    }
    await this.deps.authz.assertDealAccess(user, dealId, 'deals.read');
    return this.createDealMessage(input, 'platform', user.uid);
  }

  async replyWithBroadcastToken(input: DealReplyInput, token: string): Promise<DealReplyResult> {
    const payload = verifyBroadcastToken(token);
    const dealId = String(input.dealId || '').trim();
    if (!payload?.dealId || payload.dealId !== dealId) {
      throw new DealCommunicationValidationError('Invalid or expired reply token');
    }

    const bodyEmail = String(input.senderEmail || input.email || '').trim().toLowerCase();
    const tokenEmail = payload.email?.trim().toLowerCase();
    const senderEmail = tokenEmail || bodyEmail;
    if (!senderEmail) {
      throw new DealCommunicationValidationError('senderEmail required');
    }
    if (tokenEmail && bodyEmail && tokenEmail !== bodyEmail) {
      throw new DealCommunicationValidationError('senderEmail does not match reply token');
    }

    return this.createDealMessage(
      { ...input, senderEmail, email: senderEmail },
      'email_inbound',
      undefined,
    );
  }

  private async createDealMessage(
    input: DealReplyInput,
    source: 'platform' | 'email_inbound',
    senderId: string | undefined,
  ): Promise<DealReplyResult> {
    const dealId = String(input.dealId || '').trim();
    const content = String(input.content || input.message || '').trim();
    const senderEmail = String(input.senderEmail || input.email || '').trim();
    if (!dealId || !content || !senderEmail) {
      throw new DealCommunicationValidationError(
        'dealId, content, and senderEmail are required',
      );
    }

    const deal = await this.deps.repository.findDealById(dealId);
    if (!deal) {
      throw new AuthzNotFoundError({ error: 'Deal not found' });
    }

    const message = await this.deps.repository.createMessage({
      dealId,
      senderEmail,
      content,
      senderId,
      source,
    });
    return { success: true, message };
  }
}

export function createDealReplyService(deps: DealReplyServiceDeps): DealReplyService {
  return new DealReplyService(deps);
}
