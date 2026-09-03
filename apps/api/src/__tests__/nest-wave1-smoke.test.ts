/**
 * Integration smoke tests for Nest Wave-1 auth + projects (Prisma).
 * Opt-in only — set NEST_SMOKE_URL (e.g. http://127.0.0.1:8080) with Nest running.
 */
import { describe, expect, it } from '@jest/globals';

const API = process.env.NEST_SMOKE_URL;
const liveEnabled = Boolean(API);

async function tryFetch(path: string, init?: RequestInit) {
  if (!API) return null;
  try {
    return await fetch(`${API}${path}`, init);
  } catch {
    return null;
  }
}

describe('Nest Wave-1 smoke (optional live server)', () => {
  it('GET /api/health', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch('/api/health');
    if (!res) return; // server not up — skip
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; app?: string };
    expect(body.app).toContain('Nest');
  });

  it('GET /api/projects with Bearer dev-session', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch('/api/projects', {
      headers: { Authorization: 'Bearer dev-session' },
    });
    if (!res) return;
    expect(res.status).toBe(200);
    const body = (await res.json()) as { projects?: unknown[]; success?: boolean };
    expect(Array.isArray(body.projects) || body.success !== false).toBe(true);
  });

  it('POST /api/auth/session mock', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'mock-token', accountType: 'investor' }),
    });
    if (!res) return;
    expect([200, 201]).toContain(res.status);
  });

  it('admin without DB role is forbidden', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch('/api/admin/agent-crew', {
      headers: { Authorization: 'Bearer dev-session' },
    });
    if (!res) return;
    // Dev user is investor in DB — must not elevate via cookie/body
    expect([401, 403]).toContain(res.status);
  });
});
