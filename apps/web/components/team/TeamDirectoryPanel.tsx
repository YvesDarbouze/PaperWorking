'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { bffFetch } from '@/lib/api/bff-fetch';
import { SEED_PROJECTS } from '@/lib/projects/seed-data';
import {
  INTERNAL_ROLES,
  ROLE_PERMISSIONS,
  TEAM_MEMBERS,
  TEAM_SEATS,
  WORKSPACE_ACCESS_LEVELS,
  getDefaultAccessLevelForRole,
  type InternalRole,
  type TeamMember,
  type WorkspaceAccessLevel,
} from '@/lib/dashboard/shell-seed';

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return email[0]?.toUpperCase() ?? '?';
}

function roleBadgeClass(role: string, isInternal: boolean): string {
  if (role === 'Manager') {
    return 'border-violet-500/30 bg-violet-500/15 text-violet-300';
  }
  if (role === 'Associate') {
    return 'border-sky-500/30 bg-sky-500/15 text-sky-300';
  }
  if (role === 'Vendor') {
    return 'border-amber-500/30 bg-amber-500/15 text-amber-300';
  }
  if (role === 'Intern') {
    return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300';
  }
  if (role === 'CEO' || role === 'President' || role === 'Admin') {
    return 'border-purple-500/30 bg-purple-500/15 text-purple-300';
  }
  if (!isInternal) {
    return 'border-white/10 bg-white/5 text-[#9E9DA0]';
  }
  return 'border-[#7A9EAA]/30 bg-[#7A9EAA]/15 text-[#7A9EAA]';
}

function accessBadgeClass(level: WorkspaceAccessLevel): string {
  if (level === 'Full Edit') {
    return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300';
  }
  if (level === 'Scoped Edit') {
    return 'border-sky-500/30 bg-sky-500/15 text-sky-300';
  }
  return 'border-amber-500/30 bg-amber-500/15 text-amber-300';
}

/**
 * Team Directory & Scopes: port of PaperWorking `/dashboard/team`.
 */
