import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import { verifyBroadcastToken } from '../deals/broadcast-token.js';
import { createDealBroadcastService } from '../deals/deal-broadcast-service.js';
import { createDealReplyService } from '../deals/deal-reply-service.js';
import type { DealCommunicationRepository } from '../deals/deal-communication-repository.js';

const owner: AuthUser = {
  uid: 'owner-1',
  email: 'owner@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeStore(): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [],
    findActiveOrgMemberships: async () => [],
    findProjectById: async () => null,
    findActiveProjectMember: async () => null,
    findDealById: async () => ({
      id: 'deal-1',
      creatorId: 'owner-1',
      visibility: 'private',
      status: 'draft',
    }),
    findActiveProjectMemberByUserId: async () => null,
    findActiveOrgMember: async () => null,
    findOrganizationOwnedBy: async () => null,
    findActiveOrgMemberInOrgs: async () => null,
    findOrganizationOwnedByUserInOrgs: async () => null,
    findMessageInThreadForUser: async () => null,
    findAnyMessageInThread: async () => null,
  };
}

describe('deal communication flow (B13.1)', () => {
  it('broadcast → invitation token → external reply → DealMessage persisted', async () => {
    const messages: Array<{
      dealId: string;
      senderEmail: string;
      content: string;
      source: string;
    }> = [];

    const repository: DealCommunicationRepository = {
      findDealById: jest.fn(async () => ({
        id: 'deal-1',
        slug: 'deal-one',
        address: '123 Main',
      })),
      createBroadcastWithInvitations: jest.fn(async (data) => ({
        broadcast: {
          id: 'broadcast-1',
          dealId: data.dealId,
          senderId: data.senderId,
          recipientEmails: data.recipientEmails,
          subject: data.subject,
          message: data.message,
          includeBusinessCard: data.includeBusinessCard,
          createdAt: new Date(),
        },
        invitations: [
          {
            id: 'invitation-1',
            dealId: data.dealId,
            inviteeEmail: 'recipient@example.com',
            inviteeUserId: null,
            status: 'pending',
            businessCardShared: data.includeBusinessCard,
            createdAt: new Date(),
          },
        ],
      })),
      createMessage: jest.fn(async (data) => {
        messages.push({
          dealId: data.dealId,
          senderEmail: data.senderEmail,
          content: data.content,
          source: data.source,
        });
        return {
          id: 'message-1',
          ...data,
          senderId: data.senderId ?? null,
          createdAt: new Date(),
        };
      }),
    };

    const authz = new AuthorizationService(makeStore());
    const broadcastService = createDealBroadcastService({
      authz,
      repository,
      resolveAppBaseUrl: () => 'https://app.test',
    });
    const replyService = createDealReplyService({ authz, repository });

    const broadcast = await broadcastService.broadcastDeal(owner, {
      dealId: 'deal-1',
      recipientEmails: ['recipient@example.com'],
      subject: 'Opportunity',
      message: 'Please review',
    });

    expect(broadcast.deliveryStatus).toBe('not_configured');
    expect(broadcast.recipientLinks).toHaveLength(1);

    const link = broadcast.recipientLinks[0]!;
    const payload = verifyBroadcastToken(link.token);
    expect(payload?.dealId).toBe('deal-1');
    expect(payload?.email).toBe('recipient@example.com');
    expect(link.externalUrl).toContain('/deals/deal-one/external?token=');

    const reply = await replyService.replyToDeal(
      { configuredWebhookSecret: null },
      {
        dealId: 'deal-1',
        token: link.token,
        senderEmail: 'recipient@example.com',
        content: 'We are interested',
      },
    );

    expect(reply.success).toBe(true);
    expect(messages).toEqual([
      {
        dealId: 'deal-1',
        senderEmail: 'recipient@example.com',
        content: 'We are interested',
        source: 'email_inbound',
      },
    ]);
  });
});
