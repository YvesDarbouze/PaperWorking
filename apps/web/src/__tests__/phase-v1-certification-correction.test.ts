import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireBroadcastTokenSecret } from '@paperworking/services';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '../..');
const repoRoot = join(webRoot, '../..');

/** Privileged admin exception — impersonation retained on legacy Nest transport. */
const API_FETCH_ALLOWLIST = new Set([
  'components/admin/AdminAgentCrewPanel.tsx',
  'lib/admin/admin-api.ts',
  'lib/api/client.ts',
]);

function readWeb(rel: string): string {
  return readFileSync(join(webRoot, rel), 'utf8');
}

function walkTs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = full.slice(webRoot.length + 1);
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('__tests__')) continue;
    const st = statSync(full);
    if (st.isDirectory()) walkTs(full, out);
    else if (entry.endsWith('.tsx') || (entry.endsWith('.ts') && !entry.endsWith('.test.ts'))) {
      out.push(rel);
    }
  }
  return out;
}

describe('V1 certification correction — project routes', () => {
  it('collection route exposes GET and POST only', () => {
    const source = readWeb('app/api/projects/route.ts');
    expect(source).toMatch(/export async function GET/);
    expect(source).toMatch(/export async function POST/);
    expect(source).not.toMatch(/export async function DELETE/);
    expect(source).not.toMatch(/export async function PATCH/);
  });

  it('detail route exposes GET and PATCH only (no DELETE)', () => {
    const source = readWeb('app/api/projects/[id]/route.ts');
    expect(source).toMatch(/export async function GET/);
    expect(source).toMatch(/export async function PATCH/);
    expect(source).not.toMatch(/export async function DELETE/);
    expect(source).not.toMatch(/export async function POST/);
  });
});

describe('V1 certification correction — browser Nest transport', () => {
  it('only allowlisted files reference apiFetch(', () => {
    const violations: string[] = [];
    for (const rel of walkTs(webRoot)) {
      if (rel.includes('/src/__tests__/')) continue;
      const content = readWeb(rel);
      if (!content.includes('apiFetch(')) continue;
      if (rel === 'lib/api/client.ts') continue;
      if (!API_FETCH_ALLOWLIST.has(rel)) violations.push(rel);
    }
    expect(violations).toEqual([]);
  });

  it('single production impersonation caller uses legacy Nest helper', () => {
    const panel = readWeb('components/admin/AdminAgentCrewPanel.tsx');
    expect(panel).toContain('impersonateAgentViaLegacyNest');
    expect(panel).toContain('/impersonate');
  });
});

describe('V1 certification correction — broadcast token secret domain', () => {
  it('broadcast and deal-reply secrets use distinct resolver functions', () => {
    const source = readFileSync(
      join(repoRoot, 'packages/services/src/deals/broadcast-token.ts'),
      'utf8',
    );
    expect(source).toMatch(/function requireBroadcastTokenSecret/);
    expect(source).toMatch(/function resolveDealReplyWebhookSecret/);
    expect(source).toContain('BROADCAST_TOKEN_SECRET');
    expect(source).toContain('DEAL_REPLY_WEBHOOK_SECRET');
  });

  it('production fails closed when BROADCAST_TOKEN_SECRET is absent', () => {
    const prevNode = process.env.NODE_ENV;
    const prevSecret = process.env.BROADCAST_TOKEN_SECRET;
    process.env.NODE_ENV = 'production';
    delete process.env.BROADCAST_TOKEN_SECRET;
    try {
      expect(() => requireBroadcastTokenSecret()).toThrow(/BROADCAST_TOKEN_SECRET is required/);
    } finally {
      process.env.NODE_ENV = prevNode;
      if (prevSecret === undefined) delete process.env.BROADCAST_TOKEN_SECRET;
      else process.env.BROADCAST_TOKEN_SECRET = prevSecret;
    }
  });
});
