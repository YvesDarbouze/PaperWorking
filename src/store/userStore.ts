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
  isNewUser: boolean;
  hasActiveSubscription: boolean;
  onboardingStep: number;
  orgRole: OrgRole;

  // Account Tier Management
  accountTier: 'Individual' | 'Team';
  teamMembers: OrgTeamMember[];
  maxSeats: number;

  // Core Actions
  setNextStep: () => void;
  completeOnboarding: (userId: string, orgData: { name: string; market: string }) => Promise<void>;
  setOrgRole: (role: OrgRole) => void;

  // Account Tier Actions
  setAccountTier: (tier: 'Individual' | 'Team') => void;
  addTeamMember: (member: OrgTeamMember) => void;
  removeTeamMember: (memberId: string) => void;
  updateMemberRole: (memberId: string, role: InternalRole) => void;
  assignMemberToDeal: (memberId: string, dealId: string) => void;
  unassignMemberFromDeal: (memberId: string, dealId: string) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // Set to true by default to trigger the onboarding wizard sequence
  isNewUser: true,
  hasActiveSubscription: true,
  orgRole: 'Lead Investor',
  
  // Account Tier defaults
  accountTier: 'Individual',
  teamMembers: [],
  maxSeats: 1,

  // Step 1: Organization Setup Modal
  // Step 2: Team Invite Modal
  // Step 3: Tooltip Highlight over "Add Target Property"
  // Step 4: Tooltip Highlight over the newly created Property Row
  // Step 5+: Complete
  onboardingStep: 1,

  setNextStep: () => set((state) => ({ onboardingStep: state.onboardingStep + 1 })),
  
  completeOnboarding: async (userId, orgData) => {
    try {
      const { usersService } = await import('@/lib/firebase/users');
      await usersService.persistOnboarding(userId, orgData);
      set({ 
        isNewUser: false, 
        onboardingStep: 5 
      });
    } catch (error) {
       console.error('Critical Store Sync Failure:', error);
       throw error;
    }
  },

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

  assignMemberToDeal: (memberId, dealId) => {
    const { teamMembers } = get();
    set({
      teamMembers: teamMembers.map(m =>
        m.id === memberId
          ? { ...m, assignedDealIds: [...new Set([...m.assignedDealIds, dealId])] }
          : m
      ),
    });
  },

  unassignMemberFromDeal: (memberId, dealId) => {
    const { teamMembers } = get();
    set({
      teamMembers: teamMembers.map(m =>
        m.id === memberId
          ? { ...m, assignedDealIds: m.assignedDealIds.filter(id => id !== dealId) }
          : m
      ),
    });
  },
}));
