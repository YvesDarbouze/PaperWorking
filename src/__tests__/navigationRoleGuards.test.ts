import { proxy } from '@/proxy';
import { NextRequest } from 'next/server';

describe('Navigation & Role Security Guards (NAV-01 to NAV-05)', () => {
  it('redirects Vendor accounts away from /dashboard/deals to /dashboard/marketplace', () => {
    const req = new NextRequest('http://localhost:3000/dashboard/deals', {
      headers: { host: 'localhost:3000' },
    });
    // Set __session and __acct=vendor
    req.cookies.set('__session', 'valid_session_token');
    req.cookies.set('__acct', 'vendor');

    const res = proxy(req);
    expect(res.status).toBe(307); // NextResponse.redirect
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard/marketplace');
  });

  it('allows Investor accounts to visit /dashboard/deals', () => {
    const req = new NextRequest('http://localhost:3000/dashboard/deals', {
      headers: { host: 'localhost:3000' },
    });
    req.cookies.set('__session', 'valid_session_token');
    req.cookies.set('__acct', 'investor');

    const res = proxy(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects unauthenticated visits to /dashboard/deals to /login with redirectTo', () => {
    const req = new NextRequest('http://localhost:3000/dashboard/deals', {
      headers: { host: 'localhost:3000' },
    });
    req.cookies.set('__e2e_test', '1');

    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?redirectTo=%2Fdashboard%2Fdeals');
  });

  it('issues 301 permanent redirect for /dashboard/data-room to /dashboard/projects', () => {
    const req = new NextRequest('http://localhost:3000/dashboard/data-room', {
      headers: { host: 'localhost:3000' },
    });
    req.cookies.set('__session', 'valid_session_token');

    const res = proxy(req);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('http://localhost:3000/dashboard/projects');
  });
});
