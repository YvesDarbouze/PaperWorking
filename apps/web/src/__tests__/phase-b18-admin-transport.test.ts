import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBffApiPath } from '../../lib/api/bff-fetch';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '../..');

/** Phase D — no production browser apiFetch callers. */
const API_FETCH_ALLOWLIST = new Set<string>();

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

describe('phase B18 — admin BFF transport', () => {
  it('registers admin read routes in isBffApiPath', () => {
    expect(isBffApiPath('/api/admin/ops')).toBe(true);
    expect(isBffApiPath('/api/admin/rentcast-usage')).toBe(true);
    expect(isBffApiPath('/api/admin/lender-rates')).toBe(true);
    expect(isBffApiPath('/api/admin/lender-checklists')).toBe(true);
    expect(isBffApiPath('/api/admin/agent-crew')).toBe(true);
    expect(isBffApiPath('/api/admin/agent-crew/agent-1')).toBe(true);
  });

  it('admin ops hook uses same-origin helper', () => {
    const source = readFileSync(join(webRoot, 'components/admin/admin-ui.tsx'), 'utf8');
    expect(source).toContain('getAdminOpsFromBff');
    expect(source).not.toContain('apiFetch(');
  });

  it('admin overview infra reads use BFF helpers', () => {
    const source = readFileSync(join(webRoot, 'components/admin/AdminOverviewPanel.tsx'), 'utf8');
    expect(source).toContain('getAdminRentcastUsageFromBff');
    expect(source).not.toContain('apiFetch(');
  });

  it('Next admin routes delegate to shared services', () => {
    const ops = readFileSync(join(webRoot, 'app/api/admin/ops/route.ts'), 'utf8');
    expect(ops).toContain('buildAdminOpsReadService');
    expect(ops).toContain('isAuthorizedAdmin');
  });
});

describe('phase B18 — global browser transport guard', () => {
  it('no production browser modules use apiFetch', () => {
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

  it('impersonation uses same-origin BFF (Phase D)', () => {
    const panel = readFileSync(join(webRoot, 'components/admin/AdminAgentCrewPanel.tsx'), 'utf8');
    const adminApi = readFileSync(join(webRoot, 'lib/admin/admin-api.ts'), 'utf8');
    expect(panel).toContain('impersonateAdminAgentFromBff');
    expect(adminApi).toContain('/impersonate');
  });
});

describe('phase B18 — NEXT_PUBLIC_API_URL scope', () => {
  it('client.ts is not imported by admin browser modules', () => {
    const adminApi = readFileSync(join(webRoot, 'lib/admin/admin-api.ts'), 'utf8');
    expect(adminApi).not.toContain("from '@/lib/api/client'");
  });

  it('migrated admin modules avoid direct NEXT_PUBLIC_API_URL reads', () => {
    const adminUi = readFileSync(join(webRoot, 'components/admin/admin-ui.tsx'), 'utf8');
    const lender = readFileSync(join(webRoot, 'components/admin/AdminLenderConfigPanel.tsx'), 'utf8');
    expect(adminUi).not.toContain('NEXT_PUBLIC_API_URL');
    expect(lender).not.toContain('NEXT_PUBLIC_API_URL');
  });
});
