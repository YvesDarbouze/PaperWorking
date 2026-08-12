'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UserPlus, RefreshCw, UserCheck, Download } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge, { getStatusVariant } from '@/components/admin/StatusBadge';
import User360Drawer from '@/components/admin/User360Drawer';
import { getAdminUserStats } from '@/actions/admin';
import { exportSelectedUsersCSV } from '@/actions/adminUserManagement';
import type { AdminUserStats } from '@/actions/admin';

/* ═══════════════════════════════════════════════════════
   Admin Users — User Management & User 360 Workspace
   Live data from Firestore users + Prisma AppUser & Plaid.
   ═══════════════════════════════════════════════════════ */

type UserRow = AdminUserStats['recentUsers'][number];

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

export default function AdminUsersPage() {
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const data = await getAdminUserStats();
      setStats(data);
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

  const users = stats?.recentUsers || [];

  const handleExportCSV = async () => {
    if (!users.length) return;
    setExporting(true);
    try {
      const uids = users.map((u) => u.id);
      const { csvData, error } = await exportSelectedUsersCSV(uids);
      if (error || !csvData) {
        alert(`Export failed: ${error || 'No data'}`);
        return;
      }
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `paperworking_users_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<UserRow>[] = [
    {
      key: 'displayName',
      label: 'User',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: '#0d0d0d', color: '#f2f2f2' }}
          >
            {row.displayName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.displayName}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
          {row.role}
        </span>
      ),
    },
    {
      key: 'subscriptionPlan',
      label: 'Plan',
      sortable: true,
    },
    {
      key: 'subscriptionStatus',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <StatusBadge
          label={row.subscriptionStatus.replace('_', ' ')}
          variant={getStatusVariant(row.subscriptionStatus)}
        />
      ),
    },
    {
      key: 'projectCount',
      label: 'Projects',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {row.projectCount}
        </span>
      ),
    },
    {
      key: 'lastLoginAt',
      label: 'Last Login',
      sortable: true,
      render: (row) => (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {row.lastLoginAt}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Joined',
      sortable: true,
      render: (row) => (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {row.createdAt}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            User Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {stats ? `${stats.totalUsers} registered accounts` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting || !users.length}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors border rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
            style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors border rounded"
            style={{
              borderColor: 'var(--border-ui)',
              color: 'var(--text-primary)',
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="ag-button flex items-center gap-2 text-sm">
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Stats row */}
      {!stats ? (
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
            { label: 'Total Users', value: stats.totalUsers },
            { label: 'Active', value: stats.activeSubscriptions },
            { label: 'Past Due', value: stats.pastDueUsers },
            { label: 'Churned (30d)', value: stats.churnedLast30Days },
          ].map((s) => (
            <div
              key={s.label}
              className="px-4 py-3"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-ui)',
                borderRadius: 'var(--radius-sm)',
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

      {/* Data Table */}
      {error ? (
        <div className="p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to load users.</p>
          <button onClick={handleRefresh} className="mt-2 text-xs font-semibold underline" style={{ color: 'var(--text-primary)' }}>Retry</button>
        </div>
      ) : !stats ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={users}
          searchKeys={['displayName', 'email', 'role', 'subscriptionPlan']}
          searchPlaceholder="Search users by name, email, role, or plan…"
          actions={(row) => (
            <button
              onClick={() => setSelectedUserUid(row.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-colors hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
              style={{ borderColor: 'var(--border-ui)', color: 'var(--text-primary)' }}
            >
              <UserCheck className="w-3.5 h-3.5" />
              User 360
            </button>
          )}
        />
      )}

      {/* User 360 Drawer */}
      <User360Drawer
        targetUid={selectedUserUid}
        onClose={() => setSelectedUserUid(null)}
        onRefreshParent={fetchData}
      />
    </div>
  );
}
