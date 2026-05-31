'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MoreHorizontal, RefreshCw } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge, { getStatusVariant } from '@/components/admin/StatusBadge';
import { getAdminRevenueStats, getAdminUserStats } from '@/actions/admin';
import type { AdminRevenueStats, AdminUserStats } from '@/actions/admin';

/* ═══════════════════════════════════════════════════════
   Admin Subscriptions — Billing & Plan Management
   Live data from Stripe + Firestore.
   ═══════════════════════════════════════════════════════ */

type SubRow = AdminRevenueStats['recentSubscriptions'][number];

const columns: Column<SubRow>[] = [
  {
    key: 'userName',
    label: 'Customer',
    sortable: true,
    render: (row) => (
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.userName}</p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.email}</p>
      </div>
    ),
  },
  {
    key: 'plan',
    label: 'Plan',
    sortable: true,
    render: (row) => (
      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.plan}</span>
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
    key: 'mrr',
    label: 'MRR',
    sortable: true,
    render: (row) => (
      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {row.mrr === 0 ? '—' : `$${row.mrr}`}
      </span>
    ),
  },
  {
    key: 'paymentMethod',
    label: 'Payment',
    render: (row) => (
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.paymentMethod}</span>
    ),
  },
  {
    key: 'nextBillingDate',
    label: 'Next Billing',
    sortable: true,
    render: (row) => (
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.nextBillingDate}</span>
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

export default function AdminSubscriptionsPage() {
  const [revenue, setRevenue] = useState<AdminRevenueStats | null>(null);
  const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [rev, users] = await Promise.all([getAdminRevenueStats(), getAdminUserStats()]);
      setRevenue(rev);
      setUserStats(users);
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

  const subs = revenue?.recentSubscriptions || [];
  const activeCount = subs.filter((s) => s.status === 'active').length;
  const atRiskCount = subs.filter((s) => s.status === 'past_due').length;
  const planDist = userStats?.planDistribution || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Billing & Subscriptions
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Manage plans, invoices, and payment methods
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

      {/* Revenue cards */}
      {!revenue ? (
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
            { label: 'Total MRR', value: `$${revenue.mrr.toLocaleString()}` },
            { label: 'ARR (Projected)', value: `$${revenue.arr.toLocaleString()}` },
            { label: 'Active Subscriptions', value: String(activeCount) },
            { label: 'At Risk (Past Due)', value: String(atRiskCount) },
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

      {/* Plan breakdown bar */}
      {planDist.length > 0 && (
        <div
          className="p-5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-ui)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
            Plan Breakdown
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            {planDist.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {p.name}: <strong>{p.count}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subscriptions table */}
      {error ? (
        <div className="p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to load subscription data.</p>
          <button onClick={handleRefresh} className="mt-2 text-xs font-semibold underline" style={{ color: 'var(--text-primary)' }}>Retry</button>
        </div>
      ) : !revenue ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={columns}
          data={subs}
          searchKeys={['userName', 'email', 'plan', 'status']}
          searchPlaceholder="Search by customer, email, or plan…"
          actions={(row) => (
            <button
              className="p-1.5 transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
              aria-label={`Actions for ${row.userName}`}
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        />
      )}
    </div>
  );
}
