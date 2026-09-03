import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import { signBroadcastToken } from '../deals/broadcast-token.js';
import {
  createDealReplyService,
} from '../deals/deal-reply-service.js';
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
    createBroadcastWithInvitations: jest.fn(async () => {
      throw new Error('not used');
    }),
    createMessage: jest.fn(async (data) => ({
      id: 'm1',
      ...data,
      senderId: data.senderId ?? null,
      createdAt: new Date(),
    })),
    ...overrides,
  };
}

describe('DealReplyService', () => {
  it('accepts signed broadcast token replies without session', async () => {
    const token = signBroadcastToken({
      dealId: 'deal-1',
      email: 'external@example.com',
    });

    const repository = makeRepository();
    const service = createDealReplyService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.replyToDeal(
      { configuredWebhookSecret: null },
      {
        dealId: 'deal-1',
        token,
        senderEmail: 'external@example.com',
        content: 'Interested',
      },
    );

    expect(result.success).toBe(true);
    expect(repository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'email_inbound',
        senderId: undefined,
        senderEmail: 'external@example.com',
      }),
    );
  });

  it('rejects token for a different deal', async () => {
    const token = signBroadcastToken({
      dealId: 'deal-other',
      email: 'external@example.com',
    });
    const service = createDealReplyService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
    });

    await expect(
      service.replyToDeal(
        { configuredWebhookSecret: null },
        {
          dealId: 'deal-1',
          token,
          senderEmail: 'external@example.com',
          content: 'Hello',
        },
      ),
    ).rejects.toThrow('Invalid or expired reply token');
  });

  it('rejects mismatched sender email when token binds recipient', async () => {
    const token = signBroadcastToken({
      dealId: 'deal-1',
      email: 'external@example.com',
    });
    const service = createDealReplyService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
    });

    await expect(
      service.replyToDeal(
        { configuredWebhookSecret: null },
        {
          dealId: 'deal-1',
          token,
          senderEmail: 'spoof@example.com',
          content: 'Hello',
        },
      ),
    ).rejects.toThrow('senderEmail does not match reply token');
  });

  it('rejects invalid token for deal reply', async () => {
    const service = createDealReplyService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
    });

    await expect(
      service.replyToDeal(
        { configuredWebhookSecret: null },
        {
          dealId: 'deal-1',
          token: 'bad.token.sig',
          senderEmail: 'external@example.com',
          content: 'Hello',
        },
      ),
    ).rejects.toThrow('Invalid or expired reply token');
  });

  it('uses session auth when user present', async () => {
    const repository = makeRepository();
    const service = createDealReplyService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    await service.replyAuthenticated(owner, {
      dealId: 'deal-1',
      senderEmail: 'owner@example.com',
      content: 'Follow up',
    });

    expect(repository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: 'owner-1', source: 'platform' }),
    );
  });

  it('rejects reply without auth or token', async () => {
    const service = createDealReplyService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
    });

    await expect(
      service.replyToDeal(
        { configuredWebhookSecret: null },
        {
          dealId: 'deal-1',
          senderEmail: 'external@example.com',
          content: 'Hello',
        },
      ),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('prefers webhook secret mode over session when header matches', async () => {
    const repository = makeRepository();
    const service = createDealReplyService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    await service.replyToDeal(
      {
        configuredWebhookSecret: 'secret-1',
        inboundSecret: 'secret-1',
        authUser: owner,
      },
      {
        dealId: 'deal-1',
        senderEmail: 'inbound@example.com',
        content: 'Inbound',
      },
    );

    expect(repository.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'email_inbound', senderId: undefined }),
    );
  });
});
