import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import { AuthzForbiddenError, AuthorizationService } from '@paperworking/authz';
import {
  createAdminAgentCrewCommandService,
  createAdminAgentCrewReadService,
  createAdminLenderReadService,
  createAdminOpsReadService,
  createAdminRentcastReadService,
  createAdminUserCommandService,
} from '@paperworking/services';
import { FIRESTORE_COLLECTIONS, resetFirestoreAdminForTests } from '../admin.js';
import { createFirestoreAdminReadRepository } from '../create-firestore-admin-read-repository.js';
import { createFirestoreAdminCommandRepository } from '../create-firestore-admin-command-repository.js';
import { createFirestoreAuthzStore } from '../create-firestore-authz-store.js';
import { createMockFirestoreFactory, MockFirestore, ts } from './mock-firestore.js';
import { createAdminReadRepository } from '../../runtime/admin-data-store.js';

describe('Firestore admin read repository and services', () => {
  let mock: MockFirestore;
  const previousMode = process.env.DATABASE_READ_MODE;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  const admin: AuthUser = {
    uid: 'uid-admin',
    email: 'admin@paperworking.test',
    accountType: 'admin',
    isAdmin: true,
  };

  const investor: AuthUser = {
    uid: 'uid-investor',
    email: 'investor@example.com',
    accountType: 'investor',
    isAdmin: false,
  };

  beforeEach(() => {
    resetFirestoreAdminForTests();
    process.env.DATABASE_READ_MODE = 'firestore';
    delete process.env.DATABASE_URL;

    mock = new MockFirestore();
    mock.seed(FIRESTORE_COLLECTIONS.users, [
      {
        id: 'uid-admin',
        data: {
          uid: 'uid-admin',
          email: 'admin@paperworking.test',
          displayName: 'Admin User',
          accountType: 'admin',
          isAdmin: true,
          createdAt: ts('2026-01-01'),
          updatedAt: ts('2026-01-05'),
        },
      },
      {
        id: 'uid-investor',
        data: {
          uid: 'uid-investor',
          email: 'investor@example.com',
          displayName: 'Investor One',
          accountType: 'investor',
          role: 'Lead Investor',
          orgRole: 'Lead Investor',
          createdAt: ts('2026-02-01'),
          updatedAt: ts('2026-02-02'),
        },
      },
      {
        id: 'uid-agent',
        data: {
          uid: 'uid-agent',
          email: 'agent@demo.test',
          displayName: 'Synthetic Agent',
          accountType: 'investor',
          syntheticAgent: true,
          agentPersona: 'investor',
          createdAt: ts('2026-01-10'),
          updatedAt: ts('2026-03-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.organizations, [
      {
        id: 'org-1',
        data: {
          id: 'org-1',
          name: 'Atlas Syndicate',
          ownerId: 'uid-investor',
          createdAt: ts('2026-02-05'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.organizationMembers, [
      {
        id: 'org-1_uid-investor',
        data: {
          organizationId: 'org-1',
          userId: 'uid-investor',
          email: 'investor@example.com',
          status: 'active',
        },
      },
      {
        id: 'org-1_uid-admin',
        data: {
          organizationId: 'org-1',
          userId: 'uid-admin',
          email: 'admin@paperworking.test',
          status: 'active',
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.projects, [
      {
        id: 'proj-1',
        data: {
          id: 'proj-1',
          userId: 'uid-agent',
          ownerId: 'uid-agent',
          name: 'Agent Project',
          createdAt: ts('2026-01-11'),
          updatedAt: ts('2026-01-11'),
        },
      },
      {
        id: 'proj-2',
        data: {
          id: 'proj-2',
          userId: 'uid-investor',
          ownerId: 'uid-investor',
          name: 'Investor Project',
          createdAt: ts('2026-02-03'),
          updatedAt: ts('2026-02-03'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.dealListings, [
      {
        id: 'listing-1',
        data: {
          id: 'listing-1',
          title: 'Agent Listing',
          userId: 'uid-agent',
          updatedAt: ts('2026-03-02'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.subscriptions, [
      {
        id: 'uid-investor',
        data: {
          id: 'uid-investor',
          userId: 'uid-investor',
          plan: 'Individual',
          status: 'active',
          updatedAt: ts('2026-02-10'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.auditLogs, [
      {
        id: 'audit-1',
        data: {
          id: 'audit-1',
          timestamp: ts('2026-03-03'),
          actorEmail: 'admin@paperworking.test',
          action: 'admin.view',
          targetResource: 'ops',
          targetResourceId: null,
          status: 'success',
          entryHash: 'abc123def4567890',
          metadata: { ip: '127.0.0.1' },
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.systemConfig, [
      {
        id: 'rentcast.usage',
        data: {
          key: 'rentcast.usage',
          value: { requestsMonth: 17, limit: 500 },
        },
      },
      {
        id: 'lender.rates',
        data: {
          key: 'lender.rates',
          value: {
            rates: [
              {
                id: 'NEO',
                name: 'NEO Capital',
                interestRate: 6.25,
                points: 1,
                lenderFeesCents: 100000,
                asOf: '2026-01-01T00:00:00.000Z',
              },
            ],
            updatedAt: '2026-01-15T00:00:00.000Z',
            updatedByEmail: 'admin@paperworking.test',
          },
        },
      },
      {
        id: 'lender.checklists',
        data: {
          key: 'lender.checklists',
          value: {
            Conventional: ['Tax Returns'],
            'SBA 504': ['Tax Returns'],
            'Hard Money': ['Purchase Contract'],
            Bridge: ['Purchase Contract'],
            updatedAt: '2026-01-15T00:00:00.000Z',
            updatedByEmail: 'admin@paperworking.test',
          },
        },
      },
    ]);
  });

  afterEach(() => {
    resetFirestoreAdminForTests();
    if (previousMode === undefined) delete process.env.DATABASE_READ_MODE;
    else process.env.DATABASE_READ_MODE = previousMode;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  function firestoreFactory() {
    return createMockFirestoreFactory(mock);
  }

  function repository() {
    return createFirestoreAdminReadRepository(firestoreFactory());
  }

  function authz() {
    return new AuthorizationService(createFirestoreAuthzStore(firestoreFactory()));
  }

  it('constructs admin router without DATABASE_URL', () => {
    expect(() => createAdminReadRepository()).not.toThrow();
  });

  it('denies non-admin access to ops', async () => {
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    await expect(service.getOpsSection(investor)).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('rejects accountType spoof without isAdmin', async () => {
    const service = createAdminRentcastReadService({ authz: authz(), repository: repository() });
    await expect(
      service.getUsage({ ...investor, accountType: 'admin', isAdmin: false }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });

  it('aggregates ops metrics from Firestore collections', async () => {
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    const result = await service.getOpsSection(admin, 'overview');

    expect(result.success).toBe(true);
    expect(result.kpis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Total Users', value: '3' }),
        expect.objectContaining({ label: 'Subscriptions', value: '1' }),
        expect.objectContaining({ label: 'Projects', value: '2' }),
        expect.objectContaining({ label: 'Listings', value: '1' }),
      ]),
    );
    expect(result.activity?.[0]?.type).toBe('audit');
  });

  function commandRepository() {
    return createFirestoreAdminCommandRepository(firestoreFactory());
  }

  function userCommandService() {
    return createAdminUserCommandService({
      authz: authz(),
      readRepository: repository(),
      commandRepository: commandRepository(),
    });
  }

  it('returns users section from Firestore users collection', async () => {
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    const result = await service.getOpsSection(admin, 'users');
    expect(result.total).toBe(3);
    expect(result.users?.length).toBeGreaterThan(0);
    expect(result.users?.[0]).toMatchObject({
      email: expect.any(String),
      accountType: expect.any(String),
      accountTypeLabel: expect.any(String),
      jobTitle: expect.any(String),
      orgRole: expect.any(String),
      documentId: expect.any(String),
    });
    const investorRow = result.users?.find((row) => row.email === 'investor@example.com');
    expect(investorRow?.jobTitle).toBe('Lead Investor');
    expect(investorRow?.orgRole).toBe('Lead Investor');
    expect(investorRow?.accountTypeLabel).toBe('Investor');
  });

  it('updates account type with audit log entry', async () => {
    const service = userCommandService();
    const result = await service.updateAccountType(admin, 'uid-investor', 'vendor');
    expect(result.user.accountType).toBe('vendor');
    expect(result.user.accountTypeLabel).toBe('Vendor');

    const reread = await repository().findUserByLookupId('uid-investor');
    expect(reread?.accountType).toBe('vendor');

    const audit = await repository().listRecentAuditEvents(5);
    expect(audit[0]?.action).toBe('user.accountType.update');
    expect(audit[0]?.targetResource).toBe('user');
  });

  it('returns projects section from Firestore', async () => {
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    const result = await service.getOpsSection(admin, 'projects');
    expect(result.total).toBe(2);
    expect(result.projects?.length).toBe(2);
    expect(result.projects?.[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      ownerId: expect.any(String),
    });
  });

  it('returns organizations section from Firestore', async () => {
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    const result = await service.getOpsSection(admin, 'organizations');
    expect(result.total).toBe(1);
    expect(result.organizations?.[0]).toMatchObject({
      id: 'org-1',
      name: 'Atlas Syndicate',
      memberCount: 2,
    });
  });

  it('returns subscriptions with customer email and name instead of raw uid', async () => {
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    const result = await service.getOpsSection(admin, 'subscriptions');
    expect(result.recent?.[0]?.customer).toBe('Investor One (investor@example.com)');
    expect(result.recent?.[0]?.customer).not.toMatch(/^uid-/);
  });

  it('resolves subscription customer when user document id is email', async () => {
    mock.seed(FIRESTORE_COLLECTIONS.users, [
      {
        id: 'billing@example.com',
        data: {
          uid: 'uid-billing',
          email: 'billing@example.com',
          displayName: 'Billing User',
          accountType: 'investor',
          createdAt: ts('2026-03-01'),
          updatedAt: ts('2026-03-01'),
        },
      },
    ]);
    mock.seed(FIRESTORE_COLLECTIONS.subscriptions, [
      {
        id: 'uid-billing',
        data: {
          userId: 'uid-billing',
          plan: 'Team',
          status: 'active',
          updatedAt: ts('2026-03-04'),
        },
      },
    ]);
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    const result = await service.getOpsSection(admin, 'subscriptions');
    expect(result.recent?.[0]?.customer).toBe('Billing User (billing@example.com)');
  });

  it('returns marketplace metrics shaped for admin UI', async () => {
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    const result = await service.getOpsSection(admin, 'marketplace');
    expect(Array.isArray(result.funnel)).toBe(true);
    expect(result.funnel?.length).toBeGreaterThan(0);
    expect(result).toMatchObject({
      liveVendors: expect.any(Number),
      openPipeline: 1,
      matchRate: expect.any(Number),
    });
    expect(result.jurisdictionVariance).toEqual([]);
  });

  it('returns audit logs shaped for admin UI', async () => {
    const service = createAdminOpsReadService({ authz: authz(), repository: repository() });
    const result = await service.getOpsSection(admin, 'audit');
    expect(result).toMatchObject({
      chainIntact: true,
      critical: 0,
      warnings: 0,
      total: 1,
    });
    expect(Array.isArray(result.logs)).toBe(true);
    expect(result.logs?.[0]).toMatchObject({
      id: 'audit-1',
      seq: 1,
      severity: 'info',
      action: 'admin.view',
      actor: 'admin@paperworking.test',
      target: 'ops',
      ip: '127.0.0.1',
      hash: 'abc123def456',
    });
  });

  it('reads persisted RentCast usage from systemConfig', async () => {
    const service = createAdminRentcastReadService({ authz: authz(), repository: repository() });
    const result = await service.getUsage(admin, { year: 2026, month: 3 });
    expect(result.count).toBe(17);
    expect(result.limit).toBe(500);
    expect(result).not.toHaveProperty('apiKey');
  });

  it('returns zero RentCast usage when config is absent', async () => {
    mock.deleteDocument(FIRESTORE_COLLECTIONS.systemConfig, 'rentcast.usage');
    const service = createAdminRentcastReadService({ authz: authz(), repository: repository() });
    const result = await service.getUsage(admin);
    expect(result.count).toBe(0);
  });

  it('reads lender rates from systemConfig with defaults fallback', async () => {
    const service = createAdminLenderReadService({ authz: authz(), repository: repository() });
    const configured = await service.getRates(admin);
    expect(configured.rates[0]?.id).toBe('NEO');
    expect(configured.updatedByEmail).toBe('admin@paperworking.test');

    mock.deleteDocument(FIRESTORE_COLLECTIONS.systemConfig, 'lender.rates');
    const defaults = await service.getRates(admin);
    expect(defaults.rates.length).toBeGreaterThan(0);
    expect(defaults.rates[0]?.id).toBe('NEO');
  });

  it('reads lender checklists from systemConfig', async () => {
    const service = createAdminLenderReadService({ authz: authz(), repository: repository() });
    const result = await service.getChecklists(admin);
    expect(result.checklists.Conventional).toEqual(['Tax Returns']);
  });

  it('lists synthetic agents with live Firestore counts', async () => {
    const service = createAdminAgentCrewReadService({ authz: authz(), repository: repository() });
    const result = await service.listAgents(admin);
    expect(result.count).toBe(1);
    expect(result.agents[0]).toMatchObject({
      id: 'uid-agent',
      persona: 'investor',
      stats: { projectsCount: 1, listingsCount: 1, messagesCount: 0 },
    });
  });

  it('reads and deletes synthetic agent by id', async () => {
    const read = createAdminAgentCrewReadService({ authz: authz(), repository: repository() });
    const got = await read.getAgent(admin, 'uid-agent');
    expect(got.success).toBe(true);

    const command = createAdminAgentCrewCommandService({
      authz: authz(),
      repository: repository(),
    });
    const deleted = await command.deleteAgent(admin, 'uid-agent');
    expect(deleted.success).toBe(true);
    expect(mock.getDocument(FIRESTORE_COLLECTIONS.users, 'uid-agent')).toBeNull();

    const missing = await command.deleteAgent(admin, 'uid-agent');
    expect(missing.success).toBe(false);
  });

  it('denies non-admin agent delete', async () => {
    const command = createAdminAgentCrewCommandService({
      authz: authz(),
      repository: repository(),
    });
    await expect(command.deleteAgent(investor, 'uid-agent')).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });
});
