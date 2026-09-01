import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBffApiPath } from '../../lib/api/bff-fetch';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '../..');

/** Privileged admin exception — impersonation retained on legacy Nest (Phase B18). */
const API_FETCH_ALLOWLIST = new Set([
  'components/admin/AdminAgentCrewPanel.tsx',
  'lib/admin/admin-api.ts',
  'lib/api/client.ts',
]);

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = full.slice(webRoot.length + 1);
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('__tests__')) continue;
    const st = statSync(full);
    if (st.isDirectory()) walkTsx(full, out);
    else if (entry.endsWith('.tsx') || (entry.endsWith('.ts') && !entry.endsWith('.test.ts'))) {
      out.push(rel);
    }
  }
  return out;
}

describe('phase B17 — profile & insights BFF transport', () => {
  it('registers profile and insights routes in isBffApiPath', () => {
    expect(isBffApiPath('/api/settings/profile')).toBe(true);
    expect(isBffApiPath('/api/insights')).toBe(true);
  });

  it('profile settings panel uses same-origin profile helper', () => {
    const panel = readFileSync(join(webRoot, 'components/settings/ProfileSettingsPanel.tsx'), 'utf8');
    expect(panel).toContain('updateProfileFromBff');
    expect(panel).not.toContain('apiFetch(');
    expect(panel).not.toContain('/api/settings/profile');
  });

  it('portfolio insights panel uses same-origin insights helper', () => {
    const panel = readFileSync(join(webRoot, 'components/insights/PortfolioInsightsPanel.tsx'), 'utf8');
    expect(panel).toContain('getPortfolioInsightsFromBff');
    expect(panel).not.toContain('apiFetch(');
  });

  it('api-provider profilePreview uses getProfileFromBff', () => {
    const provider = readFileSync(join(webRoot, 'lib/data/api-provider.ts'), 'utf8');
    expect(provider).toContain('getProfileFromBff');
    expect(provider).not.toMatch(/apiJson[\s\S]*\/api\/settings\/profile/);
    expect(provider).not.toContain('apiFetch(');
  });

  it('Next profile route delegates to shared services', () => {
    const route = readFileSync(join(webRoot, 'app/api/settings/profile/route.ts'), 'utf8');
    expect(route).toContain('buildProfileReadService');
    expect(route).toContain('buildProfileCommandService');
  });

  it('Next insights route delegates to shared portfolio insights service', () => {
    const route = readFileSync(join(webRoot, 'app/api/insights/route.ts'), 'utf8');
    expect(route).toContain('buildPortfolioInsightsReadService');
  });
});

describe('phase B17 — global browser transport guard (admin-only apiFetch)', () => {
  it('no unexpected apiFetch in production browser modules', () => {
    const files = walkTsx(webRoot);
    const violations: string[] = [];

    for (const rel of files) {
      if (rel.includes('/src/__tests__/')) continue;
      if (rel === 'lib/api/client.ts') continue;
      const content = readFileSync(join(webRoot, rel), 'utf8');
      if (!content.includes('apiFetch(')) continue;
      if (!API_FETCH_ALLOWLIST.has(rel)) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });

  it('allowlisted apiFetch callers are privileged admin exception only after B18', () => {
    expect([...API_FETCH_ALLOWLIST].sort()).toEqual(
      [
        'components/admin/AdminAgentCrewPanel.tsx',
        'lib/admin/admin-api.ts',
        'lib/api/client.ts',
      ].sort(),
    );
  });
});

describe('phase B17 — bffFetch avoids NEXT_PUBLIC_API_URL for profile/insights', () => {
  it('profile-api uses bffJson/bffFetch not api client', () => {
    const source = readFileSync(join(webRoot, 'lib/settings/profile-api.ts'), 'utf8');
    expect(source).toContain('bffFetch');
    expect(source).not.toContain('NEXT_PUBLIC_API_URL');
    expect(source).not.toContain("from '@/lib/api/client'");
  });

  it('insights-api uses bffJson not api client', () => {
    const source = readFileSync(join(webRoot, 'lib/insights/insights-api.ts'), 'utf8');
    expect(source).toContain('bffJson');
    expect(source).not.toContain('NEXT_PUBLIC_API_URL');
    expect(source).not.toContain("from '@/lib/api/client'");
  });
});

describe('phase B17 — admin endpoint inventory (B18 prep)', () => {
  it('documents B18 admin transport: BFF reads + privileged impersonation exception', () => {
    const adminUi = readFileSync(join(webRoot, 'components/admin/admin-ui.tsx'), 'utf8');
    const overview = readFileSync(join(webRoot, 'components/admin/AdminOverviewPanel.tsx'), 'utf8');
    const lender = readFileSync(join(webRoot, 'components/admin/AdminLenderConfigPanel.tsx'), 'utf8');
    const crew = readFileSync(join(webRoot, 'components/admin/AdminAgentCrewPanel.tsx'), 'utf8');

    expect(adminUi).toContain('getAdminOpsFromBff');
    expect(overview).toContain('getAdminRentcastUsageFromBff');
    expect(lender).toContain('getAdminLenderRatesFromBff');
    expect(crew).toContain('impersonateAgentViaLegacyNest');
    expect(crew).toContain('deleteAdminAgentFromBff');
  });
});
