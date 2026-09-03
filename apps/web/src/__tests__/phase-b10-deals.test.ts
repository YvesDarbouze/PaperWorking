import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
  type StoredProject,
} from '@paperworking/authz';
import {
  createDealsCommandService,
  createDealsReadService,
  type DealsCommandRepository,
  type DealsReadRepository,
} from '@paperworking/services';
import { bffFetch, isBffApiPath } from '../../lib/api/bff-fetch.js';
import {
  buildDealsCommandService,
  buildDealsReadService,
  buildHandlerDeps,
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

describe('phase B10 — bffFetch transport for core deals', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, total: 0, deals: [] }), { status: 200 }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('isBffApiPath matches core deal routes', () => {
    expect(isBffApiPath('/api/deals')).toBe(true);
    expect(isBffApiPath('/api/deals/exists?slug=foo')).toBe(true);
    expect(isBffApiPath('/api/deals/broadcast')).toBe(true);
    expect(isBffApiPath('/api/deals/reply')).toBe(true);
  });

  it('bffFetch GET /api/deals does not use NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/deals?tab=discover', { credentials: 'include' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/deals?tab=discover',
      expect.objectContaining({ credentials: 'include' }),
    );
    const url = (global.fetch as jest.Mock).mock.calls[0]?.[0] as string;
    expect(url).not.toContain('run.app');
  });
});

describe('phase B10 — Next route wiring', () => {
  it('deals routes delegate to shared services', () => {
    const listRoute = readFileSync(join(here, '../../app/api/deals/route.ts'), 'utf8');
    const existsRoute = readFileSync(join(here, '../../app/api/deals/exists/route.ts'), 'utf8');

    expect(listRoute).toContain('buildDealsReadService');
    expect(listRoute).toContain('buildDealsCommandService');
    expect(existsRoute).toContain('buildDealsReadService');
    expect(listRoute).not.toContain('prisma.');
    expect(existsRoute).not.toContain('prisma.');
  });

  it('core browser callers migrated off apiFetch for list/exists/create', () => {
    const marketplace = readFileSync(
      join(here, '../../components/marketplace/DealsMarketplacePanel.tsx'),
      'utf8',
    );
    const vendor = readFileSync(
      join(here, '../../components/marketplace/VendorMarketplacePanel.tsx'),
      'utf8',
    );
    const addressSearch = readFileSync(
      join(here, '../../components/deals/AddressSearch.tsx'),
      'utf8',
    );
    const wizard = readFileSync(
      join(here, '../../app/(dashboard)/projects/new/page.tsx'),
      'utf8',
    );

    expect(marketplace).toContain('listDealsFromBff');
    expect(marketplace).toContain('createDealFromBff');
    expect(vendor).toContain('listDealsFromBff');
    expect(addressSearch).toContain('checkDealExistsFromBff');
    expect(wizard).toContain('createDealFromBff');
    expect(wizard).toContain('patchProjectFromBff');
    expect(marketplace).not.toMatch(/apiFetch\([^)]*\/api\/deals/);
  });

  it('broadcast/reply use same-origin BFF transport (Phase B13)', () => {
    const broadcast = readFileSync(
      join(here, '../../components/marketplace/DealBroadcastModal.tsx'),
      'utf8',
    );
    const external = readFileSync(
      join(here, '../../app/(marketing)/deals/[slug]/external/page.tsx'),
      'utf8',
    );
    expect(broadcast).toContain('broadcastDealFromBff');
    expect(external).toContain('replyToDealFromBff');
  });
});

describe('phase B10 — project wizard linking', () => {
  it('wizard links server deal id after project create', () => {
    const wizard = readFileSync(
      join(here, '../../app/(dashboard)/projects/new/page.tsx'),
      'utf8',
    );
    expect(wizard).toContain('createProjectFromBff');
    expect(wizard).toContain('patchProjectFromBff(created.id, { dealId })');
    expect(wizard).toContain('createDealFromBff(payload)');
    expect(wizard).not.toMatch(/createDealFromBff\([^)]*creatorId/);
  });
});

describe('phase B10 — buildDeals services wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('returns service instances', () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
    expect(typeof buildDealsReadService(buildHandlerDeps()).listDeals).toBe('function');
    expect(typeof buildDealsCommandService(buildHandlerDeps()).createDeal).toBe('function');
  });
});

describe('phase B10 — dealExists enumeration safety', () => {
  it('private deal returns exists:false', async () => {
    const repository: DealsReadRepository = {
      listDeals: async () => [],
      findBySlugOrId: async () => ({
        id: 'd1',
        slug: 'private-deal',
        status: 'draft',
        visibility: 'private',
        address: '1 Private Ln',
      }),
      findBySlug: async () => null,
    };
    const service = createDealsReadService({
      authz: new AuthorizationService(makeStore()),
      repository,
    });

    const result = await service.dealExists('private-deal');
    expect(result).toEqual({ exists: false, deal: null });
  });
});

describe('phase B10 — security', () => {
  it('foreign project denied on deal create', async () => {
    const repository: DealsCommandRepository = {
      findBySlug: async () => null,
      findById: async () => null,
      create: async () => {
        throw new Error('should not create');
      },
    };
    const service = createDealsCommandService({
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
    });

    await expect(
      service.createDeal(investor, { address: '100 Main', projectId: 'p2' }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });
});
