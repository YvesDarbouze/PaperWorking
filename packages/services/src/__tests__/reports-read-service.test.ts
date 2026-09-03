import { describe, expect, it } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import { createReportsReadService } from '../reports/reports-read-service.js';
import type { ReportsReadRepository } from '../reports/reports-read-repository.js';

const investor: AuthUser = {
  uid: 'user-a',
  email: 'a@test.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeAuthz() {
  return {
    assertPermission: () => undefined,
    accessibleProjectsWhere: async () => ({ OR: [{ creatorId: 'user-a' }] }),
    assertProjectAccess: async () => undefined,
  };
}

describe('ReportsReadService — ACL', () => {
  it('rejects foreign projectId via assertProjectAccess', async () => {
    const repository: ReportsReadRepository = {
      listAccessibleProjects: async () => [],
      findProjectById: async () => null,
    };
    const authz = makeAuthz();
    authz.assertProjectAccess = async () => {
      throw Object.assign(new Error('Forbidden'), { name: 'AuthzForbiddenError', status: 403 });
    };
    const service = createReportsReadService({
      authz: authz as never,
      repository,
    });
    await expect(
      service.getPeriodReport(investor, 'monthly', { projectId: 'foreign-project' }),
    ).rejects.toThrow('Forbidden');
  });

  it('ignores spoofed organizationId', async () => {
    let capturedWhere: Record<string, unknown> | null = null;
    const repository: ReportsReadRepository = {
      listAccessibleProjects: async (where) => {
        capturedWhere = where;
        return [
          {
            id: 'p1',
            name: 'Demo',
            title: null,
            address: '123 Main',
            purchasePrice: 100000,
            currentPhase: 1,
            status: 'active',
          },
        ];
      },
      findProjectById: async () => null,
    };
    const service = createReportsReadService({
      authz: makeAuthz() as never,
      repository,
    });
    const result = await service.getPeriodReport(investor, 'monthly', {
      organizationId: 'org-spoof',
    });
    expect(capturedWhere).toEqual({ OR: [{ creatorId: 'user-a' }] });
    expect(result.totals.projects).toBe(1);
  });
});
