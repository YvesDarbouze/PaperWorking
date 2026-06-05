'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MoreHorizontal, RefreshCw } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge, { getStatusVariant, getPriorityVariant } from '@/components/admin/StatusBadge';
import { getAdminTickets } from '@/actions/admin';
import type { AdminTicketEntry } from '@/actions/admin';

/* ═══════════════════════════════════════════════════════
   Admin Tickets — Support Ticket Center
   Live data from Firestore support_tickets collection.
   ═══════════════════════════════════════════════════════ */

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const columns: Column<AdminTicketEntry>[] = [
  {
    key: 'id',
    label: 'ID',
    sortable: true,
    render: (row) => (
      <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
        {row.id}
      </span>
    ),
  },
  {
    key: 'subject',
    label: 'Subject',
    sortable: true,
    render: (row) => (
      <div style={{ maxWidth: 280 }}>
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {row.subject}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {row.requesterName}
        </p>
      </div>
    ),
  },
  {
    key: 'priority',
    label: 'Priority',
    sortable: true,
    render: (row) => (
      <StatusBadge label={row.priority} variant={getPriorityVariant(row.priority)} />
    ),
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (row) => (
      <StatusBadge label={row.status.replace('_', ' ')} variant={getStatusVariant(row.status)} />
    ),
  },
  {
    key: 'category',
    label: 'Category',
    sortable: true,
    render: (row) => (
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.category}</span>
    ),
  },
  {
    key: 'assignee',
    label: 'Assignee',
    sortable: true,
    render: (row) => (
      <span
        className="text-xs font-semibold"
        style={{ color: row.assignee === 'Unassigned' ? '#F06543' : 'var(--text-primary)' }}
      >
        {row.assignee}
      </span>
    ),
  },
  {
    key: 'createdAt',
    label: 'Created',
    sortable: true,
    render: (row) => (
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {formatTimestamp(row.createdAt)}
      </span>
    ),
  },
];

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-12 animate-shimmer rounded"
          style={{ border: '1px solid var(--border-ui)', animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<AdminTicketEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const data = await getAdminTickets();
      setTickets(data);
    } catch {
      setError(true);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const list = tickets || [];
  const openCount = list.filter((t) => t.status === 'open').length;
  const inProgressCount = list.filter((t) => t.status === 'in_progress').length;
  const urgentCount = list.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
  const resolvedCount = list.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Support Tickets
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {tickets ? `${list.length} total tickets • ${openCount + inProgressCount} require attention` : 'Loading...'}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors"
          style={{
            border: '1px solid var(--border-ui)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            opacity: refreshing ? 0.5 : 1,
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      {!tickets ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-shimmer rounded"
              style={{ border: '1px solid var(--border-ui)', animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Open', value: openCount, color: '#f59e0b' },
            { label: 'In Progress', value: inProgressCount, color: '#3b82f6' },
            { label: 'High / Urgent', value: urgentCount, color: '#F06543' },
            { label: 'Resolved', value: resolvedCount, color: '#3f7d20' },
          ].map((s) => (
            <div
              key={s.label}
              className="px-4 py-3"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-ui)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${s.color}`,
              }}
            >
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                {s.label}
              </p>
              <p className="text-2xl font-extralight mt-1" style={{ color: 'var(--text-primary)' }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Tickets table */}
      {error ? (
        <div className="p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to load tickets.</p>
          <button onClick={handleRefresh} className="mt-2 text-xs font-semibold underline" style={{ color: 'var(--text-primary)' }}>Retry</button>
        </div>
      ) : !tickets ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={list}
          searchKeys={['id', 'subject', 'requesterName', 'requesterEmail', 'category', 'assignee']}
          searchPlaceholder="Search tickets by ID, subject, requester, or category…"
          actions={(row) => (
            <button
              className="p-1.5 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              aria-label={`Actions for ${row.id}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        />
      )}
    </div>
  );
}
