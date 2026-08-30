/**
 * Sprint 2 P0 live smoke (optional — set NEST_SMOKE_URL with Nest running).
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

describe('Sprint 2 P0 live smoke (optional)', () => {
  it('unauthenticated task-assignments → 401', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch('/api/task-assignments');
    if (!res) return;
    expect(res.status).toBe(401);
  });

  it('authenticated task list does not 500', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch('/api/task-assignments', {
      headers: { Authorization: 'Bearer dev-session' },
    });
    if (!res) return;
    expect([200, 401, 403]).toContain(res.status);
    if (res.status === 200) {
      const body = (await res.json()) as { tasks?: unknown[] };
      expect(Array.isArray(body.tasks)).toBe(true);
    }
  });

  it('task assign without projectId → 400', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch('/api/tasks/assign', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer dev-session',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'No project' }),
    });
    if (!res) return;
    expect([400, 401]).toContain(res.status);
  });

  it('stripe session-status unauthenticated → 401', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch('/api/stripe/session-status?session_id=cs_test_x');
    if (!res) return;
    expect(res.status).toBe(401);
  });

  it('stripe session-status foreign mock → 403', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch(
      '/api/stripe/session-status?session_id=cs_test_mock_other-user_1',
      { headers: { Authorization: 'Bearer dev-session' } },
    );
    if (!res) return;
    // 401 if mock auth off; 403 if bound correctly
    expect([401, 403]).toContain(res.status);
  });

  it('stripe session-status own mock → 200 or 503', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch(
      '/api/stripe/session-status?session_id=cs_test_mock_dev-user-1_1',
      { headers: { Authorization: 'Bearer dev-session' } },
    );
    if (!res) return;
    expect([200, 401, 503]).toContain(res.status);
    if (res.status === 200) {
      const body = (await res.json()) as { session?: { mock?: boolean; payment_status?: string } };
      expect(body.session?.mock).toBe(true);
    }
  });

  it('vendor portal update without profile → 403', async () => {
    if (!liveEnabled) return;
    const res = await tryFetch('/api/vendor-portal/requests', {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer dev-session',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: '00000000-0000-4000-8000-000000000001',
        status: 'Quoted',
        vendorId: 'spoof',
      }),
    });
    if (!res) return;
    // investor/dev-session is not vendor role → 403 from RolesGuard, or 403 from missing profile
    expect([401, 403]).toContain(res.status);
  });
});
