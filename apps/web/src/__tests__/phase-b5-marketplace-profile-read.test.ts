import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuthUser } from '@paperworking/authz';
import {
  createMarketplaceProfileReadService,
  type MarketplaceProfileReadRepository,
  type MarketplaceProfileUserRow,
} from '@paperworking/services';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bffFetch, bffJson, bffUrl, isBffApiPath } from '../../lib/api/bff-fetch.js';
import {
  buildHandlerDeps,
  buildMarketplaceProfileReadService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';
import { resolveAuthUserFromRequest } from '../../lib/api/server-session.js';

const investor: AuthUser = {
  uid: 'user-1',
  email: 'investor@example.com',
  accountType: 'investor',
  isAdmin: false,
};

function userRow(): MarketplaceProfileUserRow {
  return {
    id: 'user-1',
    email: 'investor@example.com',
    displayName: 'Investor One',
    name: 'Investor One',
    accountType: 'investor',
    companyName: null,
    avatarUrl: null,
  };
}

describe('phase B5 — bffFetch transport for marketplace profile GET', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          profile: { displayName: 'Investor One', followerCount: 3 },
        }),
        { status: 200 },
      ),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('bffUrl keeps relative /api/marketplace/profile path', () => {
    expect(bffUrl('/api/marketplace/profile')).toBe('/api/marketplace/profile');
  });

  it('isBffApiPath matches marketplace profile read route', () => {
    expect(isBffApiPath('/api/marketplace/profile')).toBe(true);
    expect(isBffApiPath('/api/marketplace/investors/follow')).toBe(true);
  });

  it('bffFetch for marketplace profile does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/marketplace/profile');
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/marketplace/profile',
      expect.objectContaining({ credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });

  it('bffJson parses marketplace profile response', async () => {
    global.fetch = jest.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          profile: { displayName: 'Investor One', followerCount: 3 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    ) as typeof fetch;
    const data = await bffJson<{ profile: { displayName: string } }>(
      '/api/marketplace/profile',
    );
    expect(data.profile.displayName).toBe('Investor One');
  });
});

describe('phase B5 — api-provider marketplace profile transport', () => {
  it('dashboardOverview uses bffFetch for GET /api/marketplace/profile', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../lib/data/api-provider.ts'), 'utf8');
    expect(source).toMatch(
      /bffFetch\('\/api\/marketplace\/profile'/,
    );
    expect(source).not.toMatch(
      /apiFetch\('\/api\/marketplace\/profile'/,
    );
  });

  it('dashboardOverview direct reads are fully same-origin via bffFetch', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../lib/data/api-provider.ts'), 'utf8');
    const dashboardBlock = source.slice(
      source.indexOf('async dashboardOverview'),
      source.indexOf('async inboxThreads'),
    );
    expect(dashboardBlock).toContain("bffFetch('/api/portfolio/metrics?period=monthly'");
    expect(dashboardBlock).toContain("bffFetch('/api/marketplace/profile'");
    expect(dashboardBlock).toContain("bffFetch('/api/projects'");
    expect(dashboardBlock).not.toContain("apiFetch('/api/");
  });
});

describe('phase B5 — marketplace profile auth boundary', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('unauthenticated request resolves no AuthUser (route returns 401)', async () => {
    const user = await resolveAuthUserFromRequest(
      new Request('http://localhost/api/marketplace/profile'),
    );
    expect(user).toBeNull();
  });

  it('shared service only queries profile for authenticated uid', async () => {
    const findUserByUid = jest.fn(async () => userRow());
    const repository: MarketplaceProfileReadRepository = {
      findUserByUid,
      countFollowing: async () => 0,
      countFollowers: async () => 0,
    };
    const service = createMarketplaceProfileReadService({ repository });

    await service.getMarketplaceProfile(investor);
    expect(findUserByUid).toHaveBeenCalledWith('user-1');
  });
});

describe('phase B5 — buildMarketplaceProfileReadService wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('builds shared marketplace profile read service from handler deps', () => {
    if (!process.env.DATABASE_URL?.trim()) {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    }
    const service = buildMarketplaceProfileReadService(buildHandlerDeps());
    expect(typeof service.getMarketplaceProfile).toBe('function');
  });
});

describe('phase B5 — Next GET /api/marketplace/profile route adapter', () => {
  it('route resolves AuthUser and delegates to shared service', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, '../../app/api/marketplace/profile/route.ts'), 'utf8');
    expect(source).toContain('resolveAuthUserFromRequest');
    expect(source).toMatch(/if \(!user\)[\s\S]*401/);
    expect(source).toContain('buildMarketplaceProfileReadService');
    expect(source).toContain('getMarketplaceProfile');
  });
});
