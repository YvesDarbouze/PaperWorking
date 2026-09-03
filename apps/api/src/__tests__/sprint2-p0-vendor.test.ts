/**
 * Sprint 2 P0 — Vendor bid update IDOR unit tests.
 * Pure logic mirrors vendors.service updatePortalRequest ownership rules.
 */
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

type Vendor = { id: string; contactEmail: string | null; organizationId: string };
type Bid = { id: string; vendorId: string; status: string };

function resolveTrustedVendor(
  user: { email?: string | null },
  vendors: Vendor[],
): Vendor | null {
  if (!user.email) return null;
  return vendors.find((v) => v.contactEmail === user.email) ?? null;
}

function updatePortalRequest(
  user: { uid: string; email?: string | null },
  body: Record<string, unknown>,
  vendors: Vendor[],
  bids: Bid[],
): { success: true; request: Bid } {
  const bidId = String(body.id || body.bidId || '');
  if (!bidId) throw new ForbiddenException({ error: 'id required' });

  // Client spoof fields are ignored
  void body.vendorId;
  void body.organizationId;
  void body.ownerId;

  const vendor = resolveTrustedVendor(user, vendors);
  if (!vendor) {
    throw new ForbiddenException({ error: 'Forbidden', reason: 'vendor_profile_required' });
  }

  const bid = bids.find((b) => b.id === bidId && b.vendorId === vendor.id);
  if (!bid) {
    throw new ForbiddenException({ error: 'Forbidden', reason: 'bid' });
  }

  return {
    success: true,
    request: {
      ...bid,
      status: typeof body.status === 'string' ? body.status : bid.status,
    },
  };
}

describe('Sprint 2 P0 — vendor bid IDOR', () => {
  const vendors: Vendor[] = [
    { id: 'v-own', contactEmail: 'vendor@paperworking.test', organizationId: 'org-a' },
    { id: 'v-foreign', contactEmail: 'other@paperworking.test', organizationId: 'org-b' },
  ];
  const bids: Bid[] = [
    { id: 'bid-own', vendorId: 'v-own', status: 'Pending' },
    { id: 'bid-foreign', vendorId: 'v-foreign', status: 'Pending' },
  ];
  const user = { uid: 'vendor-1', email: 'vendor@paperworking.test' };

  it('authorized vendor update → success', () => {
    const result = updatePortalRequest(
      user,
      { id: 'bid-own', status: 'Quoted', vendorId: 'v-foreign' },
      vendors,
      bids,
    );
    expect(result.success).toBe(true);
    expect(result.request.status).toBe('Quoted');
    // Spoofed vendorId must not change ownership
    expect(result.request.vendorId).toBe('v-own');
  });

  it('missing vendor relationship → rejected', () => {
    expect(() =>
      updatePortalRequest(
        { uid: 'x', email: 'nobody@paperworking.test' },
        { id: 'bid-own', status: 'Quoted' },
        vendors,
        bids,
      ),
    ).toThrow(ForbiddenException);
  });

  it('foreign vendor bid → rejected', () => {
    expect(() =>
      updatePortalRequest(user, { id: 'bid-foreign', status: 'Quoted' }, vendors, bids),
    ).toThrow(ForbiddenException);
  });

  it('foreign organization spoof does not unlock bid', () => {
    expect(() =>
      updatePortalRequest(
        user,
        { id: 'bid-foreign', organizationId: 'org-b', vendorId: 'v-foreign' },
        vendors,
        bids,
      ),
    ).toThrow(ForbiddenException);
  });

  it('client ownerId spoof → still requires session vendor', () => {
    expect(() =>
      updatePortalRequest(
        { uid: 'attacker', email: null },
        { id: 'bid-own', ownerId: 'vendor-1', vendorId: 'v-own' },
        vendors,
        bids,
      ),
    ).toThrow(ForbiddenException);
  });
});
