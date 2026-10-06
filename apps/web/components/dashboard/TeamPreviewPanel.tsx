'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { TEAM_MEMBERS, TEAM_SEATS, type TeamMember } from '@/lib/dashboard/shell-seed';
import { UserPlus } from '@/components/icons/PhosphorIcons';
import { bffFetch } from '@/lib/api/bff-fetch';

export default function TeamPreviewPanel() {
  const [teamList, setTeamList] = useState<TeamMember[]>(TEAM_MEMBERS);
  const [seats, setSeats] = useState(TEAM_SEATS);
  const [query, setQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchTeam = async () => {
    try {
      const res = await bffFetch('/api/team', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.members)) {
          setTeamList(data.members);
        }
        if (data.seats) {
          setSeats({
            used: data.seats.used,
            limit: data.seats.limit,
            tier: data.seats.tier,
            tierLabel: data.seats.tierLabel,
          });
        }
      }
    } catch {
      // Fallback to initial seed state
    }
  };

  useEffect(() => {
    void fetchTeam();
  }, []);

  const members = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teamList;
    return teamList.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q),
    );
  }, [teamList, query]);

  const handleSendInvite = async () => {
    const trimmed = inviteEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setStatusMsg('Please enter a valid email address.');
      return;
    }
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await bffFetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: [trimmed],
          role: 'Associate',
          accessLevel: 'Scoped Edit',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteEmail('');
        setShowInvite(false);
        await fetchTeam();
      } else {
        setStatusMsg(data.error || 'Failed to send invite.');
      }
    } catch {
      setStatusMsg('Network error sending invite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <DashboardPageHeader
        title="Team"
        subtitle={`${seats.used}/${seats.limit} seats · ${seats.tierLabel}`}
        actions={
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-none border border-border bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 touch-target"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            Invite
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members by name, email, or role"
          className="w-full min-h-[44px] rounded-none border border-border bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none sm:max-w-md sm:text-xs"
        />
        <span className="inline-flex items-center rounded-none border border-border bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {seats.used} of {seats.limit} seats used
        </span>
      </div>

      {showInvite ? (
        <div className="rounded-none border border-border bg-card p-5 text-card-foreground shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-foreground">
                Invite teammate
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Send an invitation to collaborate within your workspace under the {seats.tierLabel} plan.
              </p>
              {statusMsg ? (
                <p className="mt-1 text-xs text-red-400">{statusMsg}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowInvite(false);
                setStatusMsg(null);
              }}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@firm.com"
              className="flex-1 min-h-[44px] rounded-none border border-border bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none sm:text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSendInvite}
            >
              {isSubmitting ? 'Sending...' : 'Send invite'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-none border border-border bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Workspace Access</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Projects</th>
              <th className="px-5 py-3 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-t border-border/50">
                <td className="px-5 py-4">
                  <p className="font-medium text-foreground">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </td>
                <td className="px-5 py-4 text-foreground/80 font-medium">{member.role}</td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center rounded-none border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-foreground/90">
                    {member.accessLevel ?? 'Scoped Edit'}
                  </span>
                </td>
                <td className="px-5 py-4 text-foreground/80">{member.type}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-none px-2 py-0.5 text-[10px] font-bold uppercase ${
                      member.status === 'Active'
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {member.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-foreground/80">{member.projects}</td>
                <td className="px-5 py-4 text-muted-foreground">{member.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/dashboard" className="inline-flex min-h-[44px] items-center text-sm text-muted-foreground no-underline hover:text-foreground hover:underline">
        Back to portfolio
      </Link>
    </div>
  );
}

