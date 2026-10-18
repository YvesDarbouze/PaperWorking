import { describe, expect, it } from '@jest/globals';
import { isRoleAtLeast, normalizeOrgRole } from '@paperworking/shared';

describe('isRoleAtLeast (org role hierarchy + legacy aliases)', () => {
  it('ranks canonical roles correctly', () => {
    expect(isRoleAtLeast('owner', 'admin')).toBe(true);
    expect(isRoleAtLeast('admin', 'member')).toBe(true);
    expect(isRoleAtLeast('member', 'viewer')).toBe(true);
    expect(isRoleAtLeast('viewer', 'member')).toBe(false);
  });

  it('maps legacy Firestore display roles to hierarchy roles', () => {
    expect(normalizeOrgRole('Lead Investor')).toBe('owner');
    expect(normalizeOrgRole('Managing Member')).toBe('owner');
    expect(normalizeOrgRole('Contributor')).toBe('member');
    expect(normalizeOrgRole('Guest')).toBe('viewer');
    expect(normalizeOrgRole('Manager')).toBe('admin');
  });

  it('treats personal-workspace "Lead Investor" memberships as owners', () => {
    expect(isRoleAtLeast('Lead Investor', 'viewer')).toBe(true);
    expect(isRoleAtLeast('Lead Investor', 'member')).toBe(true);
    expect(isRoleAtLeast('Lead Investor', 'admin')).toBe(true);
    expect(isRoleAtLeast('Lead Investor', 'owner')).toBe(true);
  });

  it('denies unknown roles', () => {
    expect(normalizeOrgRole('Random Label')).toBeNull();
    expect(isRoleAtLeast('Random Label', 'viewer')).toBe(false);
  });
});
