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

  const isSuspended = member.status === 'suspended';

  const statusCls =
    member.status === 'active'  ? 'bg-primary/10  text-primary  border-primary/20' :
    member.status === 'invited' ? 'bg-amber-500/10  text-amber-500  border-amber-500/20 animate-pulse' :
    isSuspended ? 'bg-error/10 text-error border-error/20' :
                                  'bg-white/5  text-on-surface-variant border-white/10';

  return (
    <div className="flex flex-col border-b border-white/5 last:border-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
        {/* Left Side: Avatar & Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-[0_0_10px_rgba(87,241,219,0.1)]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate">{member.displayName || member.email}</p>
            <p className="text-xs text-on-surface-variant truncate font-mono mt-0.5">{member.email}</p>
          </div>
        </div>

        {/* Right Side: Selectors & Actions */}
        <div className="flex flex-wrap items-center gap-3 justify-start sm:justify-end">
          {/* Role selector */}
          <select
            value={member.internalRole}
            onChange={(e) => handleAction(() => onRoleChange(member.id, e.target.value as InternalRole))}
            disabled={loading}
            className="text-xs bg-surface-container border border-white/10 rounded-lg px-2.5 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r} className="bg-surface-container-high">{r}</option>
            ))}
          </select>

          {/* Scope selector */}
          <select
            value={member.scope || 'project'}
            onChange={(e) => handleAction(() => onScopeChange(member.id, e.target.value as 'tenant' | 'project'))}
            disabled={loading}
            className="text-xs bg-surface-container border border-white/10 rounded-lg px-2.5 py-1.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="tenant" className="bg-surface-container-high">Tenant Wide</option>
            <option value="project" className="bg-surface-container-high">Project Scoped</option>
          </select>

          {/* Permissions toggle */}
          <button
            onClick={() => setShowPermissions(!showPermissions)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border border-white/10 transition-colors disabled:opacity-50 ${
              showPermissions 
                ? 'bg-primary/20 text-primary border-primary/30' 
                : 'bg-white/5 text-on-surface-variant hover:bg-white/10 hover:text-on-surface'
            }`}
            disabled={loading}
          >
            Permissions
          </button>

          {/* Status badge */}
          <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full ${statusCls}`}>
            {member.status}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {/* Suspend */}
            <button
              onClick={() => handleAction(() => onSuspend(member.id, member.status !== 'suspended'))}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                isSuspended 
                  ? 'text-primary hover:bg-primary/10' 
                  : 'text-on-surface-variant hover:text-amber-500 hover:bg-white/5'
              }`}
              aria-label={isSuspended ? 'Unsuspend member' : 'Suspend member'}
              title={isSuspended ? 'Unsuspend Member' : 'Suspend Member'}
            >
              {isSuspended ? <PlayCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
            </button>

            {/* Remove */}
            <button
              onClick={() => handleAction(() => onRemove(member.id))}
              disabled={loading}
              className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-white/5 transition-colors disabled:opacity-50"
              aria-label="Remove member"
              title="Remove Member"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showPermissions && (
        <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl mt-2 mb-4 text-xs animate-fadeIn shadow-inner">
          <p className="font-bold text-primary mb-3 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Custom Authorization Scopes
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ALL_PERMISSIONS.map((p) => {
              const isChecked = member.customPermissions?.includes(p) || false;
              return (
                <label key={p} className="flex items-center gap-2 cursor-pointer select-none py-1 px-1.5 rounded hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={loading}
                    onChange={(e) => {
                      const current = member.customPermissions || [];
                      const next = e.target.checked ? [...current, p] : current.filter((c) => c !== p);
                      handleAction(() => onPermissionsChange(member.id, next));
                    }}
                    className="cursor-pointer rounded text-primary focus:ring-primary border-white/10 bg-surface-container"
                  />
                  <span className="text-on-surface truncate" title={p}>{p.split('.').join(' > ')}</span>
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
      <div className="flex items-center justify-center py-20 px-4">
        <div className="glass-card border border-white/10 p-8 max-w-sm text-center space-y-4 rounded-2xl shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary shadow-[0_0_15px_rgba(87,241,219,0.2)] animate-pulse">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-on-surface">Team Plan Required</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Team management is available exclusively on the Investor Team plan for Lead Investors.
          </p>
          <Link
            href="/pricing"
            className="luminous-button inline-flex items-center justify-center gap-2 text-sm font-bold px-6 py-3 rounded-xl w-full transition-all duration-300"
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
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Floating Atmosphere Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute bottom-[10%] left-[-10%] w-[30%] h-[30%] bg-primary/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>

      {/* ═══ Seat Tracker ═══ */}
      <section className="glass-card border border-white/5 p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">groups</span>
            Seat Usage
          </h2>
          <span className="text-xs font-bold uppercase tracking-widest text-primary font-mono">
            {usedSeats} of {maxSeats} Seats Filled
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2.5 bg-white/5 border border-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(87,241,219,0.3)] ${
              seatPercent >= 90 ? 'bg-error' : seatPercent >= 70 ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min(seatPercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-on-surface-variant mt-2 font-mono">
          {seatsLeft > 0
            ? `${seatsLeft} seat${seatsLeft !== 1 ? 's' : ''} remaining on your Team plan.`
            : 'All seats are occupied. Remove a member or upgrade to add more.'}
        </p>
      </section>

      {/* ═══ Role Permissions Legend ═══ */}
      <section className="glass-card border border-white/5 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">shield</span>
          Role Designation Legend
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ROLE_OPTIONS.map((r) => (
            <div key={r} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-start gap-2.5 hover:bg-white/[0.03] transition-colors">
              <Shield className="w-4 h-4 text-primary/70 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-on-surface">{r}</p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">{ROLE_DESCRIPTION[r]}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Active Directory ═══ */}
      <section className="glass-card border border-white/5 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">badge</span>
          Personnel Registry
        </h2>
        <p className="text-xs text-on-surface-variant font-mono">{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} remaining</p>

        {activeMembers.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No team members yet. Invite your first collaborator below.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 mt-4">
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
      <section className="glass-card border border-white/5 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-5 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">person_add</span>
          Invite Team Personnel
        </h2>

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@realtycorp.com"
                className="w-full text-sm bg-surface-container border border-white/10 rounded-xl px-3.5 py-2.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary placeholder-on-surface-variant/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Realty"
                className="w-full text-sm bg-surface-container border border-white/10 rounded-xl px-3.5 py-2.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary placeholder-on-surface-variant/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Assigned Clearance Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InternalRole)}
              className="w-full text-sm bg-surface-container border border-white/10 rounded-xl px-3.5 py-2.5 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r} className="bg-surface-container-high">{r} — {ROLE_DESCRIPTION[r]}</option>
              ))}
            </select>
          </div>

          {inviteError && (
            <div className="flex items-start gap-2.5 text-xs text-error bg-error/10 border border-error/20 px-3.5 py-2.5 rounded-xl">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{inviteError}</span>
            </div>
          )}

          {invited && (
            <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 border border-primary/20 px-3.5 py-2.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4" /> <span>Invitation sent successfully.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={inviting || seatsLeft <= 0}
            className="luminous-button rounded-xl text-xs px-5 py-2.5 font-bold transition-all duration-300 disabled:opacity-50 inline-flex items-center gap-2"
          >
            {inviting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> <span>Sending invite…</span></>
            ) : (
              <><UserPlus className="w-4 h-4" /> <span>Send Invite</span> <Mail className="w-3.5 h-3.5" /></>
            )}
          </button>

          {seatsLeft <= 0 && (
            <p className="text-xs text-on-surface-variant font-mono">
              Seat limit reached. Remove a member or{' '}
              <Link href="/dashboard/settings/billing" className="underline hover:text-primary">upgrade your plan</Link>.
            </p>
          )}
        </form>
      </section>

      {/* ═══ Audit Log ═══ */}
      <section className="glass-card border border-white/5 p-6 rounded-2xl shadow-lg">
        <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-5 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Audit Ledger
        </h2>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-on-surface-variant font-mono">No audit logs available.</p>
        ) : (
          <div className="relative pl-6 space-y-5 before:content-[''] before:absolute before:left-[3px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
            {auditLogs.map((log) => {
              const isSecurityAlert = log.action.toLowerCase().includes('suspend') || log.action.toLowerCase().includes('fail') || log.action.toLowerCase().includes('remove');
              return (
                <div key={log.id} className="relative flex flex-col md:flex-row md:items-start justify-between gap-2 group">
                  {/* Timeline Dot */}
                  <div className={`absolute left-[-26px] top-1.5 w-2 h-2 rounded-full border bg-surface-dim ${
                    isSecurityAlert ? 'border-error shadow-[0_0_8px_rgba(255,180,171,0.6)]' : 'border-primary shadow-[0_0_8px_rgba(87,241,219,0.6)]'
                  }`}></div>

                  <div>
                    <p className="text-xs text-on-surface leading-relaxed">
                      <span className="font-bold text-primary">{log.actorName}</span> performed <span className="font-semibold text-secondary">{log.action}</span>
                    </p>
                    <p className="text-[10px] text-on-surface-variant font-mono mt-1 flex flex-wrap gap-x-2 gap-y-1">
                      <span>Target: {log.targetEmail || log.targetUid || 'N/A'}</span>
                      {log.metadata && (
                        <span className="text-[9px] opacity-75">
                          • {JSON.stringify(log.metadata)}
                        </span>
                      )}
                    </p>
                  </div>
                  <time className="text-[10px] text-on-surface-variant/60 font-mono whitespace-nowrap md:mt-0.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </time>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
