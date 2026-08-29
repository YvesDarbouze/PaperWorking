'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { loadTeamDirectory } from '@/lib/data';
import type { TeamMember } from '@/lib/team/roles';

type TeamSeats = { used: number; limit: number; tierLabel: string };

export default function TeamPreviewPanel() {
  const [query, setQuery] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [seats, setSeats] = useState<TeamSeats>({ used: 0, limit: 0, tierLabel: 'Team' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await loadTeamDirectory();
        if (cancelled) return;
        setAllMembers(data.members as TeamMember[]);
        setSeats({
          used: data.seats.used,
          limit: 'limit' in data.seats ? Number(data.seats.limit) : Number((data.seats as { total?: number }).total ?? 0),
          tierLabel:
            'tierLabel' in data.seats
              ? String(data.seats.tierLabel)
              : 'Team',
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load team');
          setAllMembers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const members = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allMembers;
    return allMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q),
    );
  }, [query, allMembers]);

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-5 sm:px-5 sm:py-6 lg:px-6 lg:py-7 xl:px-8">
      <DashboardPageHeader
        title="Team"
        subtitle={`${seats.used}/${seats.limit} seats · ${seats.tierLabel}`}
        actions={
          <button
            type="button"
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/12 bg-[#454955]/90 px-3.5 py-2 text-[12px] font-semibold text-[#fdfffc]"
          >
            <span className="material-symbols-outlined text-[15px]">person_add</span>
            Invite
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members by name, email, or role"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white sm:max-w-md"
        />
        <span className="rounded-full border border-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/55">
          {seats.used} of {seats.limit} seats used
        </span>
      </div>

      {showInvite ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-400">
                Invite teammate
              </p>
              <p className="mt-2 text-sm text-white/70">
                Team invitations wire through org handlers when available.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="text-xs font-semibold text-white/55"
            >
              Close
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              placeholder="colleague@firm.com"
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => setShowInvite(false)}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-[12px] font-bold text-slate-950"
            >
              Send invite
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/45">Loading team…</p>
      ) : error ? (
        <p className="rounded-2xl border border-red-400/20 bg-red-950/20 p-6 text-sm text-red-100">
          {error}
        </p>
      ) : members.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-[#121014]/90 p-8 text-sm text-white/45">
          No team members yet
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#121014]/90 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-white/45">
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
                <tr key={member.id} className="border-t border-white/8">
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#fdfffc]">{member.name}</p>
                    <p className="text-xs text-white/45">{member.email}</p>
                  </td>
                  <td className="px-5 py-4 text-white/65">{member.role}</td>
                  <td className="px-5 py-4 text-white/65">{member.type}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        member.status === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {member.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-white/65">{member.projects}</td>
                  <td className="px-5 py-4 text-white/45">{member.lastActive}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link href="/dashboard" className="text-sm text-[#7A9EAA] no-underline hover:underline">
        Back to portfolio
      </Link>
    </div>
  );
}
