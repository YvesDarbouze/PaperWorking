'use client';

import { useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminStateBlock,
  StatusPill,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';

interface UsersPayload {
  total: number;
  active: number;
  pastDue: number;
  churned: number;
  users: Array<{
    id: string;
    displayName: string;
    email: string;
    role: string;
    subscriptionPlan: string;
    subscriptionStatus: string;
    projectCount: number;
    lastLoginAt: string;
    joinedAt: string;
  }>;
}

export default function AdminUsersPanel() {
  const { data, loading, error, reload } = useAdminOpsSection<UsersPayload>('users');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.users ?? []).filter((user) => {
      if (!q) return true;
      return (
        user.displayName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.role.toLowerCase().includes(q)
      );
    });
  }, [data, query]);

  const selected = rows.find((u) => u.id === selectedId) ?? null;

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Users" subtitle="User directory & 360 preview (seed).">
        <AdminStateBlock loading={loading} error={error} onRetry={reload} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Users"
      subtitle="Searchable directory with User 360 drawer — seed port of v0 /admin/users."
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              const csv = [
                'name,email,role,plan,status,projects',
                ...rows.map(
                  (u) =>
                    `${u.displayName},${u.email},${u.role},${u.subscriptionPlan},${u.subscriptionStatus},${u.projectCount}`,
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'paperworking_users.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={reload}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
          >
            Refresh
          </button>
        </>
      }
    >
      <section className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: data.total },
          { label: 'Active', value: data.active },
          { label: 'Past due', value: data.pastDue },
          { label: 'Churned', value: data.churned },
        ].map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </article>
        ))}
      </section>

      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, role…"
          className="mb-4 w-full rounded-xl border border-black/10 bg-[#f6f4ef] px-3 py-2.5 text-sm outline-none"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-black/45">
              <tr>
                <th className="px-2 py-2">User</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Plan</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Projects</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id} className="border-t border-black/5">
                  <td className="px-2 py-3">
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-xs text-black/50">{user.email}</p>
                  </td>
                  <td className="px-2 py-3">{user.role}</td>
                  <td className="px-2 py-3">{user.subscriptionPlan}</td>
                  <td className="px-2 py-3">
                    <StatusPill status={user.subscriptionStatus} />
                  </td>
                  <td className="px-2 py-3">{user.projectCount}</td>
                  <td className="px-2 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedId(user.id)}
                      className="text-xs font-semibold underline"
                    >
                      Open 360
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelectedId(null)}>
          <aside
            className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">{selected.displayName}</h3>
                <p className="text-sm text-black/55">{selected.email}</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} className="text-sm">
                Close
              </button>
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-black/45">Role</dt>
                <dd className="font-semibold">{selected.role}</dd>
              </div>
              <div>
                <dt className="text-black/45">Plan</dt>
                <dd className="font-semibold">{selected.subscriptionPlan}</dd>
              </div>
              <div>
                <dt className="text-black/45">Status</dt>
                <dd>
                  <StatusPill status={selected.subscriptionStatus} />
                </dd>
              </div>
              <div>
                <dt className="text-black/45">Projects</dt>
                <dd className="font-semibold">{selected.projectCount}</dd>
              </div>
              <div>
                <dt className="text-black/45">Last login</dt>
                <dd className="font-semibold">{new Date(selected.lastLoginAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-black/45">Joined</dt>
                <dd className="font-semibold">{new Date(selected.joinedAt).toLocaleDateString()}</dd>
              </div>
            </dl>
            <p className="mt-6 text-xs text-black/45">
              Sensitive actions (disable, impersonate, verification OTP) remain stubbed in migration
              preview.
            </p>
          </aside>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
