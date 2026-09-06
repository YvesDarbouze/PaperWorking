'use client';

import { useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminStateBlock,
  StatusPill,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';

interface ProjectsPayload {
  total: number;
  projects: Array<{
    id: string;
    name: string;
    ownerId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export default function AdminProjectsPanel() {
  const { data, loading, error, reload } = useAdminOpsSection<ProjectsPayload>('projects');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.projects ?? []).filter((project) => {
      if (!q) return true;
      return (
        project.name.toLowerCase().includes(q) ||
        project.id.toLowerCase().includes(q) ||
        project.ownerId.toLowerCase().includes(q) ||
        project.status.toLowerCase().includes(q)
      );
    });
  }, [data, query]);

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Projects" subtitle="Platform project directory from Firestore.">
        <AdminStateBlock loading={loading} error={error} onRetry={reload} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Projects"
      subtitle="Cross-tenant project registry — mirrors user dashboard Projects workspace."
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
        <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">Total projects</p>
        <p className="mt-1 text-2xl font-semibold">{data.total}</p>
      </article>

      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, id, owner, status…"
          className="mb-4 w-full rounded-xl border border-black/10 bg-[#f6f4ef] px-3 py-2.5 text-sm outline-none"
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-black/45">
              <tr>
                <th className="px-2 py-2">Project</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-sm text-black/50">
                    No projects found.
                  </td>
                </tr>
              ) : (
                rows.map((project) => (
                  <tr key={project.id} className="border-t border-black/5">
                    <td className="px-2 py-3">
                      <p className="font-semibold">{project.name}</p>
                      <p className="text-xs text-black/50">{project.id}</p>
                    </td>
                    <td className="px-2 py-3 font-mono text-xs">{project.ownerId}</td>
                    <td className="px-2 py-3">
                      <StatusPill status={project.status} />
                    </td>
                    <td className="px-2 py-3 text-xs text-black/60">
                      {new Date(project.updatedAt).toLocaleDateString()}
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
