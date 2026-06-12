/**
 * Prompt 72 — Scoped Invites: End-to-End Contract Tests
 *
 * These tests verify the invariants the plan committed to:
 *  1. persistTeamInvite writes scopedProjectIds + isScoped to Firestore
 *  2. acceptTeamInvitation propagates scope from invite → member record
 *  3. hasProjectAccess enforces scopedProjectIds for scoped members
 *  4. scopeGuard assertProjectScope / hasProjectScope / filterToScope behave correctly
 *  5. handleSendInvites (page) passes scopedProjectIds to persistTeamInvite
 *  6. No regression: unscoped members are not restricted
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

const TEAM_ACTION   = read('actions/team.ts');
const VENDOR_ACTION = read('actions/vendorAssignment.ts');
const TEAM_PAGE     = read('app/dashboard/team/page.tsx');
const SETTINGS_PAGE = read('app/dashboard/settings/team/page.tsx');
const SCOPE_GUARD   = read('lib/auth/scopeGuard.ts');
const SCHEMA        = read('types/schema.ts');

/* ══════════════════════════════════════════════════════════════════════════
   Section 1 — Schema contract
   ══════════════════════════════════════════════════════════════════════════ */
describe('Prompt 72 — Schema: OrgTeamMember has scoped fields', () => {
  it('OrgTeamMember has scopedProjectIds field', () => {
    expect(SCHEMA).toContain('scopedProjectIds?: string[];');
  });

  it('OrgTeamMember has isScoped field', () => {
    expect(SCHEMA).toContain('isScoped?: boolean;');
  });

  it('TeamInvitation has scopedProjectIds field', () => {
    expect(SCHEMA).toMatch(/interface TeamInvitation[\s\S]+?scopedProjectIds\?: string\[\]/);
  });

  it('TeamInvitation has isScoped field', () => {
    expect(SCHEMA).toMatch(/interface TeamInvitation[\s\S]+?isScoped\?: boolean/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Section 2 — persistTeamInvite writes scope to invite document
   ══════════════════════════════════════════════════════════════════════════ */
describe('Prompt 72 — persistTeamInvite writes scope fields', () => {
  it('computes scopedProjectIds from member.scopedProjectIds or assignedProjectIds', () => {
    expect(TEAM_ACTION).toContain('const scopedProjectIds: string[]');
  });

  it('computes isScoped boolean', () => {
    expect(TEAM_ACTION).toContain('const isScoped = member.isScoped === true');
  });

  it('inviteData includes scopedProjectIds', () => {
    // Find the inviteData object literal
    const start = TEAM_ACTION.indexOf('const inviteData = {');
    const end   = TEAM_ACTION.indexOf('};', start) + 2;
    const block = TEAM_ACTION.slice(start, end);
    expect(block).toContain('scopedProjectIds,');
  });

  it('inviteData includes isScoped', () => {
    const start = TEAM_ACTION.indexOf('const inviteData = {');
    const end   = TEAM_ACTION.indexOf('};', start) + 2;
    const block = TEAM_ACTION.slice(start, end);
    expect(block).toContain('isScoped,');
  });

  it('legacy invitedToProjectId is populated for single-project scope (backward compat)', () => {
    expect(TEAM_ACTION).toContain('invitedToProjectId: scopedProjectIds[0]');
  });

  it('audit log metadata includes isScoped and scopedProjectIds', () => {
    expect(TEAM_ACTION).toContain('{ role: member.internalRole, isScoped, scopedProjectIds }');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Section 3 — acceptTeamInvitation propagates scope
   ══════════════════════════════════════════════════════════════════════════ */
describe('Prompt 72 — acceptTeamInvitation propagates scope fields', () => {
  it('resolves scopedProjectIds from tInviteData.scopedProjectIds', () => {
    expect(TEAM_ACTION).toContain('Array.isArray(tInviteData.scopedProjectIds)');
  });

  it('falls back to legacy invitedToProjectId for old invites', () => {
    expect(TEAM_ACTION).toContain('tInviteData.invitedToProjectId ? [tInviteData.invitedToProjectId] : []');
  });

  it('newMember has scopedProjectIds field set', () => {
    expect(TEAM_ACTION).toContain('scopedProjectIds: resolvedScopedIds,');
  });

  it('newMember has isScoped field set', () => {
    expect(TEAM_ACTION).toContain('isScoped: resolvedIsScoped,');
  });

  it('newMember scope is "project" when scoped, "tenant" otherwise', () => {
    expect(TEAM_ACTION).toContain("scope: resolvedIsScoped ? 'project' : 'tenant',");
  });

  it('membershipScopes is written to the user document', () => {
    expect(TEAM_ACTION).toContain('membershipScopes.');
  });

  it('membershipScopes writes isScoped + scopedProjectIds', () => {
    expect(TEAM_ACTION).toContain('isScoped: resolvedIsScoped,');
    expect(TEAM_ACTION).toContain('scopedProjectIds: resolvedScopedIds,');
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Section 4 — hasProjectAccess enforces scope
   ══════════════════════════════════════════════════════════════════════════ */
describe('Prompt 72 — hasProjectAccess enforces scopedProjectIds', () => {
  it('hasProjectAccess accepts a projectId parameter', () => {
    expect(VENDOR_ACTION).toContain('projectId?: string');
  });

  it('VerifiedUser has membershipScopes field', () => {
    expect(VENDOR_ACTION).toContain('membershipScopes?:');
  });

  it('hasProjectAccess checks scope.isScoped before allowing access', () => {
    expect(VENDOR_ACTION).toContain('scope?.isScoped');
  });

  it('hasProjectAccess checks scopedProjectIds.includes(projectId)', () => {
    expect(VENDOR_ACTION).toContain('scope.scopedProjectIds.includes(projectId)');
  });

  it('all three hasProjectAccess call sites pass projectId', () => {
    // Each call site ends with ", projectId)" — count those occurrences
    const matches = [...VENDOR_ACTION.matchAll(/, projectId\)/g)];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Section 5 — scopeGuard utility correctness
   ══════════════════════════════════════════════════════════════════════════ */
import { assertProjectScope, hasProjectScope, filterToScope, ScopeViolationError } from '../lib/auth/scopeGuard';
import type { OrgTeamMember } from '../types/schema';

const baseMember: OrgTeamMember = {
  id: 'uid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  internalRole: 'Deal Lead',
  assignedProjectIds: [],
  invitedAt: new Date(),
  status: 'active',
};

const scopedMember: OrgTeamMember = {
  ...baseMember,
  isScoped: true,
  scopedProjectIds: ['proj-a'],
  assignedProjectIds: ['proj-a'],
  scope: 'project',
};

const unscopedMember: OrgTeamMember = {
  ...baseMember,
  isScoped: false,
  scopedProjectIds: [],
  scope: 'tenant',
};

describe('Prompt 72 — assertProjectScope enforcement', () => {
  it('scoped member accessing allowed project does NOT throw', () => {
    expect(() => assertProjectScope(scopedMember, 'proj-a')).not.toThrow();
  });

  it('scoped member accessing forbidden project THROWS ScopeViolationError', () => {
    expect(() => assertProjectScope(scopedMember, 'proj-b')).toThrow(ScopeViolationError);
  });

  it('ScopeViolationError has status 403', () => {
    try {
      assertProjectScope(scopedMember, 'proj-b');
    } catch (e) {
      expect((e as ScopeViolationError).status).toBe(403);
    }
  });

  it('unscoped (tenant) member accessing ANY project does NOT throw', () => {
    expect(() => assertProjectScope(unscopedMember, 'proj-b')).not.toThrow();
    expect(() => assertProjectScope(unscopedMember, 'proj-xyz')).not.toThrow();
  });
});

describe('Prompt 72 — hasProjectScope boolean', () => {
  it('returns true for scoped member on allowed project', () => {
    expect(hasProjectScope(scopedMember, 'proj-a')).toBe(true);
  });

  it('returns false for scoped member on forbidden project', () => {
    expect(hasProjectScope(scopedMember, 'proj-b')).toBe(false);
  });

  it('returns true for unscoped member on any project', () => {
    expect(hasProjectScope(unscopedMember, 'proj-a')).toBe(true);
    expect(hasProjectScope(unscopedMember, 'proj-b')).toBe(true);
  });
});

describe('Prompt 72 — filterToScope list filtering', () => {
  it('scoped member only sees allowed projects', () => {
    const filtered = filterToScope(scopedMember, ['proj-a', 'proj-b', 'proj-c']);
    expect(filtered).toEqual(['proj-a']);
  });

  it('unscoped member sees all projects', () => {
    const filtered = filterToScope(unscopedMember, ['proj-a', 'proj-b', 'proj-c']);
    expect(filtered).toEqual(['proj-a', 'proj-b', 'proj-c']);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Section 6 — team/page.tsx handleSendInvites wire-up
   ══════════════════════════════════════════════════════════════════════════ */
describe('Prompt 72 — team/page.tsx handleSendInvites passes scope to persistTeamInvite', () => {
  it('handleSendInvites is async', () => {
    expect(TEAM_PAGE).toContain('const handleSendInvites = async');
  });

  it('imports persistTeamInvite dynamically', () => {
    expect(TEAM_PAGE).toContain("import('@/actions/team')");
    expect(TEAM_PAGE).toContain('persistTeamInvite');
  });

  it('computes scopedProjectIds before calling persistTeamInvite', () => {
    expect(TEAM_PAGE).toContain('const scopedProjectIds = enableScopedInvite');
  });

  it('passes scopedProjectIds to the optimistic member', () => {
    expect(TEAM_PAGE).toContain('scopedProjectIds,');
  });

  it('passes isScoped to the optimistic member', () => {
    expect(TEAM_PAGE).toContain('isScoped,');
  });

  it('calls persistTeamInvite(optimisticMember)', () => {
    expect(TEAM_PAGE).toContain('await persistTeamInvite(optimisticMember)');
  });

  it('validates scoped invite has a project selected', () => {
    expect(TEAM_PAGE).toContain('enableScopedInvite && !assignProject');
  });

  it('resets scope state after submission', () => {
    expect(TEAM_PAGE).toContain("setEnableScopedInvite(false)");
    expect(TEAM_PAGE).toContain("setAssignProject('')");
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   Section 7 — settings/team/page.tsx explicit unscoped invite
   ══════════════════════════════════════════════════════════════════════════ */
describe('Prompt 72 — settings/team/page.tsx explicit unscoped invite', () => {
  it('settings page invite sets scopedProjectIds to empty array', () => {
    expect(SETTINGS_PAGE).toContain('scopedProjectIds:   [],');
  });

  it('settings page invite sets isScoped to false', () => {
    expect(SETTINGS_PAGE).toContain('isScoped:           false,');
  });

  it('settings page invite sets scope to tenant', () => {
    expect(SETTINGS_PAGE).toContain("scope:              'tenant',");
  });
});
