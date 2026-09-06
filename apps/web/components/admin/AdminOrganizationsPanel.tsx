'use client';

import { useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminStateBlock,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';

interface OrganizationsPayload {
  total: number;
  organizations: Array<{
    id: string;
    name: string;
    ownerId: string;
    memberCount: number;
    createdAt: string;
  }>;
}

export default function AdminOrganizationsPanel() {
  const { data, loading, error, reload } = useAdminOpsSection<OrganizationsPayload>('organizations');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.organizations ?? []).filter((org) => {
      if (!q) return true;
      return (
        org.name.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q) ||
        org.ownerId.toLowerCase().includes(q)
      );
    });
  }, [data, query]);

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Organizations" subtitle="Team and org directory from Firestore.">
        <AdminStateBlock loading={loading} error={error} onRetry={reload} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Organizations"
      subtitle="Cross-tenant org registry — mirrors user dashboard Team workspace."
      actions={
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
        >
          Refresh
        </button>
      }
    >
      <article className="mb-4 rounded-2xl border border-black/10 bg-white p-4">
        <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">Total organizations</p>
        <p className="mt-1 text-2xl font-semibold">{data.total}</p>
      </article>

      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, id, owner…"
          className="mb-4 w-full rounded-xl border border-black/10 bg-[#f6f4ef] px-3 py-2.5 text-sm outline-none"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-black/45">
              <tr>
                <th className="px-2 py-2">Organization</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Members</th>
                <th className="px-2 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-sm text-black/50">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                rows.map((org) => (
                  <tr key={org.id} className="border-t border-black/5">
                    <td className="px-2 py-3">
                      <p className="font-semibold">{org.name}</p>
                      <p className="text-xs text-black/50">{org.id}</p>
                    </td>
                    <td className="px-2 py-3 font-mono text-xs">{org.ownerId}</td>
                    <td className="px-2 py-3">{org.memberCount}</td>
                    <td className="px-2 py-3 text-xs text-black/60">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPageShell>
  );
}
