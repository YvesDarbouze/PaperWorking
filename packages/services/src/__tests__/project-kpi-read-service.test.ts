import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  AuthzNotFoundError,
  type AuthUser,
  type AuthzStore,
  type StoredProject,
} from '@paperworking/authz';
import { canonicalSeedDeal, deriveAllProjectMetrics } from '@paperworking/financial-engine';
import {
  createProjectKpiReadService,
  ProjectsReadValidationError,
  type ProjectKpiReadRepository,
} from '../projects/index.js';

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

const projectA: StoredProject = {
  id: 'p1',
  userId: 'user-1',
  investorId: 'user-1',
  organizationId: 'org-1',
  name: '123 Main',
  purchasePrice: 400_000,
  currentPhase: 2,
};

const foreignProject: StoredProject = {
  id: 'p2',
  userId: 'other-user',
  investorId: 'other-user',
  organizationId: 'org-2',
  name: '456 Oak',
  purchasePrice: 500_000,
  currentPhase: 1,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [{ id: 'org-1' }],
    findActiveOrgMemberships: async () => [],
    findProjectById: async (id) => {
      if (id === 'p1') return projectA;
      if (id === 'p2') return foreignProject;
      return null;
    },
    findActiveProjectMember: async () => null,
    findDealById: async () => null,
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
  overrides: Partial<ProjectKpiReadRepository> = {},
): ProjectKpiReadRepository {
  return {
    findProjectKpiInputs: jest.fn(async (id) =>
      id === 'p1'
        ? { id: 'p1', purchasePrice: 400_000, currentPhase: 2, phaseData: {} }
        : null,
    ),
    listRecentApprovedTransactions: jest.fn(async () => []),
    ...overrides,
  };
}

describe('ProjectKpiReadService', () => {
  it('returns scorecard envelope via financial-engine for authorized owner', async () => {
    const repository = makeRepository();
    const service = createProjectKpiReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
      deriveMetrics: deriveAllProjectMetrics,
    });

    const result = await service.getCurrentProjectKpis(investor, 'p1');

    expect(result.success).toBe(true);
    expect(result.id).toBe('p1');
    expect(result.kpis.scorecard.noi.value).not.toBeNull();
    expect(result.kpis.scorecard.capRate.value).not.toBeNull();
    expect(result.kpis.snapshotAt).toBeTruthy();
    expect(result.kpis.sourceStatus).toBe('partially_projected');
    expect(result.kpis.scorecardTrust.noi).toBe('PARTIALLY_PROJECTED');
    expect(result.kpis.scorecard.noi.projected).toBe(true);
    expect(result.trendStatus).toBe('demo');
    expect(result.trends).toHaveLength(6);
    expect(result.trendsEnvelope.trendStatus).toBe('demo');
    expect(result.recentActivityStatus).toBe('empty');
  });

  it('matches canonical seed golden NOI when purchase price maps to engine inputs', async () => {
    const repository = makeRepository({
      findProjectKpiInputs: async () => ({
        id: 'canonical-seed-deal-id',
        purchasePrice: canonicalSeedDeal.purchase_price,
        currentPhase: 3,
      }),
    });
    const service = createProjectKpiReadService({
      authz: new AuthorizationService(
        makeStore({
          findProjectById: async () => ({
            ...projectA,
            id: 'canonical-seed-deal-id',
            purchasePrice: canonicalSeedDeal.purchase_price,
          }),
        }),
      ),
      repository,
      deriveMetrics: deriveAllProjectMetrics,
    });

    const result = await service.getCurrentProjectKpis(investor, 'canonical-seed-deal-id');
    expect(result.kpis.scorecard.noi.value).toBeCloseTo(12485, 0);
    expect(result.kpis.scorecard.capRate.value).toBeCloseTo(4.5, 1);
  });

  it('denies foreign project access', async () => {
    const service = createProjectKpiReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
      deriveMetrics: deriveAllProjectMetrics,
    });

    await expect(service.getCurrentProjectKpis(investor, 'p2')).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });

  it('returns not found for missing project in authz store', async () => {
    const service = createProjectKpiReadService({
      authz: new AuthorizationService(makeStore({ findProjectById: async () => null })),
      repository: makeRepository(),
      deriveMetrics: deriveAllProjectMetrics,
    });

    await expect(service.getCurrentProjectKpis(investor, 'missing')).rejects.toBeInstanceOf(
      AuthzNotFoundError,
    );
  });

  it('requires project id', async () => {
    const service = createProjectKpiReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
    });

    await expect(service.getCurrentProjectKpis(investor, '  ')).rejects.toBeInstanceOf(
      ProjectsReadValidationError,
    );
  });

  it('client accountType spoof does not expose foreign KPI data', async () => {
    const service = createProjectKpiReadService({
      authz: new AuthorizationService(makeStore()),
      repository: makeRepository(),
      deriveMetrics: deriveAllProjectMetrics,
    });

    const spoofed: AuthUser = {
      uid: 'user-1',
      email: 'investor@example.com',
      accountType: 'admin',
      isAdmin: false,
    };

    await expect(service.getCurrentProjectKpis(spoofed, 'p2')).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });

  it('maps recent transactions into activity feed', async () => {
    const repository = makeRepository({
      listRecentApprovedTransactions: async () => [
        {
          id: 't1',
          payee: 'Tenant A',
          category: 'RENT_INCOME',
          amount: 2000,
          transactionDate: '2025-06-01T00:00:00.000Z',
        },
      ],
    });
    const service = createProjectKpiReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
      deriveMetrics: deriveAllProjectMetrics,
    });

    const result = await service.getCurrentProjectKpis(investor, 'p1');
    expect(result.recentActivity).toHaveLength(1);
    expect(result.recentActivity[0]?.payee).toBe('Tenant A');
    expect(result.recentActivityStatus).toBe('actual');
    expect(result.trendStatus).toBe('demo');
  });
});
