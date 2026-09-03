import { describe, expect, it } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireBroadcastTokenSecret } from '@paperworking/services';

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, '../..');
const repoRoot = join(webRoot, '../..');

/** Phase D — no production browser apiFetch callers remain (client.ts defines it only). */
const API_FETCH_ALLOWLIST = new Set<string>();

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
  it('no production browser modules reference apiFetch(', () => {
    const violations: string[] = [];
    for (const rel of walkTs(webRoot)) {
      if (rel.includes('/src/__tests__/')) continue;
      const content = readWeb(rel);
      if (content.includes('apiFetch(')) violations.push(rel);
    }
    expect(violations).toEqual([]);
  });

  it('impersonation uses same-origin BFF helper (Phase D)', () => {
    const panel = readWeb('components/admin/AdminAgentCrewPanel.tsx');
    const adminApi = readWeb('lib/admin/admin-api.ts');
    expect(panel).toContain('impersonateAdminAgentFromBff');
    expect(adminApi).toContain('/impersonate');
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
    const prevSecret = process.env.BROADCAST_TOKEN_SECRET;
    const prevNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: 'production',
      configurable: true,
      writable: true,
    });
    delete process.env.BROADCAST_TOKEN_SECRET;
    try {
      expect(() => requireBroadcastTokenSecret()).toThrow(/BROADCAST_TOKEN_SECRET is required/);
    } finally {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: prevNodeEnv,
        configurable: true,
        writable: true,
      });
      if (prevSecret === undefined) delete process.env.BROADCAST_TOKEN_SECRET;
      else process.env.BROADCAST_TOKEN_SECRET = prevSecret;
    }
  });
});
