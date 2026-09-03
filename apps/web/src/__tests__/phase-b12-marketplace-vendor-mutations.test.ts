import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { bffFetch, isBffApiPath } from '../../lib/api/bff-fetch.js';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

describe('phase B12 — bffFetch transport', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () =>
      new Response(JSON.stringify({ success: true, following: true, changed: true }), {
        status: 200,
      }),
    ) as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('isBffApiPath matches mutation routes', () => {
    expect(isBffApiPath('/api/marketplace/investors/follow')).toBe(true);
    expect(isBffApiPath('/api/vendor-portal/profile')).toBe(true);
    expect(isBffApiPath('/api/vendor-portal/requests')).toBe(true);
  });

  it('bffFetch follow mutation avoids NEXT_PUBLIC_API_URL', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://paperworking-api-779101817926.us-east4.run.app';
    await bffFetch('/api/marketplace/investors/follow', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'inv-1', follow: true }),
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/marketplace/investors/follow',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('phase B12 — Next route wiring', () => {
  it('mutation routes delegate to shared command services', () => {
    const follow = readFileSync(
      join(here, '../../app/api/marketplace/investors/follow/route.ts'),
      'utf8',
    );
    const profile = readFileSync(join(here, '../../app/api/vendor-portal/profile/route.ts'), 'utf8');
    const requests = readFileSync(
      join(here, '../../app/api/vendor-portal/requests/route.ts'),
      'utf8',
    );

    expect(follow).toContain('buildMarketplaceFollowCommandService');
    expect(profile).toContain('buildVendorPortalCommandService');
    expect(requests).toContain('buildVendorPortalCommandService');
    expect(follow).not.toContain('prisma.');
  });
});

describe('phase B12 — browser transport migration', () => {
  it('panels use BFF helpers for mutations', () => {
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

    expect(marketplace).toContain('setMarketplaceInvestorFollowFromBff');
    expect(investorProfile).toContain('setMarketplaceInvestorFollowFromBff');
    expect(vendorProfile).toContain('updateVendorPortalProfileFromBff');
    expect(vendorRequests).toContain('updateVendorPortalRequestFromBff');

    expect(marketplace).not.toContain("apiFetch('/api/marketplace/investors/follow'");
    expect(vendorProfile).not.toContain("apiFetch('/api/vendor-portal/profile'");
    expect(vendorRequests).not.toContain("apiFetch('/api/vendor-portal/requests'");
  });
});

describe('phase B12 — B11 read regression guard', () => {
  it('read routes still use read services only', () => {
    const investors = readFileSync(
      join(here, '../../app/api/marketplace/investors/route.ts'),
      'utf8',
    );
    expect(investors).toContain('buildMarketplaceInvestorsReadService');
    expect(investors).not.toContain('CommandService');
  });
});
