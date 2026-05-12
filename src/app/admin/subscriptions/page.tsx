'use client';

import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge, { getStatusVariant } from '@/components/admin/StatusBadge';
import { subscriptions, Subscription, planDistribution } from '@/lib/admin/mockData';

/* ═══════════════════════════════════════════════════════
   Admin Subscriptions — Billing & Plan Management
   ═══════════════════════════════════════════════════════ */

const columns: Column<Subscription>[] = [
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

export default function AdminSubscriptionsPage() {
  const totalMrr = subscriptions.reduce((sum, s) => sum + s.mrr, 0);
  const activeCount = subscriptions.filter((s) => s.status === 'active').length;
  const atRiskCount = subscriptions.filter((s) => s.status === 'past_due').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Billing & Subscriptions
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Manage plans, invoices, and payment methods
        </p>
      </div>

      {/* Revenue cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total MRR', value: `$${totalMrr.toLocaleString()}` },
          { label: 'ARR (Projected)', value: `$${(totalMrr * 12).toLocaleString()}` },
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

      {/* Plan breakdown bar */}
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
          {planDistribution.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {p.name}: <strong>{p.count}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Subscriptions table */}
      <DataTable
        columns={columns}
        data={subscriptions}
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
    </div>
  );
}
