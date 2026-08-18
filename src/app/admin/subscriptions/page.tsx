'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CreditCard, AlertTriangle, ShieldCheck, ShieldAlert, RotateCw, XCircle } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge, { getStatusVariant } from '@/components/admin/StatusBadge';
import { getAdminRevenueStats, getAdminUserStats } from '@/actions/admin';
import { getDunningQueue, retryFailedInvoice, cancelUserSubscriptionAdmin, DunningEntry } from '@/actions/adminBilling';
import type { AdminRevenueStats, AdminUserStats } from '@/actions/admin';

/* ═══════════════════════════════════════════════════════
   Admin Subscriptions — Billing & Dunning Management Surface
   Restricted-Key Stripe Client + Real Dunning Lifecycle (Amendment A, B, C, D).
   ═══════════════════════════════════════════════════════ */

type SubRow = AdminRevenueStats['recentSubscriptions'][number];

const subColumns: Column<SubRow>[] = [
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
  const [activeTab, setActiveTab] = useState<'overview' | 'dunning'>('overview');
  const [revenue, setRevenue] = useState<AdminRevenueStats | null>(null);
  const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
  const [dunningQueue, setDunningQueue] = useState<DunningEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingInvoiceId, setRetryingInvoiceId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [rev, users, dunning] = await Promise.all([
        getAdminRevenueStats(),
        getAdminUserStats(),
        getDunningQueue(),
      ]);
      setRevenue(rev);
      setUserStats(users);
      setDunningQueue(dunning);
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

  const handleRetryInvoice = async (invoiceId: string) => {
    setRetryingInvoiceId(invoiceId);
    try {
      const res = await retryFailedInvoice(invoiceId);
      if (res.success) {
        alert('Invoice payment successfully collected!');
        fetchData();
      } else {
        alert(`Payment retry failed: ${res.error || 'Card declined'}`);
      }
    } finally {
      setRetryingInvoiceId(null);
    }
  };

  const handleCancelSubscription = async (userId: string, subscriptionId?: string | null) => {
    if (!confirm('Are you sure you want to cancel this user subscription? Access will be revoked immediately.')) return;
    try {
      const res = await cancelUserSubscriptionAdmin({
        targetUid: userId,
        subscriptionId: subscriptionId || undefined,
        immediate: true,
      });
      if (res.success) {
        alert('Subscription canceled.');
        fetchData();
      } else {
        alert(`Cancellation failed: ${res.error}`);
      }
    } catch (err: unknown) {
      alert(`Error: ${(err as Error)?.message}`);
    }
  };

  const subs = revenue?.recentSubscriptions || [];
  const activeCount = subs.filter((s) => s.status === 'active').length;
  const _atRiskCount = (dunningQueue || []).filter((s) => s.status === 'past_due').length;
  const planDist = userStats?.planDistribution || [];

  const dunningColumns: Column<DunningEntry>[] = [
    {
      key: 'userDisplayName',
      label: 'Customer',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.userDisplayName}</p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{row.userEmail}</p>
        </div>
      ),
    },
    {
      key: 'planName',
      label: 'Plan',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status / Access',
      sortable: true,
      render: (row) => (
        <div className="space-y-1">
          <StatusBadge label={row.status.replace('_', ' ')} variant={row.gracePeriodActive ? 'warning' : 'danger'} />
          <span className={`block text-[10px] font-bold uppercase tracking-wider ${row.gracePeriodActive ? 'text-amber-600' : 'text-red-600'}`}>
            {row.gracePeriodActive ? 'Grace Active (Access Kept)' : 'Access Revoked'}
          </span>
        </div>
      ),
    },
    {
      key: 'amountDue',
      label: 'Amount Due',
      sortable: true,
      render: (row) => (
        <span className="text-sm font-bold text-red-500">
          ${row.amountDue > 0 ? row.amountDue : 'Past Due'}
        </span>
      ),
    },
    {
      key: 'lastFailedAt',
      label: 'Failed At',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
          {new Date(row.lastFailedAt).toLocaleDateString()}
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
            Billing & Subscriptions
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Stripe Restricted-Key billing, revenue stats, and dunning queue management
          </p>
        </div>
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
      </div>

      {/* Tabs */}
      <div className="flex border-b text-xs font-semibold" style={{ borderColor: 'var(--border-ui)' }}>
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'overview' ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Subscriptions Overview
        </button>
        <button
          onClick={() => setActiveTab('dunning')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'dunning' ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Dunning & At-Risk Queue ({dunningQueue?.length || 0})
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
            { label: 'At Risk (Dunning Queue)', value: String(dunningQueue?.length || 0) },
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

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
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

          {error ? (
            <div className="p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-lg)' }}>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to load subscription data.</p>
              <button onClick={handleRefresh} className="mt-2 text-xs font-semibold underline" style={{ color: 'var(--text-primary)' }}>Retry</button>
            </div>
          ) : !revenue ? (
            <TableSkeleton />
          ) : (
            <DataTable
              columns={subColumns}
              data={subs}
              searchKeys={['userName', 'email', 'plan', 'status']}
              searchPlaceholder="Search by customer, email, or plan…"
            />
          )}
        </div>
      )}

      {/* Tab 2: Dunning Queue */}
      {activeTab === 'dunning' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-300">
              <p className="font-semibold">Dunning Policy & Access Control Matrix (Amendment D)</p>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Accounts in <strong>past_due</strong> state are in an active grace period: platform features remain accessible while Stripe retries collection. Accounts in <strong>unpaid</strong> or <strong>canceled</strong> state have had access strictly revoked.
              </p>
            </div>
          </div>

          {!dunningQueue ? (
            <TableSkeleton />
          ) : dunningQueue.length === 0 ? (
            <div className="p-12 text-center border rounded-lg" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
              <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Dunning Queue Clear</h3>
              <p className="text-xs text-gray-500 mt-1">There are currently no accounts in past_due, unpaid, or canceled dunning states.</p>
            </div>
          ) : (
            <DataTable
              columns={dunningColumns}
              data={dunningQueue}
              searchKeys={['userDisplayName', 'userEmail', 'planName', 'status']}
              searchPlaceholder="Search dunning queue by customer, email, or plan…"
              actions={(row) => (
                <div className="flex items-center gap-1.5">
                  {row.invoiceId && (
                    <button
                      onClick={() => handleRetryInvoice(row.invoiceId!)}
                      disabled={retryingInvoiceId === row.invoiceId}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      <RotateCw className={`w-3 h-3 ${retryingInvoiceId === row.invoiceId ? 'animate-spin' : ''}`} />
                      Retry Payment
                    </button>
                  )}
                  <button
                    onClick={() => handleCancelSubscription(row.userId, row.subscriptionId)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  >
                    <XCircle className="w-3 h-3" />
                    Cancel Sub
                  </button>
                </div>
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
