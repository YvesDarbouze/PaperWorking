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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleUserAction = async (
    userId: string,
    action: 'suspend' | 'reactivate' | 'send_verification' | 'reset_password',
  ) => {
    setActionLoading(action);
    setActionNotice(null);
    try {
      const res = await fetch('/api/admin/users/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || `Failed to execute ${action}`);
      }
      setActionNotice({ type: 'success', message: result.message });
      await reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setActionNotice({ type: 'error', message: msg });
    } finally {
      setActionLoading(null);
    }
  };

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
      subtitle="Searchable directory with User 360 drawer: seed port of v0 /admin/users."
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

            {actionNotice ? (
              <div
                role={actionNotice.type === 'error' ? 'alert' : 'status'}
                className={`mt-4 rounded-xl border p-3 text-xs font-medium ${
                  actionNotice.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
              >
                {actionNotice.message}
              </div>
            ) : null}

            <div className="mt-6 border-t border-black/10 pt-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-black/45">Account Actions</h4>
              <div className="mt-3 flex flex-col gap-2">
                {selected.subscriptionStatus === 'suspended' ? (
                  <button
                    type="button"
                    data-testid="reactivate-user-btn"
                    disabled={Boolean(actionLoading)}
                    onClick={() => handleUserAction(selected.id, 'reactivate')}
                    className="min-h-[44px] w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {actionLoading === 'reactivate' ? 'Reactivating...' : 'Reactivate User Account'}
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="suspend-user-btn"
                    disabled={Boolean(actionLoading)}
                    onClick={() => handleUserAction(selected.id, 'suspend')}
                    className="min-h-[44px] w-full rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    {actionLoading === 'suspend' ? 'Suspending...' : 'Suspend User Account'}
                  </button>
                )}

                <button
                  type="button"
                  data-testid="send-verification-btn"
                  disabled={Boolean(actionLoading)}
                  onClick={() => handleUserAction(selected.id, 'send_verification')}
                  className="min-h-[44px] w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-50 disabled:opacity-50"
                >
                  {actionLoading === 'send_verification' ? 'Sending Verification...' : 'Send Email Verification'}
                </button>

                <button
                  type="button"
                  data-testid="reset-password-btn"
                  disabled={Boolean(actionLoading)}
                  onClick={() => handleUserAction(selected.id, 'reset_password')}
                  className="min-h-[44px] w-full rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-50 disabled:opacity-50"
                >
                  {actionLoading === 'reset_password' ? 'Dispatching Reset...' : 'Send Password Reset Link'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
