'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Download, ShieldCheck, ShieldAlert } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { getAdminAuditLogs, exportAdminAuditLogs } from '@/actions/admin';
import type { AdminAuditEntry } from '@/actions/admin';

/* ═══════════════════════════════════════════════════════
   Admin Audit — Security & Action Audit Log
   Single Source of Truth: PostgreSQL AdminAuditLog table.
   Verifies SHA-256 Hash Chain integrity & exports CSV.
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
  'admin:view_overview': 'View Overview',
  'admin:view_users': 'View Users List',
  'admin:view_subscriptions': 'View Subscriptions',
  'admin:view_audit_logs': 'View Audit Logs',
  'admin:export_audit_logs': 'Export Audit Logs',
  'admin:change_role': 'Role Modified',
  'authz.role_mismatch': 'Auth Role Mismatch',
};

type ExtendedAuditEntry = AdminAuditEntry & { hashChainIntact?: boolean };

const columns: Column<ExtendedAuditEntry>[] = [
  {
    key: 'timestamp',
    label: 'Timestamp',
    sortable: true,
    render: (row) => (
      <div>
        <span className="text-xs font-mono block" style={{ color: 'var(--text-secondary)' }}>
          {formatTimestamp(row.timestamp)}
        </span>
        {row.sequenceNumber && (
          <span className="text-[10px] text-gray-400 font-mono">
            Seq #{row.sequenceNumber}
          </span>
        )}
      </div>
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
    label: 'Event / Action',
    sortable: true,
    render: (row) => (
      <div>
        <span className="text-sm font-semibold block" style={{ color: 'var(--text-primary)' }}>
          {ACTION_LABELS[row.action] || row.action}
        </span>
        {row.status && (
          <span className={`text-[10px] uppercase font-bold tracking-wider ${row.status === 'DENIED' ? 'text-red-500' : 'text-emerald-600'}`}>
            {row.status}
          </span>
        )}
      </div>
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
        {row.actorRole && (
          <span className="text-[10px] uppercase font-medium text-gray-500">{row.actorRole}</span>
        )}
      </div>
    ),
  },
  {
    key: 'target',
    label: 'Target',
    render: (row) => (
      <span className="text-sm font-mono" style={{ color: 'var(--text-primary)' }}>{row.target}</span>
    ),
  },
  {
    key: 'details',
    label: 'Details & Hashes',
    render: (row) => (
      <div className="space-y-0.5">
        <span className="text-xs block" style={{ color: 'var(--text-secondary)', maxWidth: 280 }}>
          {row.details}
        </span>
        {row.entryHash && (
          <span className="text-[10px] font-mono text-gray-400 block truncate max-w-[200px]" title={`SHA-256: ${row.entryHash}`}>
            Hash: {row.entryHash.slice(0, 12)}…
          </span>
        )}
      </div>
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
  const [logs, setLogs] = useState<ExtendedAuditEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const { csvData, error } = await exportAdminAuditLogs();
      if (error || !csvData) {
        alert(`Export failed: ${error || 'No data'}`);
        return;
      }

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `paperworking_admin_audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('[CSV Export] Failed:', err);
    } finally {
      setExporting(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const list = logs || [];
  const criticalCount = list.filter((l) => l.severity === 'critical').length;
  const warningCount = list.filter((l) => l.severity === 'warning').length;
  const isChainIntact = list.length === 0 || list.every((l) => l.hashChainIntact !== false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Audit Logs
            </h1>
            {logs && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isChainIntact ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {isChainIntact ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    SHA-256 Chain Intact
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                    Chain Tamper Warning
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            PostgreSQL append-only immutable security & activity audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting || !logs || logs.length === 0}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
            style={{
              border: '1px solid var(--border-ui)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>

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
            { label: 'Critical Events', value: criticalCount, color: '#F06543' },
            { label: 'Warnings', value: warningCount, color: '#f59e0b' },
            { label: 'Total Audit Entries', value: list.length, color: '#3b82f6' },
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

      {/* Audit log table / Honest empty state */}
      {error ? (
        <div className="p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to load audit logs.</p>
          <button onClick={handleRefresh} className="mt-2 text-xs font-semibold underline" style={{ color: 'var(--text-primary)' }}>Retry</button>
        </div>
      ) : !logs ? (
        <TableSkeleton />
      ) : list.length === 0 ? (
        <div className="p-12 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-lg)' }}>
          <ShieldCheck className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No audit logs recorded yet</h3>
          <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            System activity, security authorization events, and role modifications will be recorded in real time to the immutable PostgreSQL ledger.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={list}
          searchKeys={['action', 'actor', 'actorEmail', 'target', 'details', 'ipAddress', 'severity', 'status']}
          searchPlaceholder="Search audit log by event, actor, target, IP, or severity…"
        />
      )}
    </div>
  );
}
