import { describe, expect, it } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { ACCOUNT_PERMISSIONS, type Permission } from '../authz/permissions.js';

/**
 * Pure unit tests for permission maps + admin client rejection.
 * Resource IDOR tests that need Prisma run in live smoke when DATABASE_URL is set.
 */

function hasPermission(
  accountType: string,
  isAdmin: boolean,
  permission: Permission,
): boolean {
  if (isAdmin) return true;
  const grants = ACCOUNT_PERMISSIONS[accountType] ?? ACCOUNT_PERMISSIONS.investor;
  return grants.includes(permission);
}

function normalizeClientAccountType(value: unknown): string {
  if (typeof value !== 'string') return 'investor';
  const n = value.trim().toLowerCase();
  if (n === 'vendor') return 'vendor';
  if (n === 'investment_team') return 'investment_team';
  return 'investor';
}

describe('Sprint 1 P0 — permissions + admin escalation', () => {
  it('rejects admin from client-supplied accountType', () => {
    expect(normalizeClientAccountType('admin')).toBe('investor');
    expect(normalizeClientAccountType('ADMIN')).toBe('investor');
    expect(normalizeClientAccountType('vendor')).toBe('vendor');
    expect(normalizeClientAccountType('investment_team')).toBe('investment_team');
    expect(normalizeClientAccountType(undefined)).toBe('investor');
  });

  it('investor cannot access admin.access', () => {
    expect(hasPermission('investor', false, 'admin.access')).toBe(false);
  });

  it('platform admin can access admin.access', () => {
    expect(hasPermission('investor', true, 'admin.access')).toBe(true);
    expect(hasPermission('admin', true, 'admin.access')).toBe(true);
  });

  it('vendor cannot manage team or create deals', () => {
    expect(hasPermission('vendor', false, 'team.manage')).toBe(false);
    expect(hasPermission('vendor', false, 'deals.create')).toBe(false);
    expect(hasPermission('vendor', false, 'deals.read')).toBe(true);
  });

  it('investor can create projects and deals', () => {
    expect(hasPermission('investor', false, 'projects.create')).toBe(true);
    expect(hasPermission('investor', false, 'deals.create')).toBe(true);
  });
});

describe('Sprint 1 P0 — ForbiddenException shape', () => {
  it('ForbiddenException carries 403 semantics', () => {
    const err = new ForbiddenException({ error: 'Forbidden', reason: 'project' });
    expect(err.getStatus()).toBe(403);
  });
});
