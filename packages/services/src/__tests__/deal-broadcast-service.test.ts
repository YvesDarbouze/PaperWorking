import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  AuthzNotFoundError,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import { verifyBroadcastToken } from '../deals/broadcast-token.js';
import {
  createDealBroadcastService,
  type DealBroadcastServiceDeps,
} from '../deals/deal-broadcast-service.js';
import type { DealCommunicationRepository } from '../deals/deal-communication-repository.js';

const owner: AuthUser = {
  uid: 'owner-1',
  email: 'owner@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
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
    ...overrides,
  };
}

function makeRepository(
  overrides: Partial<DealCommunicationRepository> = {},
): DealCommunicationRepository {
  return {
    findDealById: jest.fn(async () => ({
      id: 'deal-1',
      slug: 'deal-one',
      address: '123 Main',
    })),
    createBroadcastWithInvitations: jest.fn(async (data) => ({
      broadcast: {
        id: 'b1',
        dealId: data.dealId,
        senderId: data.senderId,
        recipientEmails: data.recipientEmails,
        subject: data.subject,
        message: data.message,
        includeBusinessCard: data.includeBusinessCard,
        createdAt: new Date(),
      },
      invitations: data.recipientEmails.map((email, index) => ({
        id: `i${index + 1}`,
        dealId: data.dealId,
        inviteeEmail: email,
        inviteeUserId: null,
        status: 'pending',
        businessCardShared: data.includeBusinessCard,
        createdAt: new Date(),
      })),
    })),
    createMessage: jest.fn(async () => {
      throw new Error('not used');
    }),
    ...overrides,
  };
}

describe('DealBroadcastService', () => {
  it('creates broadcast, invitations, and signed reply tokens for authorized owner', async () => {
    const repository = makeRepository();
    const service = createDealBroadcastService({
      authz: new AuthorizationService(makeStore()),
      repository,
      resolveAppBaseUrl: () => 'https://app.test',
    } satisfies DealBroadcastServiceDeps);

    const result = await service.broadcastDeal(owner, {
      dealId: 'deal-1',
      recipientEmails: ['partner@fund.com'],
      subject: 'Opportunity',
      message: 'Review this deal',
    });

    expect(result.dispatchedCount).toBe(1);
    expect(result.invitationCount).toBe(1);
    expect(result.deliveryStatus).toBe('not_configured');
    expect(result.recipientLinks).toHaveLength(1);
    expect(result.recipientLinks[0]?.email).toBe('partner@fund.com');
    expect(result.recipientLinks[0]?.externalUrl).toContain('/deals/deal-one/external?token=');

    const payload = verifyBroadcastToken(result.recipientLinks[0]!.token);
    expect(payload?.dealId).toBe('deal-1');
    expect(payload?.email).toBe('partner@fund.com');
    expect(payload?.invitationId).toBe('i1');
    expect(payload?.broadcastId).toBe('b1');

    expect(repository.createBroadcastWithInvitations).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: 'owner-1', dealId: 'deal-1' }),
    );
  });

  it('does not claim email delivery in response metadata', async () => {
    const service = createDealBroadcastService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
    });

    const result = await service.broadcastDeal(owner, {
      dealId: 'deal-1',
      recipientEmails: ['partner@fund.com'],
    });

    expect(result.deliveryStatus).toBe('not_configured');
    expect(JSON.stringify(result)).not.toMatch(/email sent|emailed/i);
  });

  it('denies foreign deal broadcast', async () => {
    const service = createDealBroadcastService({
      authz: new AuthorizationService(
        makeStore({
          findDealById: async () => ({
            id: 'deal-1',
            creatorId: 'other-user',
            visibility: 'private',
            status: 'draft',
          }),
        }),
      ),
      repository: makeRepository({
        createBroadcastWithInvitations: async () => {
          throw new Error('should not broadcast');
        },
      }),
    });

    await expect(
      service.broadcastDeal(owner, {
        dealId: 'deal-1',
        recipientEmails: ['partner@fund.com'],
      }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('requires deal id', async () => {
    const service = createDealBroadcastService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
    });

    await expect(service.broadcastDeal(owner, {})).rejects.toBeInstanceOf(AuthzNotFoundError);
  });
});
