'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Trash2, Shield, Loader2, Mail, CheckCircle2, AlertTriangle, Users, Ban, PlayCircle, Activity } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useUserStore } from '@/store/userStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { OrgTeamMember, InternalRole, AuditLog, Permission } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Team & Role Management Settings

   Refactored to render inside the settings layout shell.
   Dynamically adapts based on billing tier (Individual vs Team).
   ═══════════════════════════════════════════════════════ */

const ROLE_OPTIONS: InternalRole[] = ['CEO', 'President', 'CFO', 'COO', 'Admin', 'Deal Lead'];

const ROLE_DESCRIPTION: Record<InternalRole, string> = {
  'CEO':       'Chief Executive Officer — full strategic and operational authority.',
  'President': 'President — leads company operations and organizational strategy.',
  'CFO':       'Chief Financial Officer — financial oversight and reporting.',
  'COO':       'Chief Operating Officer — day-to-day operations management.',
  'Admin':     'Full access to all deals, financials, and team management.',
  'Deal Lead': 'Manage assigned deals only; no billing or team admin access.',
};

const ALL_PERMISSIONS: Permission[] = [
  'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
  'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign',
  'reports.view', 'reports.export',
  'billing.manage', 'team.invite', 'team.manage_members', 'team.manage_roles',
  'vendors.manage', 'deal_marketplace.post', 'crowdfunding.manage', 'settings.manage'
];

