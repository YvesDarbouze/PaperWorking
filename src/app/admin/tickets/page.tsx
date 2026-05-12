'use client';

import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge, { getStatusVariant, getPriorityVariant } from '@/components/admin/StatusBadge';
import { supportTickets, SupportTicket } from '@/lib/admin/mockData';

/* ═══════════════════════════════════════════════════════
   Admin Tickets — Support Ticket Center
   ═══════════════════════════════════════════════════════ */

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const columns: Column<SupportTicket>[] = [
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
        style={{ color: row.assignee === 'Unassigned' ? '#ef4444' : 'var(--text-primary)' }}
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

export default function AdminTicketsPage() {
  const openCount = supportTickets.filter((t) => t.status === 'open').length;
  const inProgressCount = supportTickets.filter((t) => t.status === 'in_progress').length;
  const urgentCount = supportTickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length;
  const resolvedCount = supportTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Support Tickets
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {supportTickets.length} total tickets • {openCount + inProgressCount} require attention
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Open', value: openCount, color: '#f59e0b' },
          { label: 'In Progress', value: inProgressCount, color: '#3b82f6' },
          { label: 'High / Urgent', value: urgentCount, color: '#ef4444' },
          { label: 'Resolved', value: resolvedCount, color: '#22c55e' },
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

      {/* Tickets table */}
      <DataTable
        columns={columns}
        data={supportTickets}
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
    </div>
  );
}
