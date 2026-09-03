import { describe, expect, it } from '@jest/globals';
import {
  AuthorizationService,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import { deriveAllProjectMetrics } from '@paperworking/financial-engine';
import {
  buildLivePortfolioReport,
  ReportsGenerateValidationError,
} from '../reports/build-live-portfolio-report.js';
import type { ProjectKpiReadRepository } from '../projects/project-kpi-read-repository.js';
import type { ReportsReadRepository } from '../reports/reports-read-repository.js';

const owner: AuthUser = {
  uid: 'user-1',
  email: 'owner@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeStore(): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [{ id: 'org-1' }],
    findActiveOrgMemberships: async () => [],
    findProjectById: async (id) =>
      id === 'p1'
        ? {
            id: 'p1',
            userId: 'user-1',
            investorId: 'user-1',
            organizationId: 'org-1',
            name: '123 Main',
            purchasePrice: 400_000,
            currentPhase: 2,
          }
        : null,
    findActiveProjectMember: async () => null,
    findDealById: async () => null,
    findActiveProjectMemberByUserId: async () => null,
    findActiveOrgMember: async () => null,
    findOrganizationOwnedBy: async () => null,
    findActiveOrgMemberInOrgs: async () => null,
    findOrganizationOwnedByUserInOrgs: async () => null,
    findMessageInThreadForUser: async () => null,
    findAnyMessageInThread: async () => null,
  };
}

describe('buildLivePortfolioReport', () => {
  it('builds portfolio report from accessible Firestore projects without seed deal id', async () => {
    const reportsRepository: ReportsReadRepository = {
      listAccessibleProjects: async () => [
        {
          id: 'p1',
          name: '123 Main',
          title: '123 Main',
          purchasePrice: 400_000,
          currentPhase: 2,
          organizationId: 'org-1',
        },
      ],
      findProjectById: async (id) =>
        id === 'p1'
          ? {
              id: 'p1',
              name: '123 Main',
              title: '123 Main',
              purchasePrice: 400_000,
              currentPhase: 2,
              organizationId: 'org-1',
            }
          : null,
    };
    const kpiRepository: ProjectKpiReadRepository = {
      findProjectKpiInputs: async () => ({
        id: 'p1',
        purchasePrice: 400_000,
        currentPhase: 2,
        phaseData: {
          gross_scheduled_rent: 180_000,
          operating_expenses: {
            tax: 5000,
            insurance: 3000,
            security: 0,
            maintenance: 4000,
            utilities: 2000,
            management: 1500,
            HOA: 0,
          },
        },
      }),
      listRecentApprovedTransactions: async () => [],
    };

    const report = await buildLivePortfolioReport(
      owner,
      {
        authz: new AuthorizationService(makeStore()),
        reportsRepository,
        kpiRepository,
        deriveMetrics: deriveAllProjectMetrics,
      },
      'quarterly',
      'csv',
    );

    expect(report.metrics.projectId).toBe('portfolio');
    expect(report.projectCount).toBe(1);
    expect(report.csvContent).toContain('123 Main');
    expect(report.executiveSummary).not.toContain('proj_demo_1');
  });

  it('rejects generation when user has no accessible projects', async () => {
    const reportsRepository: ReportsReadRepository = {
      listAccessibleProjects: async () => [],
      findProjectById: async () => null,
    };
    const kpiRepository: ProjectKpiReadRepository = {
      findProjectKpiInputs: async () => null,
      listRecentApprovedTransactions: async () => [],
    };

    await expect(
      buildLivePortfolioReport(
        owner,
        {
          authz: new AuthorizationService(makeStore()),
          reportsRepository,
          kpiRepository,
        },
        'monthly',
        'pdf',
      ),
    ).rejects.toBeInstanceOf(ReportsGenerateValidationError);
  });
});
