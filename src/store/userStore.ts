import { create } from 'zustand';
import { OrgRole, InternalRole, OrgTeamMember } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   User Store — Account Tier & Team Management

   Manages:
   • Individual vs Team account tier toggle
   • Org-level team members (up to 10 seats for Team)
   • Internal hierarchy: Admin / Deal Lead
   • Onboarding wizard state
   ═══════════════════════════════════════════════════════ */

interface UserState {
  hasActiveSubscription: boolean;
  orgRole: OrgRole;

  // Account Tier Management
  accountTier: 'Individual' | 'Team';
  teamMembers: OrgTeamMember[];
  maxSeats: number;

  // Core Actions
  setOrgRole: (role: OrgRole) => void;

  // Account Tier Actions
  setAccountTier: (tier: 'Individual' | 'Team') => void;
  addTeamMember: (member: OrgTeamMember) => void;
  removeTeamMember: (memberId: string) => void;
  updateMemberRole: (memberId: string, role: InternalRole) => void;
  assignMemberToDeal: (memberId: string, projectId: string) => void;
  unassignMemberFromDeal: (memberId: string, projectId: string) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  hasActiveSubscription: true,
  orgRole: 'Lead Investor',

  // Account Tier defaults
  accountTier: 'Individual',
  teamMembers: [],
  maxSeats: 1,

  setOrgRole: (role) => set({ orgRole: role }),

  // ─── Account Tier Actions ─────────────────────────────
  setAccountTier: (tier) => set({
    accountTier: tier,
    maxSeats: tier === 'Team' ? 10 : 1,
    // Clear team members when downgrading to Individual
    ...(tier === 'Individual' ? { teamMembers: [] } : {}),
  }),

  addTeamMember: (member) => {
    const { teamMembers, maxSeats, accountTier } = get();
    if (accountTier === 'Individual') return; // Gate: Individual accounts can't add members
    if (teamMembers.filter(m => m.status !== 'removed').length >= maxSeats) return; // Seat limit
    set({ teamMembers: [...teamMembers, member] });
  },

  removeTeamMember: (memberId) => {
    const { teamMembers } = get();
    set({
      teamMembers: teamMembers.map(m =>
        m.id === memberId ? { ...m, status: 'removed' as const } : m
      ),
    });
  },

  updateMemberRole: (memberId, role) => {
    const { teamMembers } = get();
    set({
      teamMembers: teamMembers.map(m =>
        m.id === memberId ? { ...m, internalRole: role } : m
      ),
    });
  },

  assignMemberToDeal: (memberId, projectId) => {
    const { teamMembers } = get();
    set({
      teamMembers: teamMembers.map(m =>
        m.id === memberId
          ? { ...m, assignedProjectIds: [...new Set([...m.assignedProjectIds, projectId])] }
          : m
      ),
    });
  },

  unassignMemberFromDeal: (memberId, projectId) => {
    const { teamMembers } = get();
    set({
      teamMembers: teamMembers.map(m =>
        m.id === memberId
          ? { ...m, assignedProjectIds: m.assignedProjectIds.filter(id => id !== projectId) }
          : m
      ),
    });
  },
}));
