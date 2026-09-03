import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBffApiPath } from '../../lib/api/bff-fetch';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '../..');

/** Privileged admin exception — impersonation retained on legacy Nest transport (Phase B18). */
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

describe('phase B16 — reports BFF transport', () => {
  it('registers reports routes in isBffApiPath', () => {
    expect(isBffApiPath('/api/reports/portfolio')).toBe(true);
    expect(isBffApiPath('/api/reports/generate')).toBe(true);
    expect(isBffApiPath('/api/reports/monthly')).toBe(true);
  });

  it('report panels use same-origin reports helpers', () => {
    const portfolio = readFileSync(join(webRoot, 'components/reports/PortfolioReportsPanel.tsx'), 'utf8');
    const project = readFileSync(join(webRoot, 'components/reports/ProjectReportsPanel.tsx'), 'utf8');
    expect(portfolio).toContain('getPortfolioReportFromBff');
    expect(portfolio).toContain('generateReportExportFromBff');
    expect(portfolio).not.toContain('apiFetch(');
    expect(project).toContain('getPeriodReportFromBff');
    expect(project).not.toContain('apiFetch(');
  });

  it('Next reports routes delegate to shared services', () => {
    const portfolio = readFileSync(join(webRoot, 'app/api/reports/portfolio/route.ts'), 'utf8');
    const generate = readFileSync(join(webRoot, 'app/api/reports/generate/route.ts'), 'utf8');
    const period = readFileSync(join(webRoot, 'app/api/reports/[period]/route.ts'), 'utf8');
    expect(portfolio).toContain('buildReportsReadService');
    expect(generate).toContain('buildReportsGenerateService');
    expect(period).toContain('buildReportsReadService');
  });
});

describe('phase B16 — global browser transport guard', () => {
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

  it('allowlisted apiFetch callers are privileged admin exception only (B18)', () => {
    expect([...API_FETCH_ALLOWLIST].sort()).toEqual(
      [
        'components/admin/AdminAgentCrewPanel.tsx',
        'lib/admin/admin-api.ts',
        'lib/api/client.ts',
      ].sort(),
    );
  });
});

describe('phase B16 — hardcoded Cloud Run URL guard', () => {
  it('production components do not embed run.app hosts', () => {
    const files = walkTsx(webRoot).filter((rel) => !rel.includes('/src/__tests__/'));
    const violations: string[] = [];
    for (const rel of files) {
      const content = readFileSync(join(webRoot, rel), 'utf8');
      if (/run\.app|paperworking-api-\d+\./.test(content)) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });
});
