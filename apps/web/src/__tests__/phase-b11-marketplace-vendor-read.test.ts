import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  AuthorizationService,
  AuthzForbiddenError,
  type AuthUser,
  type AuthzStore,
} from '@paperworking/authz';
import {
  createMarketplaceInvestorsReadService,
  createVendorPortalReadService,
  type MarketplaceInvestorsReadRepository,
} from '@paperworking/services';
import { bffFetch, isBffApiPath } from '../../lib/api/bff-fetch.js';
import {
  buildHandlerDeps,
  buildMarketplaceInvestorsReadService,
  buildVendorPortalReadService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

describe('phase B11 — bffFetch transport', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, investors: [], profiles: [], following: [] }), {
        status: 200,
      }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('isBffApiPath matches marketplace and vendor read routes', () => {
    expect(isBffApiPath('/api/marketplace/investors')).toBe(true);
    expect(isBffApiPath('/api/marketplace/investors/abc')).toBe(true);
    expect(isBffApiPath('/api/marketplace/listings')).toBe(true);
    expect(isBffApiPath('/api/vendors')).toBe(true);
    expect(isBffApiPath('/api/vendor-portal/profile')).toBe(true);
    expect(isBffApiPath('/api/vendor-portal/requests')).toBe(true);
    expect(isBffApiPath('/api/marketplace/investors/follow')).toBe(true);
  });

  it('bffFetch marketplace investors avoids NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/marketplace/investors', { credentials: 'include' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/marketplace/investors',
      expect.objectContaining({ credentials: 'include' }),
    );
  });
});

describe('phase B11 — Next route wiring', () => {
  it('routes delegate to shared read services', () => {
    const investors = readFileSync(
      join(here, '../../app/api/marketplace/investors/route.ts'),
      'utf8',
    );
    const investorDetail = readFileSync(
      join(here, '../../app/api/marketplace/investors/[id]/route.ts'),
      'utf8',
    );
    const vendors = readFileSync(join(here, '../../app/api/vendors/route.ts'), 'utf8');
    const portalProfile = readFileSync(
      join(here, '../../app/api/vendor-portal/profile/route.ts'),
      'utf8',
    );

    expect(investors).toContain('buildMarketplaceInvestorsReadService');
    expect(investorDetail).toContain('buildMarketplaceInvestorsReadService');
    expect(vendors).toContain('buildVendorsReadService');
    expect(portalProfile).toContain('buildVendorPortalReadService');
    expect(investors).not.toContain('prisma.');
  });

  it('browser read callers migrated off apiFetch', () => {
    const marketplace = readFileSync(
      join(here, '../../components/marketplace/VendorMarketplacePanel.tsx'),
      'utf8',
    );
    const investorProfile = readFileSync(
      join(here, '../../components/marketplace/InvestorProfilePanel.tsx'),
      'utf8',
    );
    const vendorProfile = readFileSync(
      join(here, '../../components/vendor-portal/VendorProfilePanel.tsx'),
      'utf8',
    );
    const vendorRequests = readFileSync(
      join(here, '../../components/vendor-portal/VendorRequestsPanel.tsx'),
      'utf8',
    );

    expect(marketplace).toContain('listMarketplaceInvestorsFromBff');
    expect(marketplace).toContain('listVendorsFromBff');
    expect(investorProfile).toContain('getMarketplaceInvestorFromBff');
    expect(vendorProfile).toContain('getVendorPortalProfileFromBff');
    expect(vendorRequests).toContain('listVendorPortalRequestsFromBff');

    expect(marketplace).not.toMatch(/apiFetch\([^)]*\/api\/marketplace\/investors['"]\s*,\s*\{/);
    expect(vendorProfile).not.toMatch(/apiFetch\([^)]*GET.*vendor-portal\/profile/);
  });

  it('mutations use same-origin BFF helpers', () => {
    const investorProfile = readFileSync(
      join(here, '../../components/marketplace/InvestorProfilePanel.tsx'),
      'utf8',
    );
    const vendorProfile = readFileSync(
      join(here, '../../components/vendor-portal/VendorProfilePanel.tsx'),
      'utf8',
    );
    const vendorRequests = readFileSync(
      join(here, '../../components/vendor-portal/VendorRequestsPanel.tsx'),
      'utf8',
    );

    expect(investorProfile).toContain('setMarketplaceInvestorFollowFromBff');
    expect(vendorProfile).toContain('updateVendorPortalProfileFromBff');
    expect(vendorRequests).toContain('updateVendorPortalRequestFromBff');
  });
});

describe('phase B11 — public field protection', () => {
  it('investor list serializer omits email', async () => {
    const repository: MarketplaceInvestorsReadRepository = {
      listInvestors: async () => [
        {
          id: 'inv-1',
          name: 'Secret Name',
          displayName: 'Public Name',
          companyName: null,
          avatarUrl: null,
          accountType: 'investor',
        },
      ],
      findInvestorById: async () => null,
      countFollowers: async () => 0,
      listFollowingIds: async () => [],
      isFollowing: async () => false,
      listListings: async () => [],
    };

    const service = createMarketplaceInvestorsReadService({ repository });
    const result = await service.listInvestors();
    expect(result.investors[0]).not.toHaveProperty('email');
  });
});

describe('phase B11 — build services wiring', () => {
  afterEach(() => {
    resetHandlerDepsForTests();
  });

  it('returns marketplace/vendor read services', () => {
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
    const deps = buildHandlerDeps();
    expect(typeof buildMarketplaceInvestorsReadService(deps).listInvestors).toBe('function');
    expect(typeof buildVendorPortalReadService(deps).listPortalRequests).toBe('function');
  });
});

describe('phase B11 — vendor portal self-scope', () => {
  it('investor cannot read vendor portal profile', async () => {
    const service = createVendorPortalReadService({
      repository: {
        findVendorByContactEmail: async () => null,
        listVendorBids: async () => [],
      },
    });

    await expect(
      service.getPortalProfile({
        uid: 'investor-1',
        email: 'investor@example.com',
        accountType: 'investor',
        isAdmin: false,
      }),
    ).rejects.toBeInstanceOf(AuthzForbiddenError);
  });
});
