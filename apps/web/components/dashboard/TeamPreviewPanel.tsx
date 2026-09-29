'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { TEAM_MEMBERS, TEAM_SEATS } from '@/lib/dashboard/shell-seed';
import { UserPlus } from '@/components/icons/PhosphorIcons';

export default function TeamPreviewPanel() {
  const [query, setQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  const members = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TEAM_MEMBERS;
    return TEAM_MEMBERS.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6 lg:px-8 lg:py-7">
      <DashboardPageHeader
        title="Team"
        subtitle={`${TEAM_SEATS.used}/${TEAM_SEATS.limit} seats · ${TEAM_SEATS.tierLabel}`}
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
          {TEAM_SEATS.used} of {TEAM_SEATS.limit} seats used
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
                Seed preview: live team invitations wire with org handlers post-cutover.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              placeholder="colleague@firm.com"
              className="flex-1 min-h-[44px] rounded-none border border-border bg-background px-4 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none sm:text-xs"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowInvite(false)}
            >
              Send invite
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
                <td className="px-5 py-4 text-foreground/80">{member.role}</td>
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

