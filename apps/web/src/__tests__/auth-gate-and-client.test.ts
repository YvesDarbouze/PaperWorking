import { jest } from '@jest/globals';
import { apiFetch, isRedirecting, resetApiAuthRedirectState } from '../../lib/api/client.js';
import { middleware, config } from '../../middleware.js';
import { NextRequest } from 'next/server';

describe('Fix B: Client-side apiFetch wrapper', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetApiAuthRedirectState();
    (globalThis as unknown as { window: unknown }).window = {
      location: {
        href: 'http://localhost:3000/dashboard/team',
        pathname: '/dashboard/team',
        search: '',
        assign: jest.fn(),
        replace: jest.fn(),
      },
      sessionStorage: {
        removeItem: jest.fn(),
      },
      dispatchEvent: jest.fn(),
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete (globalThis as unknown as { window?: unknown }).window;
    jest.restoreAllMocks();
  });

  const mockFetchResponse = (body: unknown, status = 200) => {
    const response = new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
    const fn = jest.fn<() => Promise<Response>>().mockResolvedValue(response);
    global.fetch = fn as unknown as typeof fetch;
    return fn;
  };

  it('passes through successful responses and includes credentials', async () => {
    const fetchSpy = mockFetchResponse({ data: 'ok' }, 200);

    const res = await apiFetch('/api/vendors');
    expect(fetchSpy).toHaveBeenCalledWith('/api/vendors', {
      credentials: 'include',
    });
    expect(res.status).toBe(200);
    expect(isRedirecting()).toBe(false);
  });

  it('redirects to /login?next= on 401 from a DATA endpoint', async () => {
    mockFetchResponse({ error: 'Unauthorized' }, 401);

    const win = (globalThis as unknown as { window: { location: { href: string }; sessionStorage: { removeItem: jest.Mock }; dispatchEvent: jest.Mock } }).window;

    const res = await apiFetch('/api/portfolio/metrics?period=monthly');
    expect(res.status).toBe(401);
    expect(isRedirecting()).toBe(true);
    expect(win.location.href).toBe('/login?next=%2Fdashboard%2Fteam');
    expect(win.sessionStorage.removeItem).toHaveBeenCalledWith('pw_auth_redirect');
    expect(win.dispatchEvent).toHaveBeenCalled();
  });

  it('carve-out 1: does NOT redirect on 401 from /api/auth/* endpoints', async () => {
    mockFetchResponse({ user: null }, 401);

    const win = (globalThis as unknown as { window: { location: { href: string } } }).window;

    const res = await apiFetch('/api/auth/me');
    expect(res.status).toBe(401);
    expect(isRedirecting()).toBe(false);
    expect(win.location.href).toBe('http://localhost:3000/dashboard/team');
  });

  it('carve-out 2: does NOT redirect if already on /login', async () => {
    const win = (globalThis as unknown as { window: { location: { href: string; pathname: string; search: string } } }).window;
    win.location.href = 'http://localhost:3000/login';
    win.location.pathname = '/login';
    win.location.search = '';

    mockFetchResponse({ error: 'Invalid credentials' }, 401);

    const res = await apiFetch('/api/vendors');
    expect(res.status).toBe(401);
    expect(isRedirecting()).toBe(false);
    expect(win.location.href).toBe('http://localhost:3000/login');
  });

  it('deduplicates multiple in-flight 401 cascades into a single redirect', async () => {
    mockFetchResponse({ error: 'Unauthorized' }, 401);

    const win = (globalThis as unknown as { window: { location: { href: string } } }).window;

    // Simulate 3 parallel calls triggered by component mount
    const [res1, res2, res3] = await Promise.all([
      apiFetch('/api/portfolio/metrics'),
      apiFetch('/api/marketplace/profile'),
      apiFetch('/api/projects'),
    ]);

    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
    expect(res3.status).toBe(401);
    expect(isRedirecting()).toBe(true);
    // Location href is set to the single login redirect destination
    expect(win.location.href).toBe('/login?next=%2Fdashboard%2Fteam');
  });
});

