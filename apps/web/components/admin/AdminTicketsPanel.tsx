'use client';

import { useMemo, useState } from 'react';
import {
  AdminPageShell,
  AdminStateBlock,
  StatusPill,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';

interface Ticket {
  id: string;
  subject: string;
  requester: string;
  queue: string;
  priority: string;
  status: string;
  tags: string[];
  updatedAt: string;
}

export default function AdminTicketsPanel() {
  const { data, loading, error, reload } = useAdminOpsSection<{ tickets: Ticket[] }>('tickets');
  const [queue, setQueue] = useState<'unassigned' | 'mine' | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tickets = useMemo(() => {
    const list = data?.tickets ?? [];
    if (queue === 'all') return list;
    return list.filter((t) => t.queue === queue);
  }, [data, queue]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Tickets" subtitle="Support inbox (seed).">
        <AdminStateBlock loading={loading} error={error} onRetry={reload} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Tickets"
      subtitle="Support queues — seed port of v0 /admin/tickets."
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
      <div className="flex flex-wrap gap-2">
        {(['unassigned', 'mine', 'all'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setQueue(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              queue === id ? 'bg-black text-white' : 'border border-black/10 bg-white'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-black/45">
            <tr>
              <th className="px-4 py-3">Ticket</th>
              <th className="px-4 py-3">Requester</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tags</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="border-t border-black/5">
                <td className="px-4 py-3">
                  <p className="font-semibold">{ticket.id}</p>
                  <p className="text-xs text-black/55">{ticket.subject}</p>
                </td>
                <td className="px-4 py-3">{ticket.requester}</td>
                <td className="px-4 py-3">
                  <StatusPill status={ticket.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={ticket.status} />
                </td>
                <td className="px-4 py-3 text-xs text-black/55">{ticket.tags.join(', ')}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedId(ticket.id)}
                    className="text-xs font-semibold underline"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelectedId(null)}>
          <aside
            className="h-full w-full max-w-md space-y-4 overflow-y-auto bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-black/45">{selected.id}</p>
                <h3 className="text-lg font-semibold">{selected.subject}</h3>
              </div>
              <button type="button" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>
            <p className="text-sm text-black/60">Requester: {selected.requester}</p>
            <div className="flex gap-2">
              <StatusPill status={selected.priority} />
              <StatusPill status={selected.status} />
            </div>
            <textarea
              className="min-h-28 w-full rounded-xl border border-black/10 p-3 text-sm"
              placeholder="Add note / reply (stub)…"
              defaultValue=""
            />
            <button type="button" className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white">
              Claim & reply (stub)
            </button>
          </aside>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
