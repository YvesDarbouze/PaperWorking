import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
  type StoredProject,
} from '@paperworking/authz';
import { canonicalSeedDeal, deriveAllProjectMetrics } from '@paperworking/financial-engine';
import {
  createProjectKpiReadService,
  type ProjectKpiReadRepository,
} from '@paperworking/services';
import { bffFetch, isBffApiPath } from '../../lib/api/bff-fetch.js';
import {
  buildHandlerDeps,
  buildProjectKpiReadService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

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
  purchasePrice: canonicalSeedDeal.purchase_price,
  currentPhase: 2,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [{ id: 'org-1' }],
    findActiveOrgMemberships: async () => [],
    findProjectById: async (id) => (id === 'p1' ? projectA : null),
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

describe('phase B9 — bffFetch transport for project KPI read', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          id: 'p1',
          kpis: { scorecard: { noi: { value: 12485 } }, snapshotAt: '2025-01-01' },
        }),
        { status: 200 },
      ),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('isBffApiPath matches KPI current route', () => {
    expect(isBffApiPath('/api/projects/p1/kpis/current')).toBe(true);
    expect(isBffApiPath('/api/projects/p1/kpis/breakdown')).toBe(false);
  });

  it('bffFetch GET KPI route does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/projects/p1/kpis/current', { credentials: 'include' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects/p1/kpis/current',
      expect.objectContaining({ credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });
});

describe('phase B9 — Next route wiring', () => {
  it('KPI route delegates to buildProjectKpiReadService', () => {
    const source = readFileSync(
      join(here, '../../app/api/projects/[id]/kpis/current/route.ts'),
      'utf8',
    );
    expect(source).toContain('buildProjectKpiReadService');
    expect(source).toContain('export async function GET');
    expect(source).not.toContain('deriveAllProjectMetrics');
    expect(source).not.toContain('prisma.');
  });

  it('insight panels use bffFetch for KPI current', () => {
    const scorecard = readFileSync(
      join(here, '../../components/insights/ProjectScorecardPanel.tsx'),
      'utf8',
    );
    const insights = readFileSync(
      join(here, '../../components/insights/ProjectInsightsPanel.tsx'),
      'utf8',
    );
    expect(scorecard).toContain('bffFetch(`/api/projects/${projectId}/kpis/current`');
    expect(insights).toContain('bffFetch(`/api/projects/${projectId}/kpis/current`');
    expect(scorecard).not.toMatch(/apiFetch\([^)]*kpis\/current/);
    expect(insights).not.toMatch(/apiFetch\([^)]*kpis\/current/);
  });
});

describe('phase B9 — financial-engine boundary', () => {
  it('Next KPI route does not embed financial formulas', () => {
    const route = readFileSync(
      join(here, '../../app/api/projects/[id]/kpis/current/route.ts'),
      'utf8',
    );
    const repo = readFileSync(
      join(here, '../../../../packages/database/src/firestore/create-firestore-project-kpi-read-repository.ts'),
      'utf8',
    );
    for (const source of [route, repo]) {
      expect(source).not.toContain('computeAmortizationSchedule');
      expect(source).not.toContain('cashOnCash =');
      expect(source).not.toContain('noi =');
    }
  });

  it('ProjectKpiReadService delegates metrics to financial-engine without seed income defaults', async () => {
    const repository: ProjectKpiReadRepository = {
      findProjectKpiInputs: async () => ({
        id: 'p1',
        purchasePrice: canonicalSeedDeal.purchase_price,
        currentPhase: 2,
        phaseData: {
          gross_scheduled_rent: canonicalSeedDeal.gross_scheduled_rent,
          operating_expenses: canonicalSeedDeal.operating_expenses,
        },
      }),
      listRecentApprovedTransactions: async () => [],
    };
    const service = createProjectKpiReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
      deriveMetrics: deriveAllProjectMetrics,
    });

    const result = await service.getCurrentProjectKpis(investor, 'p1');
    expect(result.kpis.scorecard.noi.value).not.toBeNull();
    expect(result.kpis.scorecard.noi.value).toBeGreaterThan(0);
    expect(result.kpis.inputProvenance.gross_scheduled_rent).toBe('REAL_DB');
    expect(result.kpis.inputProvenance.operating_expenses).toBe('REAL_DB');
  });
});

describe('phase B9 — buildProjectKpiReadService wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('returns service instance', () => {
    const service = buildProjectKpiReadService(buildHandlerDeps());
    expect(typeof service.getCurrentProjectKpis).toBe('function');
  });
});

describe('phase B9 — project browser transport audit', () => {
  it('no browser apiFetch calls remain under /api/projects*', () => {
    const scorecard = readFileSync(
      join(here, '../../components/insights/ProjectScorecardPanel.tsx'),
      'utf8',
    );
    const insights = readFileSync(
      join(here, '../../components/insights/ProjectInsightsPanel.tsx'),
      'utf8',
    );
    const newProject = readFileSync(
      join(here, '../../app/(dashboard)/projects/new/page.tsx'),
      'utf8',
    );
    const listPanel = readFileSync(
      join(here, '../../components/projects/ProjectsListPanel.tsx'),
      'utf8',
    );
    const workspace = readFileSync(
      join(here, '../../components/projects/ProjectWorkspaceProvider.tsx'),
      'utf8',
    );

    const sources = [scorecard, insights, newProject, listPanel, workspace].join('\n');
    expect(sources).not.toMatch(/apiFetch\(['"`]\/api\/projects/);
    expect(listPanel).toContain("bffFetch('/api/projects'");
    expect(workspace).toContain('bffFetch(`/api/projects/${projectId}`');
    expect(newProject).toContain('createProjectFromBff');
  });
});

describe('phase B9 — security', () => {
  it('foreign project KPI access denied', async () => {
    const repository: ProjectKpiReadRepository = {
      findProjectKpiInputs: async () => null,
      listRecentApprovedTransactions: async () => [],
    };
    const service = createProjectKpiReadService({
      authz: new AuthorizationService(
        makeStore({
          findProjectById: async () => ({
            id: 'p2',
            userId: 'other',
            investorId: 'other',
            organizationId: 'org-2',
          }),
        }),
      ),
      repository,
      deriveMetrics: deriveAllProjectMetrics,
    });

    await expect(service.getCurrentProjectKpis(investor, 'p2')).rejects.toBeInstanceOf(
      AuthzForbiddenError,
    );
  });
});