describe('Fix A: Server-side middleware auth gate', () => {
  it('redirects unauthenticated requests on /dashboard/team to /login?next=', () => {
    const request = new NextRequest('http://localhost:3000/dashboard/team');
    const response = middleware(request);

    expect(response.status).toBe(307);
    const redirectLocation = response.headers.get('location');
    expect(redirectLocation).toBe('http://localhost:3000/login?next=%2Fdashboard%2Fteam');
  });

  it('preserves query parameters in next parameter', () => {
    const request = new NextRequest('http://localhost:3000/dashboard/team?view=compact&sort=name');
    const response = middleware(request);

    expect(response.status).toBe(307);
    const redirectLocation = response.headers.get('location');
    expect(redirectLocation).toBe(
      'http://localhost:3000/login?next=%2Fdashboard%2Fteam%3Fview%3Dcompact%26sort%3Dname',
    );
  });

  it('allows requests with valid __session cookie to proceed', () => {
    const request = new NextRequest('http://localhost:3000/dashboard/team', {
      headers: {
        cookie: '__session=valid_test_token_123',
      },
    });
    const response = middleware(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('allows /login and /api/auth requests to pass through without redirect loops', () => {
    const loginReq = new NextRequest('http://localhost:3000/login');
    const loginRes = middleware(loginReq);
    expect(loginRes.status).toBe(200);
    expect(loginRes.headers.get('location')).toBeNull();

    const authReq = new NextRequest('http://localhost:3000/api/auth/me');
    const authRes = middleware(authReq);
    expect(authRes.status).toBe(200);
    expect(authRes.headers.get('location')).toBeNull();
  });

  it('protects defined matcher routes while excluding public routes', () => {
    expect(config.matcher).toContain('/dashboard/:path*');
    expect(config.matcher).toContain('/projects/:path*');
    expect(config.matcher).not.toContain('/login');
    expect(config.matcher).not.toContain('/api/auth/:path*');
  });

  it('Item 1: gates dotted protected URL paths (e.g. /projects/foo.bar, /projects/my-project.v2) for unauthenticated users', () => {
    const req1 = new NextRequest('http://localhost:3000/projects/foo.bar');
    const res1 = middleware(req1);
    expect(res1.status).toBe(307);
    expect(res1.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fprojects%2Ffoo.bar');

    const req2 = new NextRequest('http://localhost:3000/projects/my-project.v2');
    const res2 = middleware(req2);
    expect(res2.status).toBe(307);
    expect(res2.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fprojects%2Fmy-project.v2');

    const req3 = new NextRequest('http://localhost:3000/dashboard/team.v1');
    const res3 = middleware(req3);
    expect(res3.status).toBe(307);
    expect(res3.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fdashboard%2Fteam.v1');
  });

  it('Item 1: static asset paths and well-known endpoints bypass middleware without gating', () => {
    const assets = [
      'http://localhost:3000/favicon.ico',
      'http://localhost:3000/logo.png',
      'http://localhost:3000/styles/main.css',
      'http://localhost:3000/scripts/bundle.js',
      'http://localhost:3000/fonts/inter.woff2',
      'http://localhost:3000/_next/static/chunks/app.js',
      'http://localhost:3000/.well-known/assetlinks.json',
    ];

    for (const url of assets) {
      const req = new NextRequest(url);
      const res = middleware(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    }
  });

  it('Item 2: forwards x-pathname header on pass-through requests for downstream layouts', () => {
    const request = new NextRequest('http://localhost:3000/dashboard/team?tab=active', {
      headers: {
        cookie: '__session=valid_test_token',
      },
    });
    const response = middleware(request);
    expect(response.status).toBe(200);
    // Next.js NextResponse.next() encodes mutated request headers into response
    const forwardedPath =
      response.headers.get('x-middleware-request-x-pathname') ??
      response.headers.get('x-pathname');
    expect(forwardedPath).toBe('/dashboard/team?tab=active');
  });

  it('Item 3: middleware contains no bypass path at all (no env vars, headers, or cookies can bypass the auth gate)', () => {
    // Attempting bypass with bypass headers or cookies without __session MUST still be gated
    const requestWithBypassHeaders = new NextRequest('http://localhost:3000/dashboard/team', {
      headers: {
        'x-arbitrary-bypass': 'true',
        'x-bypass-attempt': 'true',
        cookie: '__bypass_attempt=true; custom_token=test',
      },
    });
    const response = middleware(requestWithBypassHeaders);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/login?next=%2Fdashboard%2Fteam');
  });
});
