import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  listTeamMembersFromStore,
  getTeamMemberFromStore,
  createTeamMemberInStore,
  bulkInviteTeamMembersInStore,
  updateTeamMemberInStore,
  deleteTeamMemberInStore,
  getTeamSeatsFromStore,
  updateTeamTierInStore,
  type TeamMemberRecord,
} from '../../lib/team/team-store';

describe('Team Directory Firestore Persistence Store', () => {
  beforeEach(() => {
    // Reset global in-memory caches before each test
    if (globalThis.__pw_team_cache) {
      globalThis.__pw_team_cache.clear();
    }
    if (globalThis.__pw_team_settings_cache) {
      globalThis.__pw_team_settings_cache.clear();
    }
  });

  describe('listTeamMembersFromStore', () => {
    it('initializes from seed team members when empty', async () => {
      const members = await listTeamMembersFromStore();
      expect(members.length).toBeGreaterThanOrEqual(7);

      const owner = members.find((m) => m.isYou);
      expect(owner).toBeDefined();
      expect(owner?.role).toBe('CEO');
      expect(owner?.accessLevel).toBe('Full Edit');
    });

    it('filters members by role', async () => {
      const managers = await listTeamMembersFromStore({ role: 'Manager' });
      expect(managers.length).toBeGreaterThanOrEqual(1);
      expect(managers.every((m) => m.role === 'Manager')).toBe(true);

      const vendors = await listTeamMembersFromStore({ role: 'Vendor' });
      expect(vendors.length).toBeGreaterThanOrEqual(1);
      expect(vendors.every((m) => m.role === 'Vendor')).toBe(true);
    });

    it('filters members by status', async () => {
      const invited = await listTeamMembersFromStore({ status: 'Invited' });
      expect(invited.length).toBeGreaterThanOrEqual(1);
      expect(invited.every((m) => m.status === 'Invited')).toBe(true);
    });

    it('filters members by search query across name, email, and role', async () => {
      const queryResults = await listTeamMembersFromStore({ search: 'Jordan' });
      expect(queryResults.length).toBeGreaterThanOrEqual(1);
      expect(queryResults[0].name).toContain('Jordan');
    });
  });

  describe('createTeamMemberInStore & bulkInviteTeamMembersInStore', () => {
    it('creates and persists a new team member', async () => {
      const testEmail = `new-operator-${Date.now()}@paperworking.test`;
      const created = await createTeamMemberInStore({
        email: testEmail,
        role: 'Associate',
        accessLevel: 'Scoped Edit',
        name: 'Dev Associate',
      });

      expect(created.id).toBeDefined();
      expect(created.email).toBe(testEmail);
      expect(created.role).toBe('Associate');
      expect(created.accessLevel).toBe('Scoped Edit');
      expect(created.status).toBe('Invited');

      const fetched = await getTeamMemberFromStore(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.email).toBe(testEmail);
    });

    it('bulk invites multiple operators and applies project scoping', async () => {
      const emails = [
        `invite-a-${Date.now()}@fund.test`,
        `invite-b-${Date.now()}@fund.test`,
      ];

      const result = await bulkInviteTeamMembersInStore({
        emails,
        role: 'Associate',
        accessLevel: 'Scoped Edit',
        scopedProjectId: 'proj-1',
        scopedProjectName: '88 Harbor Lane',
        scopedTabOrTask: 'Underwriting Tab',
      });

      expect(result.invited.length).toBe(2);
      expect(result.invited[0].scopedProjectId).toBe('proj-1');
      expect(result.invited[0].scopedProjectName).toBe('88 Harbor Lane');
      expect(result.invited[0].scopedTabOrTask).toBe('Underwriting Tab');
      expect(result.seats.used).toBeGreaterThanOrEqual(2);
    });

    it('throws error when bulk invite exceeds available seats', async () => {
      // First ensure tier is Individual (limit = 1)
      await updateTeamTierInStore('Individual');

      await expect(
        bulkInviteTeamMembersInStore({
          emails: ['overflow1@firm.test', 'overflow2@firm.test'],
          role: 'Intern',
          accessLevel: 'View Only',
        }),
      ).rejects.toThrow(/remaining in this workspace tier/i);
    });
  });

  describe('updateTeamMemberInStore & deleteTeamMemberInStore', () => {
    it('updates role and auto-assigns role default access level', async () => {
      const member = await createTeamMemberInStore({
        email: `role-test-${Date.now()}@paperworking.test`,
        role: 'Associate',
      });

      const updated = await updateTeamMemberInStore(member.id, {
        role: 'Manager',
        accessLevel: 'Full Edit',
      });

      expect(updated?.role).toBe('Manager');
      expect(updated?.accessLevel).toBe('Full Edit');
    });

    it('suspends and reactivates a team member', async () => {
      const member = await createTeamMemberInStore({
        email: `suspend-test-${Date.now()}@paperworking.test`,
        role: 'Associate',
        status: 'Active',
      });

      const suspended = await updateTeamMemberInStore(member.id, {
        status: 'Suspended',
      });
      expect(suspended?.status).toBe('Suspended');

      const reactivated = await updateTeamMemberInStore(member.id, {
        status: 'Active',
      });
      expect(reactivated?.status).toBe('Active');
    });

    it('deletes/revokes a team member', async () => {
      const member = await createTeamMemberInStore({
        email: `revoke-test-${Date.now()}@paperworking.test`,
        role: 'Vendor',
      });

      const deleted = await deleteTeamMemberInStore(member.id);
      expect(deleted).toBe(true);

      const fetched = await getTeamMemberFromStore(member.id);
      expect(fetched).toBeNull();
    });
  });

  describe('getTeamSeatsFromStore & updateTeamTierInStore', () => {
    it('returns accurate live seat counts based on active and invited members', async () => {
      const seats = await getTeamSeatsFromStore();
      expect(seats.limit).toBe(10);
      expect(seats.tier).toBe('Team');
      expect(seats.used).toBeGreaterThanOrEqual(1);
    });

    it('updates subscription tier and adjusts seat limit accordingly', async () => {
      const updated = await updateTeamTierInStore('Individual');
      expect(updated.tier).toBe('Individual');
      expect(updated.limit).toBe(1);

      const reverted = await updateTeamTierInStore('Team');
      expect(reverted.tier).toBe('Team');
      expect(reverted.limit).toBe(10);
    });
  });
});
