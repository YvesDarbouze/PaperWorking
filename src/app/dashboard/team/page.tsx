'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { getTeamMembers } from '@/actions/getTeamMembers';
import { useUserStore } from '@/store/userStore';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/lib/utils/ThemeProvider';
import { 
  Users, UserCircle, Search, RefreshCw, Plus, X, 
  ChevronDown, Mail, Info, Lock, Trash2
} from 'lucide-react';
import type { ProjectTeamMember, InternalRole } from '@/types/schema';
import { usePermissions } from '@/hooks/usePermissions';
import toast from 'react-hot-toast';
import { useBilling } from '@/hooks/useBilling';
import { teamTokens, panelStyle, inputStyle } from '@/components/team/teamTheme';

/* Team directory — access & seat ops desk */

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
  const t = teamTokens(isDark);
  const panel = panelStyle(t);
  const field = inputStyle(t);

  const roleBadge = (role: string, isInternal: boolean) => {
    if (!isInternal) {
      return { background: t.surfaceMuted, color: t.muted, border: `1px solid ${t.border}` };
    }
    if (role === 'CEO' || role === 'President' || role === 'Admin') {
      return { background: t.accentMuted, color: t.accent, border: `1px solid ${t.border}` };
    }
    return { background: t.surfaceHigh, color: t.heading, border: `1px solid ${t.border}` };
  };

  return (
    <div className="min-h-full pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 py-6" style={{ background: t.pageBg, color: t.body }}>

      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 pb-5" style={{ borderBottom: `1px solid ${t.divider}` }}>
        <div>
          <p className="text-[11px] font-medium tracking-[0.14em] uppercase mb-1" style={{ color: t.accent }}>
            Access control
          </p>
          <h1 className="text-[1.75rem] font-semibold tracking-tight" style={{ color: t.heading }}>
            Team
          </h1>
          <p className="text-sm mt-1.5 leading-relaxed max-w-xl" style={{ color: t.muted }}>
            Seat capacity, roles, and pending invites for operators on your deals.
          </p>
        </div>

        {accountTier === 'Team' && (
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="pw-interactive-custom flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '8px 14px' }}
          >
            <Plus className="w-4 h-4" />
            Invite team user
          </button>
        )}
      </header>

      {/* Tier & seat capacity */}
      <section className="p-5 sm:p-6" style={panel}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
                Subscription tier
              </span>
              <span
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  borderRadius: 2,
                  background: accountTier === 'Team' ? t.accentMuted : t.surfaceMuted,
                  color: accountTier === 'Team' ? t.accent : t.muted,
                  border: `1px solid ${t.border}`,
                }}
              >
                {accountTier} active
              </span>
            </div>

            <h2 className="text-lg font-semibold tracking-tight" style={{ color: t.heading }}>
              {accountTier === 'Team' ? 'Investment team workspace' : 'Investor individual plan'}
            </h2>

            <p className="text-[12px] leading-relaxed" style={{ color: t.muted }}>
              {accountTier === 'Team'
                ? 'Up to 10 seats. Invited members stay sandboxed to your projects and cannot create standalone deals. Configure roles inline in the roster.'
                : 'Single-operator account. Upgrade to Investment Team to collaborate with underwriters, appraisers, or contractors.'}
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-3 self-stretch md:self-auto justify-between pt-4 md:pt-0 md:border-0 border-t" style={{ borderColor: t.divider }}>
            {accountTier === 'Team' ? (
              <div className="space-y-1.5 w-full md:w-56">
                <div className="flex justify-between text-[11px] font-medium" style={{ color: t.muted }}>
                  <span>Seat capacity</span>
                  <span className="tabular-nums" style={{ color: t.heading }}>{activeSeatsCount} / 10</span>
                </div>
                <div className="h-1.5 overflow-hidden" style={{ background: t.surfaceHigh, borderRadius: 1 }}>
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${Math.min((activeSeatsCount / 10) * 100, 100)}%`,
                      background: activeSeatsCount >= 10 ? t.alert : t.ctaBg,
                      borderRadius: 1,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleTierChange('Individual')}
                  disabled={billingLoading || pendingTier !== null}
                  className="pw-interactive-custom text-[11px] font-semibold text-left mt-2 block disabled:opacity-55 disabled:cursor-not-allowed"
                  style={{ background: 'transparent', border: 'none', padding: 0, color: t.alert }}
                >
                  {pendingTier === 'Individual' && billingLoading ? 'Downgrading…' : 'Downgrade to individual'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleTierChange('Team')}
                disabled={billingLoading || pendingTier !== null}
                className="pw-interactive-custom flex items-center justify-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-55 disabled:cursor-not-allowed"
                style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '8px 18px' }}
              >
                {pendingTier === 'Team' && billingLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                {pendingTier === 'Team' && billingLoading ? 'Upgrading…' : 'Upgrade to Investment Team'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6 pt-5" style={{ borderTop: `1px solid ${t.divider}` }}>
          <div className="flex items-start gap-2.5 p-3.5" style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: t.muted }} />
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] block" style={{ color: t.muted }}>
                Vendor marketplace
              </span>
              <p className="text-[11px] leading-relaxed" style={{ color: t.muted }}>
                Marketplace listing requires an independent vendor subscription. Corporate seats do not inherit listing privileges.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3.5" style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}>
            <Lock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: t.muted }} />
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] block" style={{ color: t.muted }}>
                Scoped access
              </span>
              <p className="text-[11px] leading-relaxed" style={{ color: t.muted }}>
                Invited members cannot create separate projects or organizations. They only contribute under this workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roster + pending */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 p-5 sm:p-6" style={panel}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: t.muted }} />
              <h2 className="text-base font-semibold tracking-tight" style={{ color: t.heading }}>
                Roster
              </h2>
              <span className="text-[11px] tabular-nums" style={{ color: t.muted }}>
                {activePersonnel.length}
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.muted }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, email, or role…"
                className="w-full text-xs pl-9 pr-3 py-2 outline-none focus:ring-1"
                style={{ ...field, ['--tw-ring-color' as string]: t.accent }}
              />
            </div>
          </div>

          <div className="overflow-x-auto relative min-h-[280px]">
            <table className="w-full text-left border-collapse min-w-[650px]">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ borderBottom: `1px solid ${t.divider}`, color: t.muted }}>
                  <th className="px-3 py-2.5 font-semibold">Member</th>
                  <th className="px-3 py-2.5 font-semibold">Role</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Last active</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-[13px]" style={{ color: t.body }}>
                {activePersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center" style={{ color: t.muted }}>
                      <UserCircle className="w-9 h-9 mx-auto mb-2 opacity-40" />
                      <p className="text-[12px]">No operators match this search.</p>
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
                    const badge = roleBadge(member.role, isInternal);

                    return (
                      <tr
                        key={member.email}
                        className="transition-colors"
                        style={{ borderBottom: `1px solid ${t.divider}` }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 flex items-center justify-center font-semibold text-[11px] shrink-0"
                              style={{
                                borderRadius: 2,
                                background: t.surfaceMuted,
                                color: t.heading,
                                border: `1px solid ${t.border}`,
                              }}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate leading-none mb-1" style={{ color: t.heading }}>
                                {member.displayName}{' '}
                                {isCurrentUser && (
                                  <span className="font-normal text-[10px]" style={{ color: t.muted }}>(you)</span>
                                )}
                              </p>
                              <p className="text-[10px] font-mono truncate leading-none" style={{ color: t.muted }}>
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          {isInternal && !isCurrentUser && isAdmin ? (
                            <div className="relative inline-block">
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, e.target.value as InternalRole)}
                                onMouseEnter={() => setHoveredRoleTooltip(member.id)}
                                onMouseLeave={() => setHoveredRoleTooltip(null)}
                                className="appearance-none font-semibold text-[11px] uppercase tracking-wider pl-2 pr-6 py-0.5 outline-none cursor-pointer"
                                style={{ ...field, borderRadius: 2 }}
                              >
                                <option value="CEO">CEO</option>
                                <option value="President">President</option>
                                <option value="CFO">CFO</option>
                                <option value="COO">COO</option>
                                <option value="Admin">Admin</option>
                                <option value="Deal Lead">Deal Lead</option>
                              </select>
                              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: t.muted }} />

                              {hoveredRoleTooltip === member.id && (
                                <div
                                  className="absolute left-0 bottom-full mb-1.5 w-64 p-2.5 z-50 text-[11px]"
                                  style={{ ...panel, color: t.muted, boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 8px 24px rgba(20,22,28,0.12)' }}
                                >
                                  <strong className="block mb-0.5" style={{ color: t.heading }}>{member.role} permissions</strong>
                                  {ROLE_PERMISSIONS[member.role as InternalRole]}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span
                                className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                                style={{ ...badge, borderRadius: 2 }}
                              >
                                {member.role}
                              </span>
                              {isInternal && (
                                <div className="group relative">
                                  <Info className="w-3 h-3 cursor-pointer" style={{ color: t.muted }} />
                                  <div
                                    className="absolute left-0 bottom-full mb-1.5 w-56 p-2 z-50 text-[10px] leading-normal hidden group-hover:block"
                                    style={{ ...panel, color: t.muted }}
                                  >
                                    {ROLE_PERMISSIONS[member.role as InternalRole] || 'Scoped collaborator permissions.'}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: isSuspended ? t.alert : t.success }}
                            />
                            <span className="text-[12px] font-medium" style={{ color: isSuspended ? t.alert : t.heading }}>
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 font-mono text-[11px]" style={{ color: t.muted }}>
                          {member.lastActive}
                        </td>

                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {!isCurrentUser && isAdmin && isInternal && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleSuspend(member.id, member.email, member.status)}
                                  className="pw-interactive-custom text-[11px] font-semibold"
                                  style={{ background: 'transparent', border: 'none', padding: 0, color: t.muted }}
                                >
                                  {isSuspended ? 'Reactivate' : 'Suspend'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeAccess(member.id, member.email)}
                                  className="pw-interactive-custom text-[11px] font-semibold"
                                  style={{ background: 'transparent', border: 'none', padding: 0, color: t.alert }}
                                  title="Remove from organization"
                                >
                                  Remove
                                </button>
                              </>
                            )}

                            {!isInternal && isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRevokeAccess(member.id, member.email)}
                                className="pw-interactive-custom text-[11px] font-semibold"
                                style={{ background: 'transparent', border: 'none', padding: 0, color: t.alert }}
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

        <aside className="lg:col-span-4 flex flex-col gap-5">
          <div className="p-5" style={panel}>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: t.heading }}>
              <Mail className="w-4 h-4" style={{ color: t.muted }} />
              Pending invitations
              {pendingInvitations.length > 0 && (
                <span
                  className="ml-auto text-[10px] font-semibold tabular-nums px-1.5 py-0.5"
                  style={{ background: t.warnMuted, color: t.warn, borderRadius: 2 }}
                >
                  {pendingInvitations.length}
                </span>
              )}
            </h2>

            <div className="space-y-2.5">
              {pendingInvitations.length === 0 ? (
                <div className="text-center py-8 text-[12px]" style={{ color: t.muted }}>
                  No pending invites.
                </div>
              ) : (
                pendingInvitations.map(invite => (
                  <div
                    key={invite.email}
                    className="p-3 flex items-center justify-between gap-3"
                    style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold truncate" style={{ color: t.heading }}>
                        {invite.email}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[9px] font-mono px-1"
                          style={{ background: t.surfaceHigh, color: t.muted, borderRadius: 2 }}
                        >
                          {invite.role}
                        </span>
                        {invite.invitedAt && (
                          <span className="text-[9px] font-medium" style={{ color: t.muted }}>
                            Sent {new Date(invite.invitedAt).toLocaleDateString()}{' '}
                            {new Date(invite.invitedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <span className="text-[9px] font-medium" style={{ color: t.warn }}>
                          Expires in 48h
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          toast.promise(
                            (async () => {
                              const { resendTeamInvite } = await import('@/actions/team');
                              await resendTeamInvite(invite.email);
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
                        className="pw-interactive-custom p-1.5 transition-colors"
                        style={{ background: 'transparent', border: 'none', borderRadius: 2, color: t.muted }}
                        title="Resend invite"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeAccess(invite.id, invite.email)}
                        className="pw-interactive-custom p-1.5 transition-colors"
                        style={{ background: 'transparent', border: 'none', borderRadius: 2, color: t.muted }}
                        title="Cancel invitation"
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

      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg p-6 relative" style={{ ...panel, boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.5)' : '0 16px 48px rgba(20,22,28,0.16)' }}>
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="pw-interactive-custom absolute top-4 right-4"
              style={{ background: 'transparent', border: 'none', padding: 4, borderRadius: 2, color: t.muted }}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold tracking-tight mb-1" style={{ color: t.heading }}>
              Invite operators
            </h3>
            <p className="text-[12px] mb-4 leading-relaxed" style={{ color: t.muted }}>
              Enter emails to provision workspace access. Each invite counts toward your 10-seat cap.
            </p>

            <form onSubmit={handleSendInvites} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
                  Email addresses
                </label>
                <textarea
                  value={bulkEmailInput}
                  onChange={(e) => setBulkEmailInput(e.target.value)}
                  placeholder="name@company.com, partner@fund.com"
                  rows={3}
                  className="w-full text-xs p-2.5 outline-none resize-none"
                  style={field}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
                  Initial role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as InternalRole)}
                  className="w-full text-xs p-2.5 outline-none"
                  style={field}
                >
                  <option value="Deal Lead">Deal Lead (Analyst/Underwriter)</option>
                  <option value="COO">COO (Operations & Task Manager)</option>
                  <option value="CFO">CFO (Financials & Underwriting Approver)</option>
                  <option value="Admin">Admin (Access Configurator)</option>
                  <option value="President">President (Platform Executive)</option>
                  <option value="CEO">CEO (Primary Operator)</option>
                </select>
              </div>

              <div className="pt-3 space-y-3" style={{ borderTop: `1px solid ${t.divider}` }}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="scoped-checkbox"
                    checked={enableScopedInvite}
                    onChange={(e) => setEnableScopedInvite(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                    style={{ accentColor: t.accent }}
                  />
                  <label htmlFor="scoped-checkbox" className="text-[12px] font-semibold cursor-pointer" style={{ color: t.heading }}>
                    Restrict invite to a project or task
                  </label>
                </div>

                {enableScopedInvite && (
                  <div
                    className="grid grid-cols-2 gap-3 p-3"
                    style={{ background: t.surfaceMuted, border: `1px solid ${t.border}`, borderRadius: 2 }}
                  >
                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
                        Project
                      </label>
                      <select
                        value={assignProject}
                        onChange={(e) => setAssignProject(e.target.value)}
                        className="w-full text-[10px] p-1.5 outline-none"
                        style={field}
                      >
                        <option value="">Select project</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.propertyName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.muted }}>
                        Tab or task
                      </label>
                      <input
                        type="text"
                        value={assignTabOrTask}
                        onChange={(e) => setAssignTabOrTask(e.target.value)}
                        placeholder="e.g. Underwriting tab"
                        className="w-full text-[10px] p-1.5 outline-none"
                        style={field}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3" style={{ borderTop: `1px solid ${t.divider}` }}>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="pw-interactive-custom text-xs font-semibold"
                  style={{ background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 2, padding: '8px 14px', color: t.muted }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pw-interactive-custom text-xs font-semibold transition-opacity hover:opacity-90"
                  style={{ background: t.ctaBg, color: t.ctaFg, border: 'none', borderRadius: 2, padding: '8px 16px' }}
                >
                  Send invitations
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
