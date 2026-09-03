import type { AuthorizationService, AuthUser } from '@paperworking/authz';
import { AuthzNotFoundError } from '@paperworking/authz';
import {
  buildDealExternalReplyUrl,
  resolveDealAppBaseUrl,
  signBroadcastToken,
} from './broadcast-token.js';
import type { DealCommunicationRepository } from './deal-communication-repository.js';

export type DealBroadcastInput = {
  dealId?: string;
  recipientEmails?: string[] | string;
  subject?: string;
  message?: string;
  includeBusinessCard?: boolean;
};

export type DealBroadcastRecipientLink = {
  email: string;
  token: string;
  externalUrl: string;
  invitationId: string;
};

export type DealBroadcastResult = {
  success: true;
  broadcast: Awaited<
    ReturnType<DealCommunicationRepository['createBroadcastWithInvitations']>
  >['broadcast'];
  /** Back-compat alias: number of invitation rows created (not emails sent). */
  dispatchedCount: number;
  invitationCount: number;
  deliveryStatus: 'not_configured';
  recipientLinks: DealBroadcastRecipientLink[];
};

export type DealBroadcastServiceDeps = {
  authz: AuthorizationService;
  repository: DealCommunicationRepository;
  resolveAppBaseUrl?: () => string;
};

function parseRecipientEmails(input: DealBroadcastInput): string[] {
  const raw = input.recipientEmails;
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  return list.filter((email): email is string => typeof email === 'string' && email.includes('@'));
}

/**
 * Session-authenticated deal broadcast — persists broadcast/invitations and issues reply tokens.
 * Email delivery is not configured in the live runtime (deliveryStatus: not_configured).
 */
export class DealBroadcastService {
  constructor(private readonly deps: DealBroadcastServiceDeps) {}

  async broadcastDeal(user: AuthUser, input: DealBroadcastInput): Promise<DealBroadcastResult> {
    const dealId = String(input.dealId || '').trim();
    if (!dealId) {
      throw new AuthzNotFoundError({ error: 'dealId required' });
    }

    await this.deps.authz.assertDealAccess(user, dealId, 'deals.update');

    const deal = await this.deps.repository.findDealById(dealId);
    if (!deal) {
      throw new AuthzNotFoundError({ error: 'Deal not found' });
    }

    const recipientEmails = parseRecipientEmails(input);
    const appBaseUrl = (this.deps.resolveAppBaseUrl ?? resolveDealAppBaseUrl)();
    const dealSlug = deal.slug || dealId;

    const persisted = await this.deps.repository.createBroadcastWithInvitations({
      dealId,
      senderId: user.uid,
      recipientEmails,
      subject: String(input.subject || `Deal: ${deal.address || dealId}`),
      message: String(input.message || ''),
      includeBusinessCard: input.includeBusinessCard !== false,
    });

    const recipientLinks: DealBroadcastRecipientLink[] = persisted.invitations.map(
      (invitation) => {
        const token = signBroadcastToken({
          dealId,
          email: invitation.inviteeEmail,
          invitationId: invitation.id,
          broadcastId: persisted.broadcast.id,
          broadcast: true,
          type: 'broadcast',
        });
        return {
          email: invitation.inviteeEmail,
          token,
          invitationId: invitation.id,
          externalUrl: buildDealExternalReplyUrl({ appBaseUrl, dealSlug, token }),
        };
      },
    );

    return {
      success: true,
      broadcast: persisted.broadcast,
      dispatchedCount: recipientEmails.length,
      invitationCount: recipientEmails.length,
      deliveryStatus: 'not_configured',
      recipientLinks,
    };
  }
}

export function createDealBroadcastService(deps: DealBroadcastServiceDeps): DealBroadcastService {
  return new DealBroadcastService(deps);
}
