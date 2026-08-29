/**
 * Live security smoke for Sprint 1 P0 (optional — skips if Nest not up).
 *
 * Verifies:
 * - POST /api/deals creates a Prisma-backed deal
 * - GET /api/projects/:id returns 403 for a foreign/nonexistent-owned probe
 * - POST /api/auth/session with accountType=admin does not grant admin.access
 */
import { describe, expect, it } from '@jest/globals';

const API = process.env.NEST_SMOKE_URL || 'http://127.0.0.1:18080';

async function tryFetch(path: string, init?: RequestInit) {
  try {
    return await fetch(`${API}${path}`, init);
  } catch {
    return null;
  }
}

describe('Sprint 1 P0 live smoke (optional)', () => {
  it('POST /api/deals creates a deal for authenticated investor', async () => {
    const res = await tryFetch('/api/deals', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer dev-session',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address: '100 Security Test Ave, Austin, TX',
        slug: `sec-test-${Date.now()}`,
        purchasePrice: 100000,
        rehabCost: 10000,
        arv: 150000,
        holdingCosts: 5000,
        projectedRoi: 12.5,
        status: 'draft',
        visibility: 'private',
        creatorId: 'attacker-should-be-ignored',
      }),
    });
    if (!res) return;
    expect([200, 201]).toContain(res.status);
    const body = (await res.json()) as {
      success?: boolean;
      deal?: { creatorId?: string; address?: string };
    };
    expect(body.success).toBe(true);
    expect(body.deal?.address).toContain('Security Test');
    // creatorId must be session user, not client-supplied attacker id
    expect(body.deal?.creatorId).toBe('dev-user-1');
  });

  it('GET /api/projects/:id returns 403/404 for inaccessible id', async () => {
    const res = await tryFetch('/api/projects/00000000-0000-4000-8000-000000000099', {
      headers: { Authorization: 'Bearer dev-session' },
    });
    if (!res) return;
    // Not found (no row) or Forbidden — never 200 with another user's data
    expect([403, 404]).toContain(res.status);
  });

  it('accountType=admin in session body does not unlock admin routes', async () => {
    const sessionRes = await tryFetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'mock-token', accountType: 'admin' }),
    });
    if (!sessionRes) return;
    expect([200, 201]).toContain(sessionRes.status);

    const adminRes = await tryFetch('/api/admin/agent-crew', {
      headers: { Authorization: 'Bearer dev-session' },
    });
    if (!adminRes) return;
    // Dev user is investor in DB — must not be admin via body
    expect([401, 403]).toContain(adminRes.status);
  });

  it('organization-members rejects foreign organizationId with 403', async () => {
    const res = await tryFetch(
      '/api/organization-members?organizationId=00000000-0000-4000-8000-000000000088',
      { headers: { Authorization: 'Bearer dev-session' } },
    );
    if (!res) return;
    expect(res.status).toBe(403);
  });
});
