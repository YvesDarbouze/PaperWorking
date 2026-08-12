import { NextRequest, NextResponse } from 'next/server';
import { requireNonVendor, isVendorUser } from './requireNonVendor';

describe('requireNonVendor Middleware', () => {
  it('correctly identifies vendor role and accountType', () => {
    expect(isVendorUser({ role: 'vendor' })).toBe(true);
    expect(isVendorUser({ role: 'Vendor' })).toBe(true);
    expect(isVendorUser({ accountType: 'vendor' })).toBe(true);
    expect(isVendorUser({ role: 'investor', accountType: 'investor' })).toBe(false);
    expect(isVendorUser(null)).toBe(false);
  });

  it('redirects vendor user to /vendor/marketplace with flash message', () => {
    const req = new NextRequest('http://localhost:3000/deals');
    const response = requireNonVendor(req, { role: 'vendor' });
    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(307);
    const location = response?.headers.get('location') || '';
    expect(location).toContain('/vendor/marketplace');

    const decodedLocation = decodeURIComponent(location.replace(/\+/g, ' '));
    expect(decodedLocation).toContain(
      "flash=Vendor accounts can only see the Vendor's Marketplace. They cannot see the Deal's Marketplace."
    );
  });

  it('returns null for non-vendor users (allowing request)', () => {
    const req = new NextRequest('http://localhost:3000/deals');
    const response = requireNonVendor(req, { role: 'investor', subscriptionStatus: 'active' });
    expect(response).toBeNull();
  });
});
