import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '@/proxy';

describe('BUG-005 — /admin Server-Side Edge Guard', () => {
  it('1. Redirects unauthenticated visitor on /admin to /login?redirectTo=%2Fadmin', () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: '__e2e_test=1',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?redirectTo=%2Fadmin');
  });

  it('2. Redirects unauthenticated visitor on nested /admin/users to /login?redirectTo=%2Fadmin%2Fusers', () => {
    const req = new NextRequest('http://localhost:3000/admin/users', {
      headers: {
        cookie: '__e2e_test=1',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login?redirectTo=%2Fadmin%2Fusers');
  });

  it('3. Returns 403 Forbidden when authenticated non-admin (investor) visits /admin', async () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: '__session=mock_token; user_role=investor',
        'x-user-role': 'investor',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(403);

    const body = await res.text();
    expect(body).toBe('403 Forbidden. Admin privileges required.');
  });

  it('4. Returns 403 Forbidden when authenticated vendor visits nested /admin/tickets', async () => {
    const req = new NextRequest('http://localhost:3000/admin/tickets', {
      headers: {
        cookie: '__session=mock_token; user_role=vendor',
        'x-user-role': 'vendor',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(403);

    const body = await res.text();
    expect(body).toBe('403 Forbidden. Admin privileges required.');
  });

  it('5. Allows Platform Admin user to proceed to /admin', () => {
    const req = new NextRequest('http://localhost:3000/admin', {
      headers: {
        cookie: '__session=mock_token; user_role=Platform Admin',
        'x-user-role': 'Platform Admin',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(200);
  });

  it('6. Allows Lead Investor user to proceed to /admin/agent-crew', () => {
    const req = new NextRequest('http://localhost:3000/admin/agent-crew', {
      headers: {
        cookie: '__session=mock_token; user_role=Lead Investor',
        'x-user-role': 'Lead Investor',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(200);
  });
});
