'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { getAdminAuditLogs } from '@/actions/admin';
import type { AdminAuditEntry } from '@/actions/admin';

/* ═══════════════════════════════════════════════════════
   Admin Audit — Security & Activity Logs
   Live data from Firestore audit_logs collection.
   ═══════════════════════════════════════════════════════ */

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

type Severity = 'info' | 'warning' | 'critical';
const SEVERITY_VARIANT: Record<Severity, 'info' | 'warning' | 'danger'> = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
};

const ACTION_LABELS: Record<string, string> = {
  'user.login': 'User Login',
  'user.login_failed': 'Failed Login',
  'user.created': 'User Created',
  'user.password_reset': 'Password Reset',
  'subscription.updated': 'Subscription Updated',
  'project.deleted': 'Project Deleted',
  'admin.role_changed': 'Role Changed',
  'billing.payment_failed': 'Payment Failed',
  'document.uploaded': 'Document Uploaded',
  'api.rate_limited': 'Rate Limited',
};

const columns: Column<AdminAuditEntry>[] = [
  {
    key: 'timestamp',
    label: 'Timestamp',
    sortable: true,
    render: (row) => (
      <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
        {formatTimestamp(row.timestamp)}
      </span>
    ),
  },
  {
    key: 'severity',
    label: 'Severity',
    sortable: true,
    render: (row) => (
      <StatusBadge
        label={row.severity}
        variant={SEVERITY_VARIANT[row.severity as Severity]}
      />
    ),
  },
  {
    key: 'action',
    label: 'Event',
    sortable: true,
    render: (row) => (
      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {ACTION_LABELS[row.action] || row.action}
      </span>
    ),
  },
  {
    key: 'actor',
    label: 'Actor',
    sortable: true,
    render: (row) => (
      <div>
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{row.actor}</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.actorEmail}</p>
      </div>
    ),
  },
  {
    key: 'target',
    label: 'Target',
    render: (row) => (
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{row.target}</span>
    ),
  },
  {
    key: 'details',
    label: 'Details',
    render: (row) => (
      <span className="text-xs" style={{ color: 'var(--text-secondary)', maxWidth: 260, display: 'block' }}>
        {row.details}
      </span>
    ),
  },
  {
    key: 'ipAddress',
    label: 'IP',
    render: (row) => (
      <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
        {row.ipAddress}
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

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AdminAuditEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const data = await getAdminAuditLogs();
      setLogs(data);
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

  const list = logs || [];
  const criticalCount = list.filter((l) => l.severity === 'critical').length;
  const warningCount = list.filter((l) => l.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Audit Logs
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Security monitoring and action history
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

      {/* Severity summary */}
      {!logs ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-shimmer rounded"
              style={{ border: '1px solid var(--border-ui)', animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Critical Events', value: criticalCount, color: '#ef4444' },
            { label: 'Warnings', value: warningCount, color: '#f59e0b' },
            { label: 'Total Events', value: list.length, color: '#3b82f6' },
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

      {/* Audit log table */}
      {error ? (
        <div className="p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to load audit logs.</p>
          <button onClick={handleRefresh} className="mt-2 text-xs font-semibold underline" style={{ color: 'var(--text-primary)' }}>Retry</button>
        </div>
      ) : !logs ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={list}
          searchKeys={['action', 'actor', 'actorEmail', 'target', 'details', 'ipAddress']}
          searchPlaceholder="Search logs by event, actor, target, or IP…"
        />
      )}
    </div>
  );
}
