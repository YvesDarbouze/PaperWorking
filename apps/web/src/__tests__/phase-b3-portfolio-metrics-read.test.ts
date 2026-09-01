import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import {
  aggregatePortfolioMetricsFromProjects,
  createPortfolioMetricsReadService,
  type PortfolioMetricsProjectRow,
  type PortfolioMetricsReadRepository,
} from '@paperworking/services';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bffFetch, bffJson, bffUrl, isBffApiPath } from '../../lib/api/bff-fetch.js';
import {
  buildHandlerDeps,
  buildPortfolioMetricsReadService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';
import { resolveAuthUserFromRequest } from '../../lib/api/server-session.js';

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function makeStore(overrides: Partial<AuthzStore> = {}): AuthzStore {
  return {
    findOrganizationsOwnedBy: async () => [],
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

describe('phase B3 — bffFetch transport for portfolio metrics GET', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          metrics: { projectCount: 0, totalPurchasePrice: 0 },
          portfolio: { totalPortfolioValue: 0 },
        }),
        { status: 200 },
      ),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('bffUrl keeps relative /api/portfolio/metrics path', () => {
    expect(bffUrl('/api/portfolio/metrics')).toBe('/api/portfolio/metrics');
  });

  it('isBffApiPath matches GET /api/portfolio/metrics only', () => {
    expect(isBffApiPath('/api/portfolio/metrics')).toBe(true);
    expect(isBffApiPath('/api/portfolio/metrics/extra')).toBe(false);
  });

  it('bffFetch for portfolio metrics does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/portfolio/metrics?period=monthly');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/portfolio/metrics?period=monthly',
      expect.objectContaining({ credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });

  it('bffJson parses portfolio metrics response', async () => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          metrics: { totalPurchasePrice: 500_000 },
          portfolio: { totalPortfolioValue: 500_000 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch;
    const data = await bffJson<{ metrics: { totalPurchasePrice: number } }>(
      '/api/portfolio/metrics?period=monthly',
    );
    expect(data.metrics.totalPurchasePrice).toBe(500_000);
  });
});

describe('phase B3 — api-provider portfolio metrics transport', () => {
  it('dashboardOverview uses bffFetch for GET /api/portfolio/metrics', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../lib/data/api-provider.ts'), 'utf8');
    expect(source).toMatch(
      /bffFetch\('\/api\/portfolio\/metrics\?period=monthly'/,
    );
    expect(source).not.toMatch(
      /apiFetch\('\/api\/portfolio\/metrics/,
    );
  });
});

describe('phase B3 — portfolio metrics auth boundary', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('unauthenticated request resolves no AuthUser (route returns 401)', async () => {
    const user = await resolveAuthUserFromRequest(
      new Request('http://localhost/api/portfolio/metrics?period=monthly'),
    );
    expect(user).toBeNull();
  });

  it('shared service and Nest adapter produce identical rollup from same fixture', async () => {
    const rows: PortfolioMetricsProjectRow[] = [
      { id: 'p1', purchasePrice: 100_000, currentPhase: 2, status: 'active' },
      { id: 'p2', purchasePrice: 250_000, currentPhase: 3, status: 'active' },
    ];
    const expected = aggregatePortfolioMetricsFromProjects(rows);

    const repository: PortfolioMetricsReadRepository = {
      listAccessibleProjects: async () => rows,
    };
    const service = createPortfolioMetricsReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.getPortfolioMetrics(investor);
    expect(result).toEqual(expected);
  });
});

describe('phase B3 — buildPortfolioMetricsReadService wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('builds shared portfolio metrics read service from handler deps', () => {
    if (!process.env.DATABASE_URL?.trim()) {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    }
    const service = buildPortfolioMetricsReadService(buildHandlerDeps());
    expect(typeof service.getPortfolioMetrics).toBe('function');
  });
});

describe('phase B3 — Next GET /api/portfolio/metrics route adapter', () => {
  it('route resolves AuthUser, passes period, and delegates to shared service', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../app/api/portfolio/metrics/route.ts'), 'utf8');
    expect(source).toContain('resolveAuthUserFromRequest');
    expect(source).toMatch(/if \(!user\)[\s\S]*401/);
    expect(source).toContain('buildPortfolioMetricsReadService');
    expect(source).toContain('getPortfolioMetrics');
    expect(source).toContain("searchParams.get('period')");
  });
});
