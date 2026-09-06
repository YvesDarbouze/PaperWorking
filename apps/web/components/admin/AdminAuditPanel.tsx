'use client';

import {
  AdminPageShell,
  AdminStateBlock,
  StatusPill,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';

interface AuditPayload {
  chainIntact: boolean;
  critical: number;
  warnings: number;
  total: number;
  logs: Array<{
    id: string;
    seq: number;
    severity: string;
    action: string;
    actor: string;
    target: string;
    details: string;
    ip: string;
    at: string;
    hash: string;
  }>;
}

export default function AdminAuditPanel() {
  const { data, loading, error, reload } = useAdminOpsSection<AuditPayload>('audit');

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Audit logs" subtitle="Hash-chain style audit trail (seed).">
        <AdminStateBlock loading={loading} error={error} onRetry={reload} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Audit logs"
      subtitle="Platform audit feed from Firestore auditLogs."
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              const csv = [
                'seq,severity,action,actor,target,at,hash',
                ...(data.logs ?? []).map(
                  (l) =>
                    `${l.seq},${l.severity},${l.action},${l.actor},${l.target},${l.at},${l.hash}`,
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'paperworking_audit.csv';
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
        <article className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">Chain</p>
          <p className="mt-1 text-lg font-semibold">
            {data.chainIntact ? 'Intact' : 'Tamper detected'}
          </p>
        </article>
        {[
          { label: 'Critical', value: data.critical },
          { label: 'Warnings', value: data.warnings },
          { label: 'Total', value: data.total },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold">{card.value}</p>
          </article>
        ))}
      </section>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-black/45">
            <tr>
              <th className="px-4 py-3">Seq</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {(data.logs ?? []).length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-black/50">
                  No audit events yet.
                </td>
              </tr>
            ) : null}
            {(data.logs ?? []).map((log) => (
              <tr key={log.id} className="border-t border-black/5">
                <td className="px-4 py-3 font-mono text-xs">#{log.seq}</td>
                <td className="px-4 py-3">
                  <StatusPill status={log.severity} />
                </td>
                <td className="px-4 py-3 font-semibold">{log.action}</td>
                <td className="px-4 py-3">{log.actor}</td>
                <td className="px-4 py-3">{log.target}</td>
                <td className="px-4 py-3 text-xs text-black/60">{log.details}</td>
                <td className="px-4 py-3 font-mono text-xs">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}
