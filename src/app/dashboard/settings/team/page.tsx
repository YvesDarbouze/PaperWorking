'use client';

import { useState } from 'react';
import { UserPlus, Trash2, Shield, Loader2, Mail, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useUserStore } from '@/store/userStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { OrgTeamMember, InternalRole } from '@/types/schema';

/* ═══════════════════════════════════════════════════════
   Team & Role Management Settings

   Refactored to render inside the settings layout shell.
   Dynamically adapts based on billing tier (Individual vs Team).
   ═══════════════════════════════════════════════════════ */

const ROLE_OPTIONS: InternalRole[] = ['Admin', 'Deal Lead'];

const ROLE_DESCRIPTION: Record<InternalRole, string> = {
  'Admin':     'Full access to all deals, financials, and team management.',
  'Deal Lead': 'Manage assigned deals only; no billing or team admin access.',
};

function MemberRow({
  member,
  onRemove,
  onRoleChange,
}: {
  member: OrgTeamMember;
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: InternalRole) => void;
}) {
  const initials = member.displayName
    ? member.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : member.email[0].toUpperCase();

  const statusCls =
    member.status === 'active'  ? 'bg-green-50  text-green-700  border-green-200' :
    member.status === 'invited' ? 'bg-amber-50  text-amber-700  border-amber-200' :
                                  'bg-bg-primary  text-text-secondary   border-border-accent';

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border-accent last:border-0">
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
        onChange={(e) => onRoleChange(member.id, e.target.value as InternalRole)}
        className="text-xs bg-bg-primary border border-border-accent px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-pw-black"
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {/* Status badge */}
      <span className={`hidden sm:inline-flex text-xs font-medium border px-2 py-0.5 ${statusCls}`}>
        {member.status}
      </span>

      {/* Remove */}
      <button
        onClick={() => onRemove(member.id)}
        className="p-1.5 text-text-secondary hover:text-red-600 transition-colors"
        aria-label="Remove member"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function TeamManagementPage() {
  const { profile } = useAuth();
  const { isLead } = usePermissions();
  const { teamMembers, maxSeats, addTeamMember, removeTeamMember, updateMemberRole } = useUserStore();

  const [email,       setEmail]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role,        setRole]        = useState<InternalRole>('Deal Lead');
  const [inviting,    setInviting]    = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invited,     setInvited]     = useState(false);

  const plan          = profile?.subscriptionPlan ?? 'None';
  const isTeamPlan    = plan === 'Team';
  const activeMembers = teamMembers.filter((m) => m.status !== 'removed');
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
                onRemove={removeTeamMember}
                onRoleChange={updateMemberRole}
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
    </div>
  );
}
