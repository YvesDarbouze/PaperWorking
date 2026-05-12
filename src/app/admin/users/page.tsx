'use client';

import React from 'react';
import { MoreHorizontal, UserPlus } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge, { getStatusVariant } from '@/components/admin/StatusBadge';
import { adminUsers, AdminUser } from '@/lib/admin/mockData';

/* ═══════════════════════════════════════════════════════
   Admin Users — User & Account Management
   ═══════════════════════════════════════════════════════ */

const columns: Column<AdminUser>[] = [
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

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            User Management
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {adminUsers.length} registered accounts
          </p>
        </div>
        <button className="ag-button flex items-center gap-2 text-sm">
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Users', value: adminUsers.length },
          { label: 'Active', value: adminUsers.filter((u) => u.subscriptionStatus === 'active').length },
          { label: 'Past Due', value: adminUsers.filter((u) => u.subscriptionStatus === 'past_due').length },
          { label: 'Churned', value: adminUsers.filter((u) => u.subscriptionStatus === 'canceled').length },
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

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={adminUsers}
        searchKeys={['displayName', 'email', 'role', 'subscriptionPlan']}
        searchPlaceholder="Search users by name, email, role, or plan…"
        actions={(row) => (
          <button
            className="p-1.5 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            aria-label={`Actions for ${row.displayName}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      />
    </div>
  );
}
