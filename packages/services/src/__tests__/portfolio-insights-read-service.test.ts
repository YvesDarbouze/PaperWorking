import { describe, expect, it, jest } from '@jest/globals';
import type { AuthUser, AuthorizationService } from '@paperworking/authz';
import { AuthzForbiddenError } from '@paperworking/authz';
import {
  createPortfolioInsightsReadService,
  type PortfolioInsightsReadRepository,
} from '../insights/index.js';

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function authz(overrides: Partial<AuthorizationService> = {}): AuthorizationService {
  return {
    assertPermission: jest.fn(),
    accessibleProjectsWhere: jest.fn(async () => ({ ownerId: 'user-1' })),
    ...overrides,
  } as unknown as AuthorizationService;
}

describe('PortfolioInsightsReadService', () => {
  it('requires projects.read permission', async () => {
    const assertPermission = jest.fn(() => {
      throw new AuthzForbiddenError({ error: 'Forbidden' });
    });
    const service = createPortfolioInsightsReadService({
      authz: authz({ assertPermission }),
      repository: { listAccessibleProjects: jest.fn(async () => []) },
    });
    await expect(service.getPortfolioInsights(investor)).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
    expect(assertPermission).toHaveBeenCalledWith(investor, 'projects.read');
  });

  it('aggregates only accessible projects from repository where clause', async () => {
    const accessibleProjectsWhere = jest.fn(async () => ({ OR: [{ ownerId: 'user-1' }] }));
    const listAccessibleProjects = jest.fn(async () => [
      { purchasePrice: 100_000, city: 'Austin', currentPhase: 1 },
      { purchasePrice: 200_000, city: 'Austin', currentPhase: 3 },
      { purchasePrice: 50_000, city: 'Denver', currentPhase: 1 },
    ]);
    const service = createPortfolioInsightsReadService({
      authz: authz({ accessibleProjectsWhere }),
      repository: { listAccessibleProjects },
    });
    const result = await service.getPortfolioInsights(investor);
    expect(accessibleProjectsWhere).toHaveBeenCalledWith(investor);
    expect(listAccessibleProjects).toHaveBeenCalledWith({ OR: [{ ownerId: 'user-1' }] });
    expect(result.dataQuality).toBe('project_rollup');
    expect(result.insights.projectCount).toBe(3);
    expect(result.insights.totalExposure).toBe(350_000);
    expect(result.categories.length).toBeGreaterThan(0);
  });

  it('does not expand scope from client query param', async () => {
    const accessibleProjectsWhere = jest.fn(async () => ({ ownerId: 'user-1' }));
    const service = createPortfolioInsightsReadService({
      authz: authz({ accessibleProjectsWhere }),
      repository: { listAccessibleProjects: jest.fn(async () => []) },
    });
    await service.getPortfolioInsights(investor, 'admin-global');
    expect(accessibleProjectsWhere).toHaveBeenCalledWith(investor);
  });

  it('accountType spoof on AuthUser does not bypass authz where clause', async () => {
    const accessibleProjectsWhere = jest.fn(async () => ({ ownerId: 'user-1' }));
    const repository: PortfolioInsightsReadRepository = {
      listAccessibleProjects: jest.fn(async () => []),
    };
    const service = createPortfolioInsightsReadService({
      authz: authz({ accessibleProjectsWhere }),
      repository,
    });
    await service.getPortfolioInsights({ ...investor, accountType: 'admin', isAdmin: false });
    expect(accessibleProjectsWhere).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'user-1' }),
    );
  });
});