function MemberRow({
  member,
  onRemove,
  onRoleChange,
  onSuspend,
  onScopeChange,
  onPermissionsChange,
}: {
  member: OrgTeamMember;
  onRemove: (id: string) => Promise<void>;
  onRoleChange: (id: string, role: InternalRole) => Promise<void>;
  onSuspend: (id: string, suspend: boolean) => Promise<void>;
  onScopeChange: (id: string, scope: 'tenant' | 'project') => Promise<void>;
  onPermissionsChange: (id: string, permissions: Permission[]) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try { await action(); } catch (e) { alert((e as Error).message); } finally { setLoading(false); }
  };

  const initials = member.displayName
    ? member.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : member.email[0].toUpperCase();

  const statusCls =
    member.status === 'active'  ? 'bg-green-50  text-green-700  border-green-200' :
    member.status === 'invited' ? 'bg-amber-50  text-amber-700  border-amber-200' :
    member.status === 'suspended' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-bg-primary  text-text-secondary   border-border-accent';

  return (
    <div className="flex flex-col border-b border-border-accent last:border-0">
      <div className="flex items-center gap-4 py-4">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-pw-fg text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{member.displayName || member.email}</p>
          <p className="text-xs text-text-secondary truncate">{member.email}</p>
        </div>

        {/* Role selector */}
        <select
          value={member.internalRole}
          onChange={(e) => handleAction(() => onRoleChange(member.id, e.target.value as InternalRole))}
          disabled={loading}
          className="text-xs bg-bg-primary border border-border-accent px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-pw-black disabled:opacity-50"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* Scope selector */}
        <select
          value={member.scope || 'project'}
          onChange={(e) => handleAction(() => onScopeChange(member.id, e.target.value as 'tenant' | 'project'))}
          disabled={loading}
          className="text-xs bg-bg-primary border border-border-accent px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-pw-black disabled:opacity-50"
        >
          <option value="tenant">Tenant Wide</option>
          <option value="project">Project Scoped</option>
        </select>

        {/* Permissions toggle */}
        <button
          onClick={() => setShowPermissions(!showPermissions)}
          className="text-xs px-2 py-1.5 border border-border-accent bg-bg-surface hover:bg-bg-primary transition-colors disabled:opacity-50"
          disabled={loading}
        >
          Permissions
        </button>

        {/* Status badge */}
        <span className={`hidden sm:inline-flex text-xs font-medium border px-2 py-0.5 ${statusCls}`}>
          {member.status}
        </span>

        {/* Suspend */}
        <button
          onClick={() => handleAction(() => onSuspend(member.id, member.status !== 'suspended'))}
          disabled={loading}
          className="p-1.5 text-text-secondary hover:text-amber-600 transition-colors disabled:opacity-50"
          aria-label={member.status === 'suspended' ? 'Unsuspend member' : 'Suspend member'}
        >
          {member.status === 'suspended' ? <PlayCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
        </button>

        {/* Remove */}
        <button
          onClick={() => handleAction(() => onRemove(member.id))}
          disabled={loading}
          className="p-1.5 text-text-secondary hover:text-red-600 transition-colors disabled:opacity-50"
          aria-label="Remove member"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {showPermissions && (
        <div className="p-4 bg-bg-primary border-t border-border-accent text-xs">
          <p className="font-semibold text-text-secondary mb-3 uppercase tracking-widest">Custom Permissions</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ALL_PERMISSIONS.map((p) => {
              const isChecked = member.customPermissions?.includes(p) || false;
              return (
                <label key={p} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={loading}
                    onChange={(e) => {
                      const current = member.customPermissions || [];
                      const next = e.target.checked ? [...current, p] : current.filter((c) => c !== p);
                      handleAction(() => onPermissionsChange(member.id, next));
                    }}
                    className="cursor-pointer text-pw-black focus:ring-pw-black"
                  />
                  <span className="text-text-primary truncate" title={p}>{p.split('.').join(' > ')}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamManagementPage() {
  const { profile } = useAuth();
  const { isLead } = usePermissions();
  const { teamMembers, maxSeats, addTeamMember, removeTeamMember, updateMemberRole, suspendTeamMember, updateMemberScope, updateMemberPermissions } = useUserStore();

  const [email,       setEmail]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role,        setRole]        = useState<InternalRole>('Deal Lead');
  const [inviting,    setInviting]    = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invited,     setInvited]     = useState(false);
  const [auditLogs,   setAuditLogs]   = useState<AuditLog[]>([]);

  useEffect(() => {
    if (isLead) {
      import('@/actions/team').then(({ getAuditLogs }) => {
        getAuditLogs().then(setAuditLogs).catch(console.error);
      });
    }
  }, [isLead]);

  const activeMembers = teamMembers.filter((m) => m.status !== 'removed');

  const handleRemove = async (id: string) => {
    const { removeTeamMember: serverRemove } = await import('@/actions/team');
    await serverRemove(id);
    removeTeamMember(id);
  };

  const handleRoleChange = async (id: string, newRole: InternalRole) => {
    const { updateMemberRoleAndPermissions } = await import('@/actions/team');
    await updateMemberRoleAndPermissions(id, newRole);
    updateMemberRole(id, newRole);
  };

  const handleSuspend = async (id: string, suspend: boolean) => {
    const { suspendTeamMember: serverSuspend } = await import('@/actions/team');
    await serverSuspend(id, suspend);
    suspendTeamMember(id, suspend);
  };

  const handleScopeChange = async (id: string, scope: 'tenant' | 'project') => {
    const member = activeMembers.find(m => m.id === id);
    if (!member) return;
    const { updateMemberScope: serverUpdateScope } = await import('@/actions/team');
    await serverUpdateScope(id, scope, member.assignedProjectIds);
    updateMemberScope(id, scope);
  };

  const handlePermissionsChange = async (id: string, permissions: Permission[]) => {
    const member = activeMembers.find(m => m.id === id);
    if (!member) return;
    const { updateMemberRoleAndPermissions } = await import('@/actions/team');
    await updateMemberRoleAndPermissions(id, member.internalRole, permissions);
    updateMemberPermissions(id, permissions);
  };

  const plan          = profile?.subscriptionPlan ?? 'None';
  const isTeamPlan    = plan === 'Team';
  const usedSeats     = activeMembers.length;
  const seatsLeft     = maxSeats - usedSeats;
  const seatPercent   = maxSeats > 0 ? Math.round((usedSeats / maxSeats) * 100) : 0;

  // Gate: only Lead Investors on the Team plan may manage members
  if (!isLead || !isTeamPlan) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-bg-surface border border-border-accent p-8 max-w-sm text-center space-y-4">
          <Shield className="w-10 h-10 text-text-secondary mx-auto" />
          <h2 className="text-lg font-medium text-text-primary">Team Plan Required</h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            Team management is available exclusively on the Investor Team plan for Lead Investors.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition"
          >
            Upgrade to Team →
          </Link>
        </div>
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    if (seatsLeft <= 0) {
      setInviteError(`Seat limit reached (${maxSeats} seats). Remove a member to invite someone new.`);
      return;
    }

    if (!email.trim()) {
      setInviteError('Email is required.');
      return;
    }

    if (activeMembers.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) {
      setInviteError('This email is already on the team.');
      return;
    }

    setInviting(true);
    try {
      const newMember: OrgTeamMember = {
        id:                 `member_${Date.now()}`,
        email:              email.trim().toLowerCase(),
        displayName:        displayName.trim() || email.trim(),
        internalRole:       role,
        assignedProjectIds: [],
        invitedAt:          new Date(),
        status:             'invited',
      };

      addTeamMember(newMember);

      // Persist invitation in Firestore via server action
      const { persistTeamInvite } = await import('@/actions/team');
      await persistTeamInvite(newMember);

      setInvited(true);
      setEmail('');
      setDisplayName('');
      setRole('Deal Lead');
      setTimeout(() => setInvited(false), 3000);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ═══ Seat Tracker ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Seat Usage</h2>
          <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            {usedSeats} of {maxSeats} Seats Filled
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2.5 bg-bg-primary rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              seatPercent >= 90 ? 'bg-red-500' : seatPercent >= 70 ? 'bg-amber-500' : 'bg-pw-fg'
            }`}
            style={{ width: `${Math.min(seatPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-text-secondary mt-2">
          {seatsLeft > 0
            ? `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} remaining on your Team plan.`
            : 'All seats are occupied. Remove a member or upgrade to add more.'}
        </p>
      </section>

      {/* ═══ Role Permissions Legend ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">Role Permissions</h2>
        <div className="space-y-3">
          {ROLE_OPTIONS.map((r) => (
            <div key={r} className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-text-secondary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-text-primary">{r}</p>
                <p className="text-xs text-text-secondary">{ROLE_DESCRIPTION[r]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Active Directory ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-1">
          Team Members
        </h2>
        <p className="text-xs text-text-secondary mb-5">{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} remaining</p>

        {activeMembers.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No team members yet. Invite your first collaborator below.</p>
          </div>
        ) : (
          <div>
            {activeMembers.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onRemove={handleRemove}
                onRoleChange={handleRoleChange}
                onSuspend={handleSuspend}
                onScopeChange={handleScopeChange}
                onPermissionsChange={handlePermissionsChange}
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══ Invite Hub ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-5">
          Invite a Team Member
        </h2>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@realtycorp.com"
                className="w-full text-sm bg-bg-primary border border-border-accent px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-pw-black"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Realty"
                className="w-full text-sm bg-bg-primary border border-border-accent px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-pw-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InternalRole)}
              className="w-full text-sm bg-bg-primary border border-border-accent px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-pw-black"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r} — {ROLE_DESCRIPTION[r]}</option>
              ))}
            </select>
          </div>

          {inviteError && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {inviteError}
            </div>
          )}

          {invited && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> Invitation sent successfully.
            </div>
          )}

          <button
            type="submit"
            disabled={inviting || seatsLeft <= 0}
            className="inline-flex items-center gap-2 bg-pw-black text-white text-sm font-medium px-5 py-2.5 hover:opacity-90 transition disabled:opacity-50"
          >
            {inviting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending invite…</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Send Invite <Mail className="w-3.5 h-3.5" /></>
            )}
          </button>

          {seatsLeft <= 0 && (
            <p className="text-xs text-text-secondary">
              Seat limit reached. Remove a member or{' '}
              <Link href="/dashboard/settings/billing" className="underline">upgrade your plan</Link>.
            </p>
          )}
        </form>
      </section>

      {/* ═══ Audit Log ═══ */}
      <section className="bg-bg-surface border border-border-accent p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-5 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Audit Log
        </h2>

        {auditLogs.length === 0 ? (
          <p className="text-sm text-text-secondary">No audit logs available.</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="text-sm flex flex-col sm:flex-row sm:items-start justify-between border-b border-border-accent pb-3 last:border-0 last:pb-0 gap-2">
                <div>
                  <p className="font-medium text-text-primary">{log.actorName} <span className="font-normal text-text-secondary">performed</span> {log.action}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Target: {log.targetEmail || log.targetUid || 'N/A'} {log.metadata ? `• ${JSON.stringify(log.metadata)}` : ''}
                  </p>
                </div>
                <div className="text-xs text-text-secondary whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
