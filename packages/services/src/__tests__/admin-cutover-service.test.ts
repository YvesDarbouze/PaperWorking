import { describe, expect, it, jest } from '@jest/globals';
import type { AuthUser, AuthorizationService } from '@paperworking/authz';
import { AuthzForbiddenError } from '@paperworking/authz';
import {
  createAdminAgentCrewCommandService,
  createAdminAgentCrewReadService,
  createAdminLenderReadService,
  createAdminOpsReadService,
  createAdminRentcastReadService,
  type AdminReadRepository,
} from '../admin/index.js';

const admin: AuthUser = {
  uid: 'admin-1',
  email: 'admin@paperworking.test',
  accountType: 'admin',
  isAdmin: true,
};

const investor: AuthUser = {
  uid: 'user-1',
  email: 'user@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function authz(): AuthorizationService {
  return {
    assertPermission: jest.fn(),
    hasPermission: jest.fn(),
    accessibleProjectsWhere: jest.fn(),
  } as unknown as AuthorizationService;
}

function repository(overrides: Partial<AdminReadRepository> = {}): AdminReadRepository {
  return {
    countUsers: jest.fn(async () => 10),
    countSubscriptions: jest.fn(async () => 3),
    countProjects: jest.fn(async () => 5),
    countListings: jest.fn(async () => 2),
    countVendors: jest.fn(async () => 0),
    listRecentUsers: jest.fn(async () => []),
    listRecentAuditEvents: jest.fn(async () => []),
    listRecentSubscriptions: jest.fn(async () => []),
    listRecentListings: jest.fn(async () => []),
    getAppConfigValue: jest.fn(async () => null),
    countRentcastCalls: jest.fn(async () => 42),
    listSyntheticAgents: jest.fn(async () => []),
    getSyntheticAgentById: jest.fn(async () => null),
    deleteSyntheticAgent: jest.fn(async () => false),
    ...overrides,
  };
}

describe('phase B18 — admin authorization', () => {
  it('denies non-admin for ops read', async () => {
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    await expect(service.getOpsSection(investor)).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('denies accountType spoof without Postgres isAdmin', async () => {
    const service = createAdminRentcastReadService({ authz: authz(), repository: repository() });
    await expect(
      service.getUsage({ ...investor, accountType: 'admin', isAdmin: false }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('allows authoritative admin for rentcast usage', async () => {
    const service = createAdminRentcastReadService({ authz: authz(), repository: repository() });
    const result = await service.getUsage(admin);
    expect(result.count).toBe(42);
    expect(result).not.toHaveProperty('apiKey');
  });
});

describe('phase B18 — admin response minimization', () => {
  it('lender rates omit secret fields', async () => {
    const service = createAdminLenderReadService({
      authz: authz(),
      repository: repository({
        getAppConfigValue: jest.fn(async () => ({
          rates: [
            {
              id: 'NEO',
              name: 'NEO',
              interestRate: 6,
              points: 1,
              lenderFeesCents: 100,
              asOf: '2026-01-01T00:00:00.000Z',
              apiKey: 'secret-should-not-leak',
            },
          ],
        })),
      }),
    });
    const result = await service.getRates(admin);
    expect(result.rates[0]).not.toHaveProperty('apiKey');
    expect(JSON.stringify(result)).not.toMatch(/secret-should-not-leak/);
  });

  it('agent crew list returns summary stats only', async () => {
    const service = createAdminAgentCrewReadService({
      authz: authz(),
      repository: repository({
        listSyntheticAgents: jest.fn(async () => [
          {
            id: 'agent-1',
            email: 'agent@test.com',
            name: 'Agent',
            displayName: 'Agent One',
            agentPersona: 'investor',
            projectsCount: 1,
            listingsCount: 2,
            messagesCount: 3,
          },
        ]),
      }),
    });
    const result = await service.listAgents(admin);
    expect(result.count).toBe(1);
    expect(result.agents[0]).toMatchObject({
      id: 'agent-1',
      email: 'agent@test.com',
      persona: 'investor',
      stats: { projectsCount: 1, listingsCount: 2, messagesCount: 3 },
    });
    expect(result.agents[0]).not.toHaveProperty('legacyFirebaseUid');
  });
});

describe('phase B18 — admin agent delete', () => {
  it('rejects non-admin delete', async () => {
    const service = createAdminAgentCrewCommandService({ authz: authz(), repository: repository() });
    await expect(service.deleteAgent(investor, 'agent-1')).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });

  it('returns not found for missing synthetic agent', async () => {
    const service = createAdminAgentCrewCommandService({ authz: authz(), repository: repository() });
    const result = await service.deleteAgent(admin, 'missing');
    expect(result.success).toBe(false);
  });

  it('deletes synthetic agent when repository confirms', async () => {
    const deleteSyntheticAgent = jest.fn(async () => true);
    const service = createAdminAgentCrewCommandService({
      authz: authz(),
      repository: repository({ deleteSyntheticAgent }),
    });
    const result = await service.deleteAgent(admin, 'agent-1');
    expect(result.success).toBe(true);
    expect(deleteSyntheticAgent).toHaveBeenCalledWith('agent-1');
  });
});

describe('phase B18 — broadcast/webhook secret domain separation', () => {
  it('never uses DEAL_REPLY_WEBHOOK_SECRET for broadcast token signing', async () => {
    const { requireBroadcastTokenSecret, signBroadcastToken, verifyBroadcastToken } = await import(
      '../deals/broadcast-token.js'
    );
    process.env.NODE_ENV = 'test';
    process.env.BROADCAST_TOKEN_SECRET = 'broadcast-domain-secret';
    process.env.DEAL_REPLY_WEBHOOK_SECRET = 'broadcast-domain-secret';

    expect(requireBroadcastTokenSecret()).toBe('broadcast-domain-secret');
    const token = signBroadcastToken({ dealId: 'deal-1' });
    expect(verifyBroadcastToken(token)?.dealId).toBe('deal-1');

    delete process.env.BROADCAST_TOKEN_SECRET;
    expect(requireBroadcastTokenSecret()).toBe('paperworking_secret_dev_only');
  });
});
