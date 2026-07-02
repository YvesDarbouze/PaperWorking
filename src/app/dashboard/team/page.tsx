'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { getTeamMembers } from '@/actions/getTeamMembers';
import { useUserStore } from '@/store/userStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { 
  Shield, Users, UserCircle, Search, RefreshCw, XCircle, Settings, Plus, X, 
  ChevronDown, Check, Mail, Info, AlertCircle, Sparkles, ExternalLink, Lock, UserCheck, Trash2
} from 'lucide-react';
import type { ProjectTeamMember, InternalRole } from '@/types/schema';
import { usePermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';
import { useBilling } from '@/hooks/useBilling';

/* ═══════════════════════════════════════════════════════
   Team Directory & Access Management Terminal
   (Premium Minimalist Paper UI Design System)
   ═══════════════════════════════════════════════════════ */

type UnifiedMemberType = 'Internal' | 'External';

interface UnifiedMember {
  id: string;
  email: string;
  displayName: string;
  role: string;
  type: UnifiedMemberType;
  status: 'active' | 'invited' | 'removed' | 'suspended';
  assignedProjects: string[];
  lastActive?: string;
  invitedAt?: Date | string;
}

const ROLE_PERMISSIONS: Record<InternalRole, string> = {
  CEO: 'Full control over organization properties, financials, billing, and team seats allocation.',
  President: 'Full system access, deal pipelines configuration, and team member provisioning.',
  CFO: 'Access to financial worksheets, underwriting inputs, cash flow targets, and closing distributions.',
  COO: 'Access to project timelines, milestones checklist, general contractor tasks assignment, and operations.',
  Admin: 'Manage user access levels, configure dashboard preferences, and edit settings.',
  'Deal Lead': 'Underwrite individual properties, assign project-level action items, and manage deal pipeline.'
};

/**
 * Convert a lastSeenAt ISO timestamp into a human-readable time-ago string.
 * Returns '—' when no timestamp is available (honest empty state — never invented).
 */
function formatLastActive(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)     return 'Active just now';
  if (ms < 3_600_000)  return `Active ${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `Active ${Math.floor(ms / 3_600_000)}h ago`;
  return `Active ${Math.floor(ms / 86_400_000)}d ago`;
}

export default function TeamDirectoryPage() {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Zustand Stores
  const { 
    teamMembers: internalMembers, 
    accountTier, 
    maxSeats, 
    addTeamMember, 
    removeTeamMember, 
    suspendTeamMember, 
    updateMemberRole 
  } = useUserStore();
  
  const { projects, updateProjectTeam } = useProjectStore();
  const { isLead: isAdmin } = usePermissions();

  const { isSubscribed, openPortal, startCheckout, isLoading: billingLoading } = useBilling();
  const [pendingTier, setPendingTier] = useState<'Individual' | 'Team' | null>(null);

  const handleTierChange = async (targetTier: 'Individual' | 'Team') => {
    if (targetTier === accountTier) return;

    setPendingTier(targetTier);
    const toastId = toast.loading(
      isSubscribed
        ? 'Redirecting to Stripe Billing Portal...'
        : `Opening checkout for ${targetTier === 'Team' ? 'Investment Team' : 'Investor'} plan...`
    );

    try {
      if (isSubscribed) {
        await openPortal();
      } else {
        await startCheckout(targetTier === 'Team' ? 'Investment Team' : 'Investor');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || 'Failed to initiate plan change.');
      setPendingTier(null);
    }
  };

  // Local States
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [bulkEmailInput, setBulkEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<InternalRole>('Deal Lead');
  const [assignProject, setAssignProject] = useState<string>('');
  const [assignTabOrTask, setAssignTabOrTask] = useState<string>('');
  const [enableScopedInvite, setEnableScopedInvite] = useState(false);
  const [hoveredRoleTooltip, setHoveredRoleTooltip] = useState<string | null>(null);

  // Real last-seen timestamps keyed by uid or lowercased email.
  // Populated from users/{uid}/sessions sub-collection via getTeamMembers().
  const [memberActivity, setMemberActivity] = useState<Record<string, string | null>>({});

  useEffect(() => {
    getTeamMembers().then((result) => {
      const map: Record<string, string | null> = {};
      result.members.forEach((m) => {
        const uid = (m as any).uid as string | undefined;
        if (uid) map[uid] = (m as any).lastSeenAt ?? null;
        map[m.email.toLowerCase()] = (m as any).lastSeenAt ?? null;
      });
      setMemberActivity(map);
    }).catch(() => {
      // Non-fatal: team page degrades to showing '—' for all members
    });
  }, []);

  // Aggregate and merge all team members
  const unifiedTeam = useMemo(() => {
    const list: UnifiedMember[] = [];
    const seenEmails = new Set<string>();

    // 1. Map Internal Members (Org-level)
    internalMembers.forEach(m => {
      if (m.status === 'removed') return;
      
      seenEmails.add(m.email.toLowerCase());
      list.push({
        id: m.id,
        email: m.email,
        displayName: m.displayName || m.email,
        role: m.internalRole,
        type: 'Internal',
        status: m.status,
        assignedProjects: m.assignedProjectIds || [],
        lastActive: m.status === 'invited'
          ? '—'
          : formatLastActive(memberActivity[(m as any).uid ?? ''] ?? memberActivity[m.email.toLowerCase()]),
        invitedAt: m.invitedAt,
      });
    });

    // 2. Map External Collaborators (Vendors, Agents, etc from projects)
    projects.forEach(p => {
      if (!p.projectTeam) return;

      p.projectTeam.forEach((em: ProjectTeamMember) => {
        if (em.status === 'removed') return;
        const lowerEmail = em.email.toLowerCase();

        // If they exist as internal or we already processed them as external
        if (seenEmails.has(lowerEmail)) {
          const existing = list.find(l => l.email.toLowerCase() === lowerEmail);
          if (existing && !existing.assignedProjects.includes(p.id)) {
            existing.assignedProjects.push(p.id);
          }
        } else {
          seenEmails.add(lowerEmail);
          list.push({
            id: em.id,
            email: em.email,
            displayName: em.displayName || em.email,
            role: em.projectRole,
            type: 'External',
            status: em.status,
            assignedProjects: [p.id],
            lastActive: em.status === 'invited'
              ? '—'
              : formatLastActive(memberActivity[em.email.toLowerCase()]),
          });
        }
      });
    });

    // If list is empty and user is on Team tier, we seed owner as the first member
    if (list.length === 0 && profile?.email) {
      list.push({
        id: 'owner-id',
        email: profile.email,
        displayName: profile.displayName || profile.email.split('@')[0],
        role: 'CEO',
        type: 'Internal',
        status: 'active',
        assignedProjects: [],
        lastActive: formatLastActive(memberActivity[profile.uid ?? ''] ?? memberActivity[profile.email.toLowerCase()]),
      });
    }

    // Sort: Internals first, then alphabetical by name
    return list.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'Internal' ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [internalMembers, projects, profile, memberActivity]);

  // Split active personnel vs pending invitations
  const activePersonnel = useMemo(() => {
    return unifiedTeam.filter(
      member => 
        member.status !== 'invited' &&
        (member.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || 
         member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
         member.role.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [unifiedTeam, searchQuery]);

  const pendingInvitations = useMemo(() => {
    return unifiedTeam.filter(member => member.status === 'invited');
  }, [unifiedTeam]);



  // Handle invitation submission
  const handleSendInvites = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkEmailInput.trim()) {
      toast.error("Please enter at least one email address.");
      return;
    }

    const emails = bulkEmailInput
      .split(/[\s,;\n]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@'));

    if (emails.length === 0) {
      toast.error("Please enter valid email addresses.");
      return;
    }

    // Check capacity
    const currentActiveCount = internalMembers.filter(m => m.status !== 'removed').length;
    if (currentActiveCount + emails.length > maxSeats) {
      toast.error(`Cannot invite ${emails.length} users. You have ${maxSeats - currentActiveCount} seats remaining on your current tier.`);
      return;
    }

    // Validate scoped invite: a project must be selected when scope is enabled
    if (enableScopedInvite && !assignProject) {
      toast.error("Please select a project for the scoped invite, or disable the restriction.");
      return;
    }

    const scopedProjectIds = enableScopedInvite && assignProject ? [assignProject] : [];
    const isScoped = scopedProjectIds.length > 0;

    const toastId = toast.loading(`Sending ${emails.length} invitation(s)…`);

    const { persistTeamInvite } = await import('@/actions/team');

    let sent = 0;
    let failed = 0;

    for (const email of emails) {
      const optimisticMember = {
        id: Math.random().toString(36).substring(2, 9),
        email,
        displayName: email.split('@')[0],
        internalRole: selectedRole,
        invitedAt: new Date(),
        status: 'invited' as const,
        assignedProjectIds: scopedProjectIds,
        scopedProjectIds,
        isScoped,
        scope: isScoped ? ('project' as const) : ('tenant' as const),
      };

      // Optimistic Zustand update — immediately visible in the team list
      addTeamMember(optimisticMember);

      try {
        // Server action: persists the tokenised invite with scope to Firestore
        await persistTeamInvite(optimisticMember);
        sent++;
      } catch (err: unknown) {
        failed++;
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Team] Failed to invite ${email}:`, message);
        toast.error(`Failed to invite ${email}: ${message}`);
      }
    }

    toast.dismiss(toastId);

    if (sent > 0) {
      toast.success(
        isScoped
          ? `Sent ${sent} scoped invitation(s) — restricted to "${projects.find(p => p.id === assignProject)?.propertyName ?? assignProject}".`
          : `Sent ${sent} invitation(s) successfully!`
      );
    }
    if (failed > 0) {
      toast.error(`${failed} invitation(s) failed. Check above for details.`);
    }

    setBulkEmailInput('');
    setEnableScopedInvite(false);
    setAssignProject('');
    setAssignTabOrTask('');
    setInviteModalOpen(false);
  };

  const handleRevokeAccess = (memberId: string, email: string) => {
    removeTeamMember(memberId);
    toast.success(`Revoked access for ${email}`);
  };

  const handleToggleSuspend = (memberId: string, email: string, currentStatus: string) => {
    const suspend = currentStatus !== 'suspended';
    suspendTeamMember(memberId, suspend);
    toast.success(suspend ? `Suspended ${email}` : `Reactivated ${email}`);
  };

  const handleRoleChange = (memberId: string, role: InternalRole) => {
    updateMemberRole(memberId, role);
    toast.success(`Role updated to ${role}`);
  };

  const activeSeatsCount = internalMembers.filter(m => m.status !== 'removed').length;

  return (
    <div className="min-h-screen pb-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-6 pt-4">
      
      {/* Page Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h2 
            className="text-[26px] font-bold text-neutral-900 dark:text-neutral-50 tracking-tight"
            style={{ fontFamily: "'Montserrat', sans-serif" }}
          >
            Team Directory & Scopes
          </h2>
          <p 
            className="text-xs text-neutral-500 dark:text-neutral-400 mt-1"
            style={{ fontFamily: "'Roboto', sans-serif" }}
          >
            Manage operator permissions, provision collaboration credentials, and restrict marketplace credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {accountTier === 'Team' && (
            <button
              onClick={() => setInviteModalOpen(true)}
              className="bg-neutral-900 text-neutral-50 hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-100 font-medium text-[13px] px-4 py-2 rounded-md flex items-center gap-1.5 transition-all shadow-sm focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Invite Team User
            </button>
          )}
        </div>
      </header>

      {/* Tier & Scoping Control Panel Card */}
      <section 
        className="bg-white dark:bg-stone-900 rounded-lg border border-neutral-100 dark:border-neutral-800 shadow-sm shadow-neutral-100/50 dark:shadow-none p-6"
        style={{ boxShadow: "0 2px 10px rgba(69, 73, 85, 0.02)" }}
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                Subscription Tier
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                accountTier === 'Team' 
                  ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-400' 
                  : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
              }`}>
                {accountTier} Active
              </span>
            </div>
            
            <h3 
              className="text-lg font-bold text-neutral-900 dark:text-neutral-50"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              {accountTier === 'Team' ? 'Investment Team Workspace' : 'Investor Individual Plan'}
            </h3>
            
            <p className="text-[12px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {accountTier === 'Team' 
                ? 'Your account supports up to 10 team seats. Invited members are sandboxed to your projects and cannot create standalone deals. You can configure granular roles inline.' 
                : 'Your current account is set up for a single operator. To collaborate with other deal underwriters, appraisers, or general contractors, upgrade to the Investment Team plan.'}
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-3 self-stretch md:self-auto justify-between border-t md:border-t-0 border-neutral-100 dark:border-neutral-800 pt-4 md:pt-0">
            {accountTier === 'Team' ? (
              <div className="space-y-1.5 w-full md:w-56">
                <div className="flex justify-between text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                  <span>Workspace Seat Capacity</span>
                  <span className="font-mono">{activeSeatsCount} / 10 Seats Used</span>
                </div>
                <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-neutral-900 dark:bg-neutral-50 rounded-full transition-all duration-300"
                    style={{ width: `${(activeSeatsCount / 10) * 100}%` }}
                  />
                </div>
                <button
                  onClick={() => handleTierChange('Individual')}
                  disabled={billingLoading || pendingTier !== null}
                  className="text-[11px] font-semibold text-red-500 dark:text-red-400 hover:underline text-left mt-2 block disabled:opacity-55 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                >
                  {pendingTier === 'Individual' && billingLoading ? 'Downgrading...' : 'Downgrade to Individual Tier'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleTierChange('Team')}
                disabled={billingLoading || pendingTier !== null}
                className="bg-neutral-950 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed font-semibold text-[13px] py-2 px-5 rounded-md flex items-center justify-center gap-1.5 transition-all focus-visible:ring-2 focus-visible:ring-neutral-900 cursor-pointer"
              >
                {pendingTier === 'Team' && billingLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
                {pendingTier === 'Team' && billingLoading ? 'Upgrading...' : 'Upgrade to Investment Team'}
              </button>
            )}
          </div>
        </div>

        {/* Warning Alerts / Info Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-start gap-2.5 bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-md border border-neutral-100 dark:border-neutral-800">
            <Info className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                Vendor Marketplace Policy
              </span>
              <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                To list services on the Vendor Marketplace, operators must purchase and subscribe to their own independent account. Corporate accounts do not extend listing privileges to invited team seats.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-neutral-50 dark:bg-neutral-800/40 p-3.5 rounded-md border border-neutral-100 dark:border-neutral-800">
            <Lock className="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 block">
                Scoped Access Lock
              </span>
              <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                Invited team members cannot create separate projects or organizations. They can only contribute to assets and folders under the inviter's organization workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Roster Table */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Personnel Table (lg:col-span-8) */}
        <div className="lg:col-span-8 bg-white dark:bg-stone-900 border border-neutral-100 dark:border-neutral-800 rounded-lg shadow-sm shadow-neutral-100/50 dark:shadow-none p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-neutral-500" />
              <h3 
                className="text-base font-bold text-neutral-900 dark:text-neutral-50"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Roster
              </h3>
            </div>
            
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or role..." 
                className="w-full bg-neutral-50 border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-xs rounded-md pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto relative min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-[13px] text-neutral-700 dark:text-neutral-300">
                {activePersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-neutral-400 dark:text-neutral-500">
                      <UserCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-[12px]">No active operators matched your search.</p>
                    </td>
                  </tr>
                ) : (
                  activePersonnel.map(member => {
                    const initials = member.displayName
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || member.email[0].toUpperCase();

                    const isInternal = member.type === 'Internal';
                    const isSuspended = member.status === 'suspended';
                    const isCurrentUser = member.email === profile?.email;

                    // Role badge styling
                    let badgeClass = "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400";
                    if (isInternal) {
                      if (member.role === 'CEO' || member.role === 'President' || member.role === 'Admin') {
                        badgeClass = "bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-400";
                      } else {
                        badgeClass = "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400";
                      }
                    }

                    return (
                      <tr 
                        key={member.email}
                        className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors"
                      >
                        {/* Member Identity */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-semibold text-[11px] text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-neutral-900 dark:text-neutral-50 truncate leading-none mb-1">
                                {member.displayName} {isCurrentUser && <span className="font-normal text-[10px] text-neutral-400 dark:text-neutral-500">(you)</span>}
                              </p>
                              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono truncate leading-none">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Inline Role Editing */}
                        <td className="px-4 py-3.5">
                          {isInternal && !isCurrentUser && isAdmin ? (
                            <div className="relative inline-block select-wrapper">
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value as InternalRole)}
                                onMouseEnter={() => setHoveredRoleTooltip(member.id)}
                                onMouseLeave={() => setHoveredRoleTooltip(null)}
                                className="appearance-none font-semibold text-[11px] uppercase tracking-wider pl-2 pr-6 py-0.5 rounded border focus:outline-none cursor-pointer focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-colors bg-white dark:bg-stone-900 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200"
                              >
                                <option value="CEO">CEO</option>
                                <option value="President">President</option>
                                <option value="CFO">CFO</option>
                                <option value="COO">COO</option>
                                <option value="Admin">Admin</option>
                                <option value="Deal Lead">Deal Lead</option>
                              </select>
                              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />

                              {/* Tooltip on hovered role select */}
                              {hoveredRoleTooltip === member.id && (
                                <div className="absolute left-0 bottom-full mb-1.5 w-64 bg-white dark:bg-stone-800 border border-neutral-100 dark:border-neutral-700 p-2.5 rounded shadow-lg z-50 text-[11px] text-neutral-500 dark:text-neutral-300">
                                  <strong className="text-neutral-800 dark:text-neutral-100 block mb-0.5">{member.role} Role Permissions:</strong>
                                  {ROLE_PERMISSIONS[member.role as InternalRole]}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${badgeClass}`}>
                                {member.role}
                              </span>
                              
                              {isInternal && (
                                <div className="group relative">
                                  <Info className="w-3 h-3 text-neutral-400 hover:text-neutral-600 cursor-pointer" />
                                  <div className="absolute left-0 bottom-full mb-1.5 w-56 bg-white dark:bg-stone-800 border border-neutral-100 dark:border-neutral-700 p-2 rounded shadow-md hidden group-hover:block z-50 text-[10px] text-neutral-500 dark:text-neutral-300 leading-normal">
                                    {ROLE_PERMISSIONS[member.role as InternalRole] || 'Scoped collaborator permissions.'}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Status Column */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isSuspended ? 'bg-red-500' : 'bg-green-500'
                            }`} />
                            <span className="text-[12px] font-medium">
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </div>
                        </td>

                        {/* Last Active */}
                        <td className="px-4 py-3.5 font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                          {member.lastActive}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {!isCurrentUser && isAdmin && isInternal && (
                              <>
                                <button
                                  onClick={() => handleToggleSuspend(member.id, member.email, member.status)}
                                  className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                                >
                                  {isSuspended ? 'Reactivate' : 'Suspend'}
                                </button>
                                <button
                                  onClick={() => handleRevokeAccess(member.id, member.email)}
                                  className="text-[11px] font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                                  title="Remove from organization"
                                >
                                  Remove
                                </button>
                              </>
                            )}

                            {!isInternal && isAdmin && (
                              <button
                                onClick={() => handleRevokeAccess(member.id, member.email)}
                                className="text-[11px] font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                                title="Revoke collaborator access"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Pending Invites & Audit logs (lg:col-span-4) */}
        <aside className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Pending Invitations Card */}
          <div className="bg-white dark:bg-stone-900 border border-neutral-100 dark:border-neutral-800 rounded-lg shadow-sm shadow-neutral-100/50 dark:shadow-none p-5">
            <h3 
              className="text-sm font-bold text-neutral-900 dark:text-neutral-50 mb-4 flex items-center gap-2"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              <Mail className="w-4 h-4 text-neutral-500" />
              Pending Invitations
            </h3>

            <div className="space-y-3">
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-8 text-[12px] text-neutral-400 dark:text-neutral-500">
                  No pending invites found.
                </div>
              ) : (
                pendingInvitations.map(invite => (
                  <div 
                    key={invite.email} 
                    className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded border border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                        {invite.email}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-1 rounded">
                          {invite.role}
                        </span>
                        {invite.invitedAt && (
                          <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-medium">
                            Sent {new Date(invite.invitedAt).toLocaleDateString()} {new Date(invite.invitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <span className="text-[9px] font-medium text-amber-600 dark:text-amber-500">
                          Expires in 48h
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => {
                          toast.promise(
                            (async () => {
                              const { resendTeamInvite } = await import('@/actions/team');
                              await resendTeamInvite(invite.email);

                              // Update Zustand store locally to reflect resend time
                              useUserStore.setState((state) => ({
                                teamMembers: state.teamMembers.map((m) =>
                                  m.email.toLowerCase() === invite.email.toLowerCase()
                                    ? { ...m, invitedAt: new Date() }
                                    : m
                                ),
                              }));

                            })(),
                            {
                              loading: `Resending invitation to ${invite.email}...`,
                              success: `Registration email resent to ${invite.email}`,
                              error: (err: any) => err.message || `Failed to resend invitation to ${invite.email}`,
                            }
                          );
                        }} 
                        className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors border border-transparent cursor-pointer"
                        title="Resend Invite"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleRevokeAccess(invite.id, invite.email)} 
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-500 hover:text-red-600 transition-colors border border-transparent cursor-pointer"
                        title="Cancel Invitation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>



        </aside>
      </section>

      {/* Invite Modal Dialog Overlay */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div 
            className="w-full max-w-lg bg-white dark:bg-stone-900 border border-neutral-100 dark:border-neutral-800 rounded-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150"
            style={{ fontFamily: "'Roboto', sans-serif" }}
          >
            {/* Modal Close Button */}
            <button 
              onClick={() => setInviteModalOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 rounded cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 
              className="text-[18px] font-bold text-neutral-900 dark:text-neutral-50 mb-1"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Invite Operators & Collaborators
            </h3>
            
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mb-4 leading-normal">
              Enter email addresses to provision workspace credentials. Seats invited count towards your 10-operator cap.
            </p>

            <form onSubmit={handleSendInvites} className="space-y-4">
              {/* Emails Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Email Addresses
                </label>
                <textarea
                  value={bulkEmailInput}
                  onChange={(e) => setBulkEmailInput(e.target.value)}
                  placeholder="name@company.com, partner@fund.com (separated by commas or newlines)"
                  rows={3}
                  className="w-full bg-neutral-50 border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-xs rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 placeholder:text-neutral-400 resize-none"
                />
              </div>

              {/* Initial Role Select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Initial Role assignment
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as InternalRole)}
                  className="w-full bg-neutral-50 border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-xs rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="Deal Lead">Deal Lead (Analyst/Underwriter)</option>
                  <option value="COO">COO (Operations & Task Manager)</option>
                  <option value="CFO">CFO (Financials & Underwriting Approver)</option>
                  <option value="Admin">Admin (Access Configurator)</option>
                  <option value="President">President (Platform Executive)</option>
                  <option value="CEO">CEO (Primary Operator)</option>
                </select>
              </div>

              {/* Scoped Invite Option (Lead Investor feature) */}
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="scoped-checkbox"
                    checked={enableScopedInvite}
                    onChange={(e) => setEnableScopedInvite(e.target.checked)}
                    className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="scoped-checkbox" className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300 cursor-pointer">
                    Apply direct task or project underwriting scope restriction
                  </label>
                </div>

                {enableScopedInvite && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded border border-neutral-100 dark:border-neutral-800">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Restrict to Project
                      </label>
                      <select
                        value={assignProject}
                        onChange={(e) => setAssignProject(e.target.value)}
                        className="w-full bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-[10px] rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      >
                        <option value="">Select Target Project</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.propertyName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                        Assign to Tab or Task
                      </label>
                      <input
                        type="text"
                        value={assignTabOrTask}
                        onChange={(e) => setAssignTabOrTask(e.target.value)}
                        placeholder="e.g. Underwriting tab, Task ID"
                        className="w-full bg-white border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 text-[10px] rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-md text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900 hover:opacity-90 rounded-md text-xs font-semibold transition-all cursor-pointer"
                >
                  Send Invitations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
