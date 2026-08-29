/**
 * Sprint 2 P2 — Vendor organization attach (pure logic).
 */
import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';

function resolveTrustedOrgId(
  user: { uid: string; orgIds: string[] } | null,
  clientOrgId?: string,
): string {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  if (clientOrgId) {
    if (!user.orgIds.includes(clientOrgId)) {
      throw new ForbiddenException({ error: 'Forbidden', reason: 'organization' });
    }
    return clientOrgId;
  }
  if (!user.orgIds[0]) {
    throw new ForbiddenException({ error: 'Forbidden', reason: 'organization' });
  }
  return user.orgIds[0];
}

function createVendor(
  user: { uid: string; email?: string; orgIds: string[] } | null,
  body: Record<string, unknown>,
) {
  if (!user) throw new ForbiddenException({ error: 'Unauthenticated' });
  void body.vendorId;
  void body.userId;
  void body.ownerId;

  const organizationId = resolveTrustedOrgId(
    user,
    typeof body.organizationId === 'string' ? body.organizationId : undefined,
  );
  return {
    success: true,
    vendor: {
      organizationId,
      name: String(body.name),
      contactEmail: user.email,
      // spoofed vendor id ignored
      id: 'v-new',
    },
  };
}

describe('Sprint 2 P2 — vendor org attach', () => {
  const user = { uid: 'u1', email: 'v@test.com', orgIds: ['org-a'] };

  it('authorized association → success', () => {
    const r = createVendor(user, { name: 'Acme', organizationId: 'org-a' });
    expect(r.vendor.organizationId).toBe('org-a');
  });

  it('unauthenticated → rejected', () => {
    expect(() => createVendor(null, { name: 'X', organizationId: 'org-a' })).toThrow(
      ForbiddenException,
    );
  });

  it('foreign organization → rejected', () => {
    expect(() =>
      createVendor(user, { name: 'X', organizationId: 'org-foreign' }),
    ).toThrow(ForbiddenException);
  });

  it('spoofed organization ID → rejected', () => {
    expect(() =>
      createVendor(user, { name: 'X', organizationId: 'org-b', vendorId: 'v-other' }),
    ).toThrow(ForbiddenException);
  });

  it('spoofed vendor ID does not change identity', () => {
    const r = createVendor(user, {
      name: 'Acme',
      organizationId: 'org-a',
      vendorId: 'v-other',
      userId: 'other',
    });
    expect(r.vendor.contactEmail).toBe('v@test.com');
    expect(r.vendor.id).toBe('v-new');
  });

  it('unauthorized user with no org → rejected', () => {
    expect(() =>
      createVendor({ uid: 'lone', orgIds: [] }, { name: 'X' }),
    ).toThrow(ForbiddenException);
  });
});
