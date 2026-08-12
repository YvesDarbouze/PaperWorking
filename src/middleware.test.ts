import { NextRequest, NextResponse } from 'next/server';
import { proxy } from './proxy';

describe('Root Middleware / Proxy Integration Tests', () => {
  it('1. Returns 403 JSON when non-subscriber hits /deals', async () => {
    const req = new NextRequest('http://localhost:3000/deals', {
      headers: {
        'x-user-role': 'investor',
        'x-subscription-status': 'inactive',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(403);

    const body = await res?.json();
    expect(body).toEqual({ error: 'Subscription required to access the Deals Marketplace.' });
  });

  it('2. Redirects vendor to /vendor/marketplace when vendor hits /deals', () => {
    const req = new NextRequest('http://localhost:3000/deals', {
      headers: {
        'x-user-role': 'vendor',
        'x-account-type': 'vendor',
        'x-subscription-status': 'active',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(307);
    expect(res?.headers.get('location')).toContain('/vendor/marketplace');
  });

  it('3. Allows active subscriber on /deals', () => {
    const req = new NextRequest('http://localhost:3000/deals?autofocus=true', {
      headers: {
        'x-user-role': 'investor',
        'x-subscription-status': 'active',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(200);
  });

  it('4. Tracks direct slug access when visiting /deals/[slug] directly without portfolio referer', () => {
    const req = new NextRequest('http://localhost:3000/deals/123mainstaustintx78701', {
      headers: {
        'x-user-role': 'investor',
        'x-subscription-status': 'active',
      },
    });

    const res = proxy(req);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(200);
    expect(res?.headers.get('x-marketplace-direct-access')).toBe('true');
  });
});
