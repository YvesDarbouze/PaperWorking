import { describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import {
  aggregatePortfolioMetricsFromProjects,
  createPortfolioMetricsReadService,
  type PortfolioMetricsProjectRow,
  type PortfolioMetricsReadRepository,
} from '../portfolio/index.js';

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [{ id: 'org-1' }],
    findActiveOrgMemberships: async () => [],
    findProjectById: async () => null,
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

function project(
  overrides: Partial<PortfolioMetricsProjectRow> = {},
): PortfolioMetricsProjectRow {
  return {
    id: 'p1',
    purchasePrice: 100_000,
    currentPhase: 2,
    status: 'active',
    ...overrides,
  };
}

describe('aggregatePortfolioMetricsFromProjects', () => {
  it('aggregates purchase price and phase counts across projects', () => {
    const result = aggregatePortfolioMetricsFromProjects([
      project({ id: 'p1', purchasePrice: 100_000, currentPhase: 2, status: 'active' }),
      project({ id: 'p2', purchasePrice: 50_000, currentPhase: 3, status: 'hold' }),
      project({ id: 'p3', purchasePrice: 25_000, currentPhase: 4, status: 'exit' }),
    ]);

    expect(result).toEqual({
      success: true,
      metrics: {
        projectCount: 3,
        totalPurchasePrice: 175_000,
        estimatedPortfolioValue: null,
        estimatedPortfolioValueStatus: 'unavailable',
        byPhase: { acquisition: 0, purchase: 1, hold: 1, exit: 1 },
        activeCount: 2,
      },
      portfolio: {
        totalActiveProjects: 2,
        totalPortfolioValue: 175_000,
        portfolioNoi: null,
        portfolioCashFlow: null,
        totalCashInvested: 175_000,
        portfolioCapRate: null,
      },
    });
  });

  it('returns empty portfolio defaults', () => {
    const result = aggregatePortfolioMetricsFromProjects([]);
    expect(result.metrics.projectCount).toBe(0);
    expect(result.metrics.totalPurchasePrice).toBe(0);
    expect(result.metrics.activeCount).toBe(0);
    expect(result.portfolio.totalPortfolioValue).toBe(0);
    expect(result.portfolio.portfolioNoi).toBeNull();
  });

  it('treats null purchasePrice as zero', () => {
    const result = aggregatePortfolioMetricsFromProjects([
      project({ purchasePrice: null }),
    ]);
    expect(result.metrics.totalPurchasePrice).toBe(0);
  });
});

describe('PortfolioMetricsReadService', () => {
  it('enforces projects.read RBAC before loading projects', async () => {
    const listAccessibleProjects = jest.fn(async () => [] as PortfolioMetricsProjectRow[]);
    const repository: PortfolioMetricsReadRepository = { listAccessibleProjects };
    const service = createPortfolioMetricsReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    await service.getPortfolioMetrics(investor);
    expect(listAccessibleProjects).toHaveBeenCalled();
  });

  it('denies users without projects.read permission', async () => {
    const authz = {
      assertPermission: jest.fn(() => {
        throw new AuthzForbiddenError({ error: 'Forbidden', permission: 'projects.read' });
      }),
      accessibleProjectsWhere: jest.fn(async () => ({})),
    };
    const service = createPortfolioMetricsReadService({
      authz: authz as unknown as AuthorizationService,
      repository: { listAccessibleProjects: async () => [] },
    });

    await expect(service.getPortfolioMetrics(investor)).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });

  it('scopes repository query to accessibleProjectsWhere', async () => {
    const accessibleWhere = { OR: [{ userId: 'user-1' }] };
    const authz = {
      assertPermission: jest.fn(),
      accessibleProjectsWhere: jest.fn(async () => accessibleWhere),
    };
    const listAccessibleProjects = jest.fn(async () => [project()]);
    const service = createPortfolioMetricsReadService({
      authz: authz as unknown as AuthorizationService,
      repository: { listAccessibleProjects },
    });

    const result = await service.getPortfolioMetrics(investor);
    expect(listAccessibleProjects).toHaveBeenCalledWith(accessibleWhere);
    expect(result.metrics.projectCount).toBe(1);
  });

  it('ignores period input (Nest parity — period not used in live rollup)', async () => {
    const service = createPortfolioMetricsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: {
        listAccessibleProjects: async () => [project({ purchasePrice: 200_000 })],
      },
    });

    const monthly = await service.getPortfolioMetrics(investor, { period: 'monthly' });
    const overall = await service.getPortfolioMetrics(investor, { period: 'overall' });
    expect(monthly).toEqual(overall);
    expect(monthly.metrics.totalPurchasePrice).toBe(200_000);
  });

  it('does not expand portfolio when AuthUser accountType is spoofed', async () => {
    const listAccessibleProjects = jest.fn(async () => [project()]);
    const authz = {
      assertPermission: jest.fn(),
      accessibleProjectsWhere: jest.fn(async () => ({ OR: [{ userId: 'user-1' }] })),
    };
    const service = createPortfolioMetricsReadService({
      authz: authz as unknown as AuthorizationService,
      repository: { listAccessibleProjects },
    });

    const spoofed: AuthUser = {
      ...investor,
      accountType: 'admin',
      isAdmin: false,
    };

    await service.getPortfolioMetrics(spoofed);
    expect(authz.accessibleProjectsWhere).toHaveBeenCalledWith(spoofed);
    expect(listAccessibleProjects).toHaveBeenCalledWith({ OR: [{ userId: 'user-1' }] });
  });

  it('returns Nest-compatible envelope from repository rows only', async () => {
    const service = createPortfolioMetricsReadService({
      authz: new AuthorizationService(makeStore()),
      repository: {
        listAccessibleProjects: async () => [
          project({ id: 'owned', purchasePrice: 300_000, currentPhase: 1 }),
        ],
      },
    });

    const result = await service.getPortfolioMetrics(investor);
    expect(result.success).toBe(true);
    expect(result.metrics.totalPurchasePrice).toBe(300_000);
    expect(result.portfolio.totalPortfolioValue).toBe(300_000);
    expect(result.portfolio.portfolioNoi).toBeNull();
    expect(result.portfolio.portfolioCapRate).toBeNull();
  });
});

describe('PortfolioMetricsReadService — financial-engine boundary', () => {
  it('service module does not import @paperworking/financial-engine', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    const serviceSource = readFileSync(
      join(here, '../portfolio/portfolio-metrics-read-service.ts'),
      'utf8',
    );
    const aggregateSource = readFileSync(
      join(here, '../portfolio/aggregate-portfolio-metrics.ts'),
      'utf8',
    );
    expect(serviceSource).not.toContain('@paperworking/financial-engine');
    expect(aggregateSource).not.toContain('@paperworking/financial-engine');
  });
});
