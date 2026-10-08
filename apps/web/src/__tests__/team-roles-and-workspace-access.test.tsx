import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import TeamDirectoryPanel from '../../components/team/TeamDirectoryPanel';
import {
  INTERNAL_ROLES,
  ROLE_PERMISSIONS,
  WORKSPACE_ACCESS_LEVELS,
  getDefaultAccessLevelForRole,
  type InternalRole,
  type WorkspaceAccessLevel,
} from '../../lib/dashboard/shell-seed';

describe('Team Roles and Workspace Access Guessing & Adjustment', () => {
  describe('Role Definition & Default Access Level Inference', () => {
    it('includes Manager, Associate, Vendor, Intern in INTERNAL_ROLES', () => {
      expect(INTERNAL_ROLES).toContain('Manager');
      expect(INTERNAL_ROLES).toContain('Associate');
      expect(INTERNAL_ROLES).toContain('Vendor');
      expect(INTERNAL_ROLES).toContain('Intern');
    });

    it('correctly guesses workspace access levels based on role', () => {
      // Manager -> Full Edit
      expect(getDefaultAccessLevelForRole('Manager')).toBe('Full Edit');
      // Associate -> Scoped Edit
      expect(getDefaultAccessLevelForRole('Associate')).toBe('Scoped Edit');
      // Vendor -> Scoped Edit (restricted to vendor tasks/bids)
      expect(getDefaultAccessLevelForRole('Vendor')).toBe('Scoped Edit');
      // Intern -> View Only (read-only supervised)
      expect(getDefaultAccessLevelForRole('Intern')).toBe('View Only');

      // Executive roles
      expect(getDefaultAccessLevelForRole('CEO')).toBe('Full Edit');
      expect(getDefaultAccessLevelForRole('President')).toBe('Full Edit');
      expect(getDefaultAccessLevelForRole('Admin')).toBe('Full Edit');
      expect(getDefaultAccessLevelForRole('Deal Lead')).toBe('Scoped Edit');
      expect(getDefaultAccessLevelForRole('COO')).toBe('Scoped Edit');
      expect(getDefaultAccessLevelForRole('CFO')).toBe('Scoped Edit');
    });

    it('defines clear permission descriptions for each new role in ROLE_PERMISSIONS', () => {
      expect(ROLE_PERMISSIONS.Manager).toContain('Full workspace management');
      expect(ROLE_PERMISSIONS.Associate).toContain('Underwriting and deal execution');
      expect(ROLE_PERMISSIONS.Vendor).toContain('Restricted external access');
      expect(ROLE_PERMISSIONS.Intern).toContain('Supervised / View-only access');
    });

    it('defines three distinct WORKSPACE_ACCESS_LEVELS with labels and descriptions', () => {
      const levels = WORKSPACE_ACCESS_LEVELS.map((a) => a.level);
      expect(levels).toEqual(['Full Edit', 'Scoped Edit', 'View Only']);
    });
  });

  describe('TeamDirectoryPanel UI Rendering', () => {
    it('renders the team directory panel with the Workspace Access column', () => {
      const html = renderToString(<TeamDirectoryPanel />);

      expect(html).toContain('Team Directory &amp; Scopes');
      expect(html).toContain('Workspace Access');
      expect(html).toContain('Member');
      expect(html).toContain('Role');
      expect(html).toContain('Status');
      expect(html).toContain('Last Active');
      expect(html).toContain('Actions');
    });

    it('renders the new roles (Manager, Associate, Vendor, Intern) in the table roster and selects', () => {
      const html = renderToString(<TeamDirectoryPanel />);

      // Verify seed roster displays members with the new roles
      expect(html).toContain('Manager');
      expect(html).toContain('Associate');
      expect(html).toContain('Vendor');
      expect(html).toContain('Intern');

      // Verify access level select elements exist for team members
      expect(html).toContain('Full Edit');
      expect(html).toContain('Scoped Edit');
      expect(html).toContain('View Only');
    });

    it('renders role options in the role dropdown for operators', () => {
      const html = renderToString(<TeamDirectoryPanel />);

      expect(html).toContain('value="Manager"');
      expect(html).toContain('value="Associate"');
      expect(html).toContain('value="Vendor"');
      expect(html).toContain('value="Intern"');
    });

    it('renders scoped assignment badges and scope action buttons for team operators', () => {
      const html = renderToString(<TeamDirectoryPanel />);

      // Verify Scope action button exists in table
      expect(html).toContain('Scope');
      // Verify existing scoped member assignments are rendered as badges
      expect(html).toContain('88 Harbor Lane');
      expect(html).toContain('Update monthly operating statement');
      expect(html).toContain('1247 Elm Street');
      expect(html).toContain('Underwriting Review');
    });
  });
});