export default function TeamDirectoryPanel() {
  const [members, setMembers] = useState<TeamMember[]>(() =>
    TEAM_MEMBERS.map((m) => ({ ...m })),
  );
  const [accountTier, setAccountTier] = useState<'Individual' | 'Team'>(TEAM_SEATS.tier);
  const [seatLimit, setSeatLimit] = useState(TEAM_SEATS.limit);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [bulkEmailInput, setBulkEmailInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<InternalRole>('Manager');
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<WorkspaceAccessLevel>(
    getDefaultAccessLevelForRole('Manager'),
  );
  const [enableScopedInvite, setEnableScopedInvite] = useState(false);
  const [assignProject, setAssignProject] = useState('');
  const [assignTabOrTask, setAssignTabOrTask] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [hoveredRoleId, setHoveredRoleId] = useState<string | null>(null);

  const fetchTeam = async () => {
    try {
      const res = await bffFetch('/api/team', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.members)) {
          setMembers(data.members);
        }
        if (data.seats) {
          setAccountTier(data.seats.tier || 'Team');
          setSeatLimit(data.seats.limit || 10);
        }
      }
    } catch {
      // Graceful fallback to initial seed state
    }
  };

  useEffect(() => {
    void fetchTeam();
    void bffFetch('/api/projects', { cache: 'no-store' }).catch(() => {});
  }, []);

  const activePersonnel = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return members.filter((m) => {
      if (m.status === 'Removed' || m.status === 'Invited') return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q)
      );
    });
  }, [members, searchQuery]);

  const pendingInvitations = useMemo(
    () => members.filter((m) => m.status === 'Invited'),
    [members],
  );

  const activeSeatsCount = members.filter(
    (m) => m.status === 'Active' || m.status === 'Suspended' || m.status === 'Invited',
  ).length;

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  async function handleRoleChange(id: string, role: InternalRole) {
    const guessedAccess = getDefaultAccessLevelForRole(role);
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              role,
              accessLevel: guessedAccess,
              type: role === 'Vendor' ? 'External' : 'Internal',
            }
          : m,
      ),
    );
    showFlash(`Role changed to ${role} · Auto-assigned ${guessedAccess} access`);

    try {
      const res = await bffFetch(`/api/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          accessLevel: guessedAccess,
          type: role === 'Vendor' ? 'External' : 'Internal',
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showFlash(`Failed to save role: ${err.error || 'Server error'}`);
        void fetchTeam();
      }
    } catch {
      showFlash('Failed to save role. Please check network connection.');
      void fetchTeam();
    }
  }

  async function handleAccessLevelChange(id: string, accessLevel: WorkspaceAccessLevel) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, accessLevel } : m)),
    );
    showFlash(`Workspace edit access set to ${accessLevel}`);

    try {
      const res = await bffFetch(`/api/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessLevel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showFlash(`Failed to save access level: ${err.error || 'Server error'}`);
        void fetchTeam();
      }
    } catch {
      showFlash('Failed to save access level. Please check network connection.');
      void fetchTeam();
    }
  }

  async function handleToggleSuspend(id: string, email: string, status: TeamMember['status']) {
    const next = status === 'Suspended' ? 'Active' : 'Suspended';
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, status: next } : m)));
    showFlash(next === 'Suspended' ? `Suspended ${email}` : `Reactivated ${email}`);

    try {
      const res = await bffFetch(`/api/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showFlash(`Failed to update status: ${err.error || 'Server error'}`);
        void fetchTeam();
      }
    } catch {
      showFlash('Failed to update status.');
      void fetchTeam();
    }
  }

  async function handleRevoke(id: string, email: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    showFlash(`Revoked access for ${email}`);

    try {
      const res = await bffFetch(`/api/team/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showFlash(`Failed to remove member: ${err.error || 'Server error'}`);
        void fetchTeam();
      }
    } catch {
      showFlash('Failed to remove member.');
      void fetchTeam();
    }
  }

  async function handleResendInvite(id: string, email: string) {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, invitedAt: new Date().toISOString() } : m,
      ),
    );
    showFlash(`Registration email resent to ${email}`);

    try {
      const res = await bffFetch(`/api/team/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resend: true }),
      });
      if (!res.ok) {
        showFlash('Failed to resend invite.');
        void fetchTeam();
      }
    } catch {
      showFlash('Failed to resend invite.');
      void fetchTeam();
    }
  }

  async function handleTierChange(tier: 'Individual' | 'Team') {
    try {
      const res = await bffFetch('/api/team/tier', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (res.ok) {
        setAccountTier(tier);
        if (data.seats?.limit) {
          setSeatLimit(data.seats.limit);
        }
        showFlash(
          tier === 'Team'
            ? 'Upgraded workspace to Investment Team plan.'
            : 'Downgraded workspace to Individual Investor plan.',
        );
      } else {
        showFlash(data.error || 'Failed to update plan tier.');
      }
    } catch {
      showFlash('Failed to update subscription tier.');
    }
  }

  async function handleSendInvites(e: FormEvent) {
    e.preventDefault();
    const emails = bulkEmailInput
      .split(/[\s,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes('@'));

    if (emails.length === 0) {
      showFlash('Enter at least one valid email.');
      return;
    }
    if (enableScopedInvite && !assignProject) {
      showFlash('Select a project for scoped invite, or disable the restriction.');
      return;
    }
    if (activeSeatsCount + emails.length > seatLimit) {
      showFlash(
        `Cannot invite ${emails.length}: only ${seatLimit - activeSeatsCount} seats remaining.`,
      );
      return;
    }

    const projectName =
      SEED_PROJECTS.find((p) => p.id === assignProject)?.propertyName ?? assignProject;

    try {
      const res = await bffFetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          role: selectedRole,
          accessLevel: selectedAccessLevel,
          enableScopedInvite,
          assignProject: enableScopedInvite ? assignProject : undefined,
          assignTabOrTask: enableScopedInvite ? assignTabOrTask : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFlash(data.error || 'Failed to send invitations.');
        return;
      }

      if (Array.isArray(data.invited)) {
        setMembers((prev) => [...prev, ...data.invited]);
      }
      if (data.seats?.limit) {
        setSeatLimit(data.seats.limit);
      }

      setBulkEmailInput('');
      setEnableScopedInvite(false);
      setAssignProject('');
      setAssignTabOrTask('');
      setSelectedRole('Manager');
      setSelectedAccessLevel(getDefaultAccessLevelForRole('Manager'));
      setInviteModalOpen(false);

      showFlash(
        enableScopedInvite
          ? `Sent ${emails.length} scoped invite(s): restricted to “${projectName}”.`
          : `Sent ${emails.length} invitation(s).`,
      );
    } catch {
      showFlash('Failed to send invitations. Please try again.');
    }
  }

  return (
    <div
      className="mx-auto max-w-7xl space-y-6 px-4 pb-20 pt-4 sm:px-6"
      data-testid="team-directory-page"
    >
      {flash ? (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-[#161318] px-4 py-2.5 text-sm font-semibold text-emerald-300 shadow-xl">
          {flash}
        </div>
      ) : null}

      {/* Header */}
      <header className="mb-2 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#fdfffc]">
            Team Directory & Scopes
          </h1>
          <p className="mt-1 text-xs text-white/50">
            Manage operator permissions, provision collaboration credentials, and restrict
            marketplace credentials.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {accountTier === 'Team' ? (
            <button
              type="button"
              onClick={() => setInviteModalOpen(true)}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-2 text-[13px] font-bold text-slate-950 transition-all hover:bg-emerald-400"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Invite Team User
            </button>
          ) : null}
        </div>
      </header>

      {/* Tier panel */}
      <section className="rounded-xl border border-white/10 bg-[#161318]/90 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-xl space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                Subscription Tier
              </span>
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  accountTier === 'Team'
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-white/50'
                }`}
              >
                {accountTier} Active
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#fdfffc]">
              {accountTier === 'Team'
                ? 'Investment Team Workspace'
                : 'Investor Individual Plan'}
            </h2>
            <p className="text-[12px] leading-relaxed text-white/50">
              {accountTier === 'Team'
                ? 'Your account supports up to 10 team seats. Invited members are sandboxed to your projects and cannot create standalone deals. You can configure granular roles inline.'
                : 'Your current account is set up for a single operator. To collaborate with other deal underwriters, appraisers, or general contractors, upgrade to the Investment Team plan.'}
            </p>
          </div>

          <div className="flex w-full flex-col items-stretch justify-between gap-3 self-stretch border-t border-white/8 pt-4 md:w-auto md:items-end md:self-auto md:border-t-0 md:pt-0">
            {accountTier === 'Team' ? (
              <div className="w-full space-y-1.5 md:w-56">
                <div className="flex justify-between text-[11px] font-medium text-white/55">
                  <span>Workspace Seat Capacity</span>
                  <span className="font-mono">
                    {activeSeatsCount} / {seatLimit} Seats Used
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (activeSeatsCount / seatLimit) * 100)}%`,
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleTierChange('Individual')}
                  className="mt-2 block cursor-pointer text-left text-[11px] font-semibold text-red-400 hover:underline"
                >
                  Downgrade to Individual Tier
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleTierChange('Team')}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-emerald-500 px-5 py-2 text-[13px] font-semibold text-slate-950 transition-all hover:brightness-110"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                Upgrade to Investment Team
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/8 pt-6 md:grid-cols-2">
          <div className="flex items-start gap-2.5 rounded-md border border-white/8 bg-white/[0.03] p-3.5">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-white/40">
              info
            </span>
            <div className="space-y-0.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/45">
                Vendor Marketplace Policy
              </span>
              <p className="text-[11px] leading-relaxed text-white/45">
                To list services on the Vendor Marketplace, operators must purchase and subscribe to
                their own independent account. Corporate accounts do not extend listing privileges
                to invited team seats.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded-md border border-white/8 bg-white/[0.03] p-3.5">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-white/40">
              lock
            </span>
            <div className="space-y-0.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-white/45">
                Scoped Access Lock
              </span>
              <p className="text-[11px] leading-relaxed text-white/45">
                Invited team members cannot create separate projects or organizations. They can
                only contribute to assets and folders under the inviter&apos;s organization
                workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Roster + Pending */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-white/10 bg-[#161318]/90 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] lg:col-span-8">
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-white/45">group</span>
              <h2 className="text-base font-bold text-[#fdfffc]">Roster</h2>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/45">
                {activePersonnel.length}
              </span>
            </div>
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-white/35">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full rounded-md border border-white/10 bg-white/[0.04] py-1.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/35 focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          <div className="relative min-h-[300px] overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/8 text-[10px] font-bold uppercase tracking-wider text-white/40">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Workspace Access</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 text-[13px] text-white/70">
                {activePersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-white/40">
                      <span className="material-symbols-outlined mb-2 block text-4xl opacity-30">
                        account_circle
                      </span>
                      <p className="text-[12px]">No active operators matched your search.</p>
                    </td>
                  </tr>
                ) : (
                  activePersonnel.map((member) => {
                    const isInternal = member.type === 'Internal';
                    const isSuspended = member.status === 'Suspended';
                    const isEditableRole = !member.isYou;
                    const defaultAccess = getDefaultAccessLevelForRole(member.role);
                    const currentAccess = member.accessLevel ?? defaultAccess;
                    const isAccessOverridden =
                      member.accessLevel !== undefined && member.accessLevel !== defaultAccess;

                    return (
                      <tr
                        key={member.id}
                        className="transition-colors hover:bg-white/[0.03]"
                        data-testid={`team-row-${member.id}`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-white/70">
                              {initials(member.name, member.email)}
                            </div>
                            <div className="min-w-0">
                              <p className="mb-1 truncate font-semibold leading-none text-[#fdfffc]">
                                {member.name}{' '}
                                {member.isYou ? (
                                  <span className="text-[10px] font-normal text-white/40">(you)</span>
                                ) : null}
                              </p>
                              <p className="truncate font-mono text-[10px] leading-none text-white/40">
                                {member.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {isEditableRole ? (
                            <div
                              className="relative inline-block"
                              onMouseEnter={() => setHoveredRoleId(member.id)}
                              onMouseLeave={() => setHoveredRoleId(null)}
                            >
                              <select
                                value={member.role}
                                aria-label={`Role for ${member.name}`}
                                data-testid={`role-select-${member.id}`}
                                onChange={(e) =>
                                  handleRoleChange(member.id, e.target.value as InternalRole)
                                }
                                className="cursor-pointer appearance-none rounded border border-white/15 bg-[#0d0a0b] py-1 pl-2.5 pr-7 text-[11px] font-semibold uppercase tracking-wider text-white outline-none focus:ring-1 focus:ring-emerald-500/40"
                              >
                                <optgroup label="Standard Roles">
                                  <option value="Manager" className="bg-slate-950">Manager</option>
                                  <option value="Associate" className="bg-slate-950">Associate</option>
                                  <option value="Vendor" className="bg-slate-950">Vendor</option>
                                  <option value="Intern" className="bg-slate-950">Intern</option>
                                </optgroup>
                                <optgroup label="Executive & Pipeline Roles">
                                  <option value="Deal Lead" className="bg-slate-950">Deal Lead</option>
                                  <option value="Admin" className="bg-slate-950">Admin</option>
                                  <option value="COO" className="bg-slate-950">COO</option>
                                  <option value="CFO" className="bg-slate-950">CFO</option>
                                  <option value="President" className="bg-slate-950">President</option>
                                  <option value="CEO" className="bg-slate-950">CEO</option>
                                </optgroup>
                              </select>
                              <span className="material-symbols-outlined pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[12px] text-white/40">
                                expand_more
                              </span>
                              {hoveredRoleId === member.id ? (
                                <div className="absolute bottom-full left-0 z-50 mb-1.5 w-64 rounded border border-white/10 bg-[#1a1719] p-2.5 text-[11px] text-white/60 shadow-lg">
                                  <strong className="mb-0.5 block text-white">
                                    {member.role} Role Permissions:
                                  </strong>
                                  {ROLE_PERMISSIONS[member.role as InternalRole] ?? 'Workspace role'}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span
                                className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass(member.role, isInternal)}`}
                              >
                                {member.role}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {member.isYou ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                Full Edit (Owner)
                              </span>
                              <span className="block text-[10px] text-white/40">
                                Workspace administrator
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="relative inline-block">
                                <select
                                  value={currentAccess}
                                  aria-label={`Workspace access for ${member.name}`}
                                  data-testid={`access-level-select-${member.id}`}
                                  onChange={(e) =>
                                    handleAccessLevelChange(
                                      member.id,
                                      e.target.value as WorkspaceAccessLevel,
                                    )
                                  }
                                  className="cursor-pointer appearance-none rounded border border-white/15 bg-[#0d0a0b] py-1 pl-2.5 pr-7 text-[11px] font-semibold tracking-wide text-white outline-none focus:ring-1 focus:ring-emerald-500/40"
                                >
                                  {WORKSPACE_ACCESS_LEVELS.map((al) => (
                                    <option key={al.level} value={al.level} className="bg-slate-950">
                                      {al.label}
                                    </option>
                                  ))}
                                </select>
                                <span className="material-symbols-outlined pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[12px] text-white/40">
                                  expand_more
                                </span>
                              </div>
                              <div>
                                {isAccessOverridden ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                                    <span className="material-symbols-outlined text-[11px]">tune</span>
                                    Custom override
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-white/40">
                                    Guessed from {member.role}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isSuspended ? 'bg-red-500' : 'bg-emerald-500'
                              }`}
                            />
                            <span className="text-[12px] font-medium text-white/70">
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[11px] text-white/40">
                          {member.lastActive}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            {!member.isYou && isInternal ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleSuspend(member.id, member.email, member.status)
                                  }
                                  className="cursor-pointer text-[11px] font-semibold text-white/50 hover:text-white"
                                >
                                  {isSuspended ? 'Reactivate' : 'Suspend'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRevoke(member.id, member.email)}
                                  className="cursor-pointer text-[11px] font-semibold text-red-400 hover:text-red-300"
                                >
                                  Remove
                                </button>
                              </>
                            ) : null}
                            {!isInternal && !member.isYou ? (
                              <button
                                type="button"
                                onClick={() => handleRevoke(member.id, member.email)}
                                className="cursor-pointer text-[11px] font-semibold text-red-400 hover:text-red-300"
                              >
                                Revoke
                              </button>
                            ) : null}
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

        <aside className="flex flex-col gap-6 lg:col-span-4">
          <div className="rounded-xl border border-white/10 bg-[#161318]/90 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#fdfffc]">
              <span className="material-symbols-outlined text-[16px] text-white/45">mail</span>
              Pending Invitations
            </h2>
            <div className="space-y-3">
              {pendingInvitations.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-white/40">
                  No pending invites found.
                </div>
              ) : (
                pendingInvitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between gap-3 rounded border border-white/8 bg-white/[0.03] p-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-xs font-semibold text-white">{invite.email}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${roleBadgeClass(invite.role, invite.type === 'Internal')}`}>
                          {invite.role}
                        </span>
                        <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider ${accessBadgeClass(invite.accessLevel ?? getDefaultAccessLevelForRole(invite.role))}`}>
                          {invite.accessLevel ?? getDefaultAccessLevelForRole(invite.role)}
                        </span>
                        {invite.invitedAt ? (
                          <span className="text-[9px] font-medium text-white/40">
                            Sent {new Date(invite.invitedAt).toLocaleDateString()}
                          </span>
                        ) : null}
                        <span className="text-[9px] font-medium text-amber-400">Expires in 48h</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        title="Resend Invite"
                        onClick={() => void handleResendInvite(invite.id, invite.email)}
                        className="cursor-pointer rounded p-1 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <span className="material-symbols-outlined text-[16px]">refresh</span>
                      </button>
                      <button
                        type="button"
                        title="Cancel Invitation"
                        onClick={() => handleRevoke(invite.id, invite.email)}
                        className="cursor-pointer rounded p-1 text-white/45 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            href="/dashboard/settings/billing"
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/55 no-underline transition hover:bg-white/[0.04]"
          >
            <span className="font-semibold text-white">Billing & seats</span>
            <p className="mt-1 text-xs text-white/40">
              Manage plan upgrades and seat capacity in Settings → Billing.
            </p>
          </Link>
        </aside>
      </section>

      {/* Invite modal */}
      {inviteModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setInviteModalOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Invite operators"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-xl border border-white/10 bg-[#161318] p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="absolute right-4 top-4 cursor-pointer rounded text-white/40 hover:text-white"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="mb-1 text-lg font-bold text-[#fdfffc]">
              Invite Operators & Collaborators
            </h3>
            <p className="mb-4 text-[11px] leading-normal text-white/40">
              Enter email addresses to provision workspace credentials. Seats invited count towards
              your {seatLimit}-operator cap.
            </p>

            <form onSubmit={handleSendInvites} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/45">
                  Email Addresses
                </label>
                <textarea
                  value={bulkEmailInput}
                  onChange={(e) => setBulkEmailInput(e.target.value)}
                  placeholder="name@company.com, partner@fund.com (separated by commas or newlines)"
                  rows={3}
                  className="w-full resize-none rounded-md border border-white/10 bg-[#0d0a0b] p-2 text-xs text-white outline-none placeholder:text-white/30 focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/45">
                  Initial Role assignment
                </label>
                <select
                  value={selectedRole}
                  data-testid="modal-role-select"
                  onChange={(e) => {
                    const nextRole = e.target.value as InternalRole;
                    setSelectedRole(nextRole);
                    setSelectedAccessLevel(getDefaultAccessLevelForRole(nextRole));
                  }}
                  className="w-full cursor-pointer rounded-md border border-white/10 bg-[#0d0a0b] p-2 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500/40"
                >
                  <optgroup label="Standard Roles">
                    <option value="Manager">Manager (Full Workspace Management)</option>
                    <option value="Associate">Associate (Deal Execution & Underwriting)</option>
                    <option value="Vendor">Vendor (Bids & Subcontractor Tasks)</option>
                    <option value="Intern">Intern (Supervised / View-Only Access)</option>
                  </optgroup>
                  <optgroup label="Executive & Pipeline Roles">
                    <option value="Deal Lead">Deal Lead (Analyst/Underwriter)</option>
                    <option value="COO">COO (Operations & Task Manager)</option>
                    <option value="CFO">CFO (Financials & Underwriting Approver)</option>
                    <option value="Admin">Admin (Access Configurator)</option>
                    <option value="President">President (Platform Executive)</option>
                    <option value="CEO">CEO (Primary Operator)</option>
                  </optgroup>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-white/45">
                    Workspace Edit Access
                  </label>
                  <span className="text-[10px] font-medium text-emerald-400">
                    Auto-guessed for {selectedRole}
                  </span>
                </div>
                <select
                  value={selectedAccessLevel}
                  data-testid="modal-access-level-select"
                  onChange={(e) =>
                    setSelectedAccessLevel(e.target.value as WorkspaceAccessLevel)
                  }
                  className="w-full cursor-pointer rounded-md border border-white/10 bg-[#0d0a0b] p-2 text-xs text-white outline-none focus:ring-1 focus:ring-emerald-500/40"
                >
                  {WORKSPACE_ACCESS_LEVELS.map((al) => (
                    <option key={al.level} value={al.level}>
                      {al.label} — {al.description}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] leading-relaxed text-white/40">
                  Role default: <span className="font-semibold text-white/70">{getDefaultAccessLevelForRole(selectedRole)}</span>. You can adjust this operator&apos;s workspace edit level as needed.
                </p>
              </div>

              <div className="space-y-3 border-t border-white/8 pt-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="scoped-checkbox"
                    checked={enableScopedInvite}
                    onChange={(e) => setEnableScopedInvite(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-white/20"
                  />
                  <label
                    htmlFor="scoped-checkbox"
                    className="cursor-pointer text-[12px] font-semibold text-white/70"
                  >
                    Apply direct task or project underwriting scope restriction
                  </label>
                </div>

                {enableScopedInvite ? (
                  <div className="grid grid-cols-2 gap-3 rounded border border-white/8 bg-white/[0.03] p-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                        Restrict to Project
                      </label>
                      <select
                        value={assignProject}
                        onChange={(e) => setAssignProject(e.target.value)}
                        className="w-full cursor-pointer rounded border border-white/10 bg-[#0d0a0b] p-1.5 text-[10px] text-white outline-none"
                      >
                        <option value="">Select Target Project</option>
                        {SEED_PROJECTS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.propertyName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-white/40">
                        Assign to Tab or Task
                      </label>
                      <input
                        type="text"
                        value={assignTabOrTask}
                        onChange={(e) => setAssignTabOrTask(e.target.value)}
                        placeholder="e.g. Underwriting tab"
                        className="w-full rounded border border-white/10 bg-[#0d0a0b] p-1.5 text-[10px] text-white outline-none placeholder:text-white/30"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end gap-3 border-t border-white/8 pt-3">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="cursor-pointer rounded-md border border-white/15 px-4 py-2 text-xs font-semibold text-white/60 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-md bg-emerald-500 px-5 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  Send Invitations
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
