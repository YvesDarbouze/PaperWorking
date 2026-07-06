import { NextRequest } from 'next/server';
import { proxy } from '../proxy';

/* ═══════════════════════════════════════════════════════
   Coverage for the edge middleware (src/proxy.ts):
     • /pricing bounces an already-subscribed, logged-in user to /dashboard
     • /pricing stays put for a logged-in user with no active plan
     • /pricing stays put for a guest (no session)
     • /dashboard still requires a session (pre-existing behaviour)
   ═══════════════════════════════════════════════════════ */

function encodeSub(plan: string, status: string): string {
  return Buffer.from(JSON.stringify({ plan, status })).toString('base64');
}

function makeRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return new NextRequest(`http://localhost${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

describe('proxy middleware', () => {
  it('redirects a logged-in, subscribed user away from /pricing to /dashboard', () => {
    const req = makeRequest('/pricing', {
      __session: 'valid-session-cookie',
      __sub: encodeSub('Individual', 'active'),
    });
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/dashboard');
  });

  it('also redirects a trialing subscriber (not just fully active)', () => {
    const req = makeRequest('/pricing', {
      __session: 'valid-session-cookie',
      __sub: encodeSub('Individual', 'trialing'),
    });
    const res = proxy(req);
    expect(res.headers.get('location')).toBe('http://localhost/dashboard');
  });

  it('lets a logged-in user with no active plan see /pricing', () => {
    const req = makeRequest('/pricing', {
      __session: 'valid-session-cookie',
      __sub: encodeSub('None', 'inactive'),
    });
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets a logged-in user with a cancelled plan see /pricing', () => {
    const req = makeRequest('/pricing', {
      __session: 'valid-session-cookie',
      __sub: encodeSub('Individual', 'canceled'),
    });
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets a guest (no session) see /pricing', () => {
    const req = makeRequest('/pricing');
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not redirect away from /pricing when the __sub cookie is missing', () => {
    const req = makeRequest('/pricing', { __session: 'valid-session-cookie' });
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not redirect away from /pricing when the __sub cookie is malformed', () => {
    const req = makeRequest('/pricing', { __session: 'valid-session-cookie', __sub: 'not-valid-base64-json!!' });
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('still requires a session for /dashboard (pre-existing gate, unaffected)', () => {
    const req = makeRequest('/dashboard/command-center');
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/login?redirectTo=%2Fdashboard%2Fcommand-center');
  });

  it('lets a subscribed, logged-in vendor into /dashboard normally (unaffected by the /pricing change)', () => {
    const req = makeRequest('/dashboard/command-center', {
      __session: 'valid-session-cookie',
      __sub: encodeSub('Individual', 'active'),
    });
    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });
});
