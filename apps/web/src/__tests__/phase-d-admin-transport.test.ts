import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isBffApiPath } from '../../lib/api/bff-fetch';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '../..');

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

describe('phase D — admin BFF transport (post-impersonation migration)', () => {
  it('registers impersonate route in isBffApiPath', () => {
    expect(isBffApiPath('/api/admin/agent-crew/agent-1/impersonate')).toBe(true);
  });

  it('AdminAgentCrewPanel uses BFF impersonation helper', () => {
    const panel = readFileSync(join(webRoot, 'components/admin/AdminAgentCrewPanel.tsx'), 'utf8');
    expect(panel).toContain('impersonateAdminAgentFromBff');
    expect(panel).not.toContain('apiFetch(');
  });
});

describe('phase D — production browser apiFetch guard', () => {
  it('no production browser modules call apiFetch', () => {
    const files = walkTsx(webRoot);
    const violations: string[] = [];

    for (const rel of files) {
      if (rel.includes('/src/__tests__/')) continue;
      if (rel === 'lib/api/client.ts') continue;
      const content = readFileSync(join(webRoot, rel), 'utf8');
      if (content.includes('apiFetch(')) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('phase D — NEXT_PUBLIC_API_URL scope', () => {
  it('client.ts remains for scripts but is not imported by admin UI', () => {
    const adminApi = readFileSync(join(webRoot, 'lib/admin/admin-api.ts'), 'utf8');
    const panel = readFileSync(join(webRoot, 'components/admin/AdminAgentCrewPanel.tsx'), 'utf8');
    expect(adminApi).not.toContain('NEXT_PUBLIC_API_URL');
    expect(panel).not.toContain('NEXT_PUBLIC_API_URL');
  });
});
