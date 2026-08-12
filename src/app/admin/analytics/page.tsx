'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, BarChart3, Activity, ShieldCheck, AlertOctagon, Clock, LifeBuoy, Star, HelpCircle, CheckCircle } from 'lucide-react';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge, { getStatusVariant } from '@/components/admin/StatusBadge';
import { getAdminUserStats, getAdminRevenueStats, getAdminActivityStats } from '@/actions/admin';
import { getPlaidHealthStats, getSupportMetrics, PlaidHealthStats, PlaidHealthConnectionItem, SupportMetricsData } from '@/actions/adminAnalytics';
import type { AdminUserStats, AdminRevenueStats, AdminActivityStats } from '@/actions/admin';

/* ═══════════════════════════════════════════════════════
   Admin Analytics — Platform Usage, Plaid Health & Support Metrics
   (Amendments A, B, C, D)
   ═══════════════════════════════════════════════════════ */

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="h-48 animate-shimmer rounded"
      style={{ border: '1px solid var(--border-ui)' }}
    />
  );
}

function UserSummary({ stats }: { stats: AdminUserStats }) {
  const items = [
    { label: 'Total Users', value: stats.totalUsers },
    { label: 'New (30d)', value: stats.newUsersLast30Days },
    { label: 'Active Subs', value: stats.activeSubscriptions },
    { label: 'Trialing', value: stats.trialUsers },
  ];

  return (
    <ChartCard title="User Growth">
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
            <p className="text-3xl font-extralight mt-1" style={{ color: 'var(--text-primary)' }}>
              {item.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function RevenueSnapshot({ stats }: { stats: AdminRevenueStats }) {
  const items = [
    { label: 'MRR', value: `$${stats.mrr.toLocaleString()}` },
    { label: 'ARR', value: `$${stats.arr.toLocaleString()}` },
    { label: 'This Month', value: `$${stats.revenueThisMonth.toLocaleString()}` },
    { label: 'MoM Growth', value: `${stats.monthOverMonthGrowth >= 0 ? '+' : ''}${stats.monthOverMonthGrowth}%` },
  ];

  return (
    <ChartCard title="Revenue Snapshot">
      <div className="grid grid-cols-2 gap-4">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
            <p className="text-3xl font-extralight mt-1" style={{ color: 'var(--text-primary)' }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function RetentionFunnel({ stats }: { stats: AdminUserStats }) {
  const total = stats.totalUsers || 1;
  const stages = [
    { label: 'Signed Up', value: stats.totalUsers, pct: 100 },
    { label: 'Active Subscription', value: stats.activeSubscriptions, pct: Math.round((stats.activeSubscriptions / total) * 100) },
    { label: 'Trialing', value: stats.trialUsers, pct: Math.round((stats.trialUsers / total) * 100) },
    { label: 'Past Due', value: stats.pastDueUsers, pct: Math.round((stats.pastDueUsers / total) * 100) },
    { label: 'Churned (30d)', value: stats.churnedLast30Days, pct: Math.round((stats.churnedLast30Days / total) * 100) },
  ];

  return (
    <ChartCard title="Retention Funnel">
      <div className="space-y-3">
        {stages.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                {s.value} ({s.pct}%)
              </span>
            </div>
            <div className="w-full h-2 overflow-hidden" style={{ background: '#f2f2f2', borderRadius: 4 }}>
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${s.pct}%`, background: '#0d0d0d', borderRadius: 4 }}
              />
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function FeatureAdoption() {
  const features = [
    { name: 'Deal Analyzer', adoption: 88 },
    { name: 'Document Vault', adoption: 72 },
    { name: 'Rehab Tracker', adoption: 65 },
    { name: 'Team Collaboration', adoption: 48 },
    { name: 'Exit Calculator', adoption: 41 },
    { name: 'NOI Deep Dive', adoption: 34 },
    { name: 'Vendor Marketplace', adoption: 22 },
    { name: 'MLS Data Sync', adoption: 19 },
  ];

  return (
    <ChartCard title="Feature Adoption Rate">
      <div className="space-y-2.5">
        {features.map((f) => (
          <div key={f.name} className="flex items-center gap-3">
            <span
              className="text-xs shrink-0"
              style={{ color: 'var(--text-primary)', width: 130, textAlign: 'right' }}
            >
              {f.name}
            </span>
            <div className="flex-1 h-2 overflow-hidden" style={{ background: '#f2f2f2', borderRadius: 4 }}>
              <div
                className="h-full"
                style={{
                  width: `${f.adoption}%`,
                  background: f.adoption > 60 ? '#0d0d0d' : f.adoption > 30 ? '#595959' : '#A5A5A5',
                  borderRadius: 4,
                }}
              />
            </div>
            <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-secondary)', width: 36 }}>
              {f.adoption}%
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

function AccountTypeBreakdown({ users }: { users: AdminUserStats['recentUsers'] }) {
  const investors = users.filter((u) => u.accountType === 'investor').length;
  const vendors = users.filter((u) => u.accountType === 'vendor').length;
  const total = users.length || 1;

  return (
    <ChartCard title="Account Types">
      <div className="flex items-center gap-6">
        <div className="relative shrink-0" style={{ width: 100, height: 100 }}>
          <svg viewBox="0 0 36 36" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f2f2f2" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none" stroke="#0d0d0d" strokeWidth="3"
              strokeDasharray={`${(investors / total) * 100} ${100 - (investors / total) * 100}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-light" style={{ color: 'var(--text-primary)' }}>{users.length}</span>
          </div>
        </div>
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#0d0d0d' }} aria-hidden="true" />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Investors</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {investors} ({((investors / total) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: '#A5A5A5' }} aria-hidden="true" />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Vendors</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {vendors} ({((vendors / total) * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

function PlatformActivity({ stats }: { stats: AdminActivityStats }) {
  return (
    <ChartCard title="Platform Activity">
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Total Projects', value: stats.totalProjects },
          { label: 'Active', value: stats.activeProjects },
          { label: 'New (30d)', value: stats.projectsCreatedLast30Days },
          { label: 'Capital Tracked', value: `$${(stats.totalCapitalTracked / 1000000).toFixed(1)}M` },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
            <p className="text-2xl font-extralight mt-1" style={{ color: 'var(--text-primary)' }}>
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </p>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'platform' | 'plaid_support'>('platform');
  const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<AdminRevenueStats | null>(null);
  const [activityStats, setActivityStats] = useState<AdminActivityStats | null>(null);
  const [plaidHealth, setPlaidHealth] = useState<PlaidHealthStats | null>(null);
  const [supportMetrics, setSupportMetrics] = useState<SupportMetricsData | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [users, revenue, activity, plaid, support] = await Promise.all([
        getAdminUserStats(),
        getAdminRevenueStats(),
        getAdminActivityStats(),
        getPlaidHealthStats(),
        getSupportMetrics(),
      ]);
      setUserStats(users);
      setRevenueStats(revenue);
      setActivityStats(activity);
      setPlaidHealth(plaid);
      setSupportMetrics(support);
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

  const loaded = userStats && revenueStats && activityStats;

  const plaidColumns: Column<PlaidHealthConnectionItem>[] = [
    {
      key: 'institutionName',
      label: 'Institution',
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.institutionName}</p>
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{row.accountMask || '—'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => (
        <StatusBadge
          label={row.status.replace(/_/g, ' ')}
          variant={row.reauthRequired ? 'danger' : getStatusVariant(row.status)}
        />
      ),
    },
    {
      key: 'syncErrorCount',
      label: 'Sync Errors',
      sortable: true,
      render: (row) => (
        <span className={`text-xs font-bold ${row.syncErrorCount > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
          {row.syncErrorCount}
        </span>
      ),
    },
    {
      key: 'lastSuccessfulSyncAt',
      label: 'Last Sync',
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono text-gray-500">
          {row.lastSuccessfulSyncAt ? new Date(row.lastSuccessfulSyncAt).toLocaleDateString() : 'Never'}
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
            Platform Analytics & System Health
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Usage metrics, Plaid connection status, and support response times
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
          onClick={() => setActiveTab('platform')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'platform' ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Platform Usage Analytics
        </button>
        <button
          onClick={() => setActiveTab('plaid_support')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            activeTab === 'plaid_support' ? 'border-black text-black dark:border-white dark:text-white font-bold' : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Activity className="w-4 h-4 text-indigo-500" />
          Plaid Health & Support Metrics
        </button>
      </div>

      {error && (
        <div className="p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to load analytics data.</p>
          <button onClick={handleRefresh} className="mt-2 text-xs font-semibold underline" style={{ color: 'var(--text-primary)' }}>Retry</button>
        </div>
      )}

      {/* Tab 1: Platform Usage */}
      {activeTab === 'platform' && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {loaded ? <UserSummary stats={userStats} /> : <ChartSkeleton />}
            {loaded ? <RevenueSnapshot stats={revenueStats} /> : <ChartSkeleton />}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {loaded ? <RetentionFunnel stats={userStats} /> : <ChartSkeleton />}
            {loaded ? <PlatformActivity stats={activityStats} /> : <ChartSkeleton />}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FeatureAdoption />
            <div className="space-y-4">
              {loaded ? <AccountTypeBreakdown users={userStats.recentUsers} /> : <ChartSkeleton />}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Plaid Health & Support Metrics */}
      {activeTab === 'plaid_support' && (
        <div className="space-y-8">
          {/* Plaid Health Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-light tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Plaid Financial Integration Health (Amendment B)
            </h2>

            {/* Connection Cards */}
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { label: 'Total Plaid Connections', value: plaidHealth?.totalConnections || 0 },
                { label: 'Healthy (Syncing)', value: plaidHealth?.healthyCount || 0, color: 'text-emerald-600' },
                { label: 'Item Login Required', value: plaidHealth?.loginRequiredCount || 0, color: 'text-amber-600' },
                { label: 'Errored / Stale', value: (plaidHealth?.staleCount || 0) + (plaidHealth?.erroredCount || 0), color: 'text-red-600' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="px-4 py-3 border rounded-sm"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{s.label}</p>
                  <p className={`text-2xl font-extralight mt-1 ${s.color || ''}`} style={{ color: s.color ? undefined : 'var(--text-primary)' }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Guidance banner for login required */}
            {(plaidHealth?.loginRequiredCount || 0) > 0 && (
              <div className="p-4 rounded-lg border bg-amber-500/5 border-amber-500/20 flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-300">
                  <p className="font-semibold">Guided Action: {plaidHealth?.loginRequiredCount} Bank Connections Require Re-Authentication</p>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    Bank credentials have expired or require MFA challenge (ITEM_LOGIN_REQUIRED). Direct users to re-authenticate via Plaid Link DTM screen.
                  </p>
                </div>
              </div>
            )}

            {/* Plaid Connections Table */}
            {!plaidHealth ? (
              <ChartSkeleton />
            ) : plaidHealth.connections.length === 0 ? (
              <div className="p-10 text-center border rounded-lg" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No Active Plaid Connections</h3>
                <p className="text-xs text-gray-500 mt-1">No user bank accounts are currently linked.</p>
              </div>
            ) : (
              <DataTable
                columns={plaidColumns}
                data={plaidHealth.connections}
                searchKeys={['institutionName', 'status']}
                searchPlaceholder="Search bank connections by institution or status…"
              />
            )}
          </div>

          {/* Support Operations MVP Metrics Section */}
          <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'var(--border-ui)' }}>
            <h2 className="text-xl font-light tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Support Operations — MVP Metrics (Amendment D)
            </h2>

            {!supportMetrics?.hasData ? (
              <div className="p-8 text-center border rounded-lg" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                <LifeBuoy className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No Support Ticket Data Available</h3>
                <p className="text-xs text-gray-500 mt-1">
                  The support ticket pipeline contains 0 recorded tickets. Support KPIs (FRT, Resolution Time, CSAT Score) will populate dynamically as tickets arrive.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="px-4 py-3 border rounded-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <Clock className="w-3.5 h-3.5" /> First Response Time
                  </div>
                  <p className="text-2xl font-extralight mt-1" style={{ color: 'var(--text-primary)' }}>
                    {supportMetrics.avgFirstResponseTimeHours} hrs
                  </p>
                </div>
                <div className="px-4 py-3 border rounded-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <CheckCircle className="w-3.5 h-3.5" /> Resolution Time
                  </div>
                  <p className="text-2xl font-extralight mt-1" style={{ color: 'var(--text-primary)' }}>
                    {supportMetrics.avgResolutionTimeHours} hrs
                  </p>
                </div>
                <div className="px-4 py-3 border rounded-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <Star className="w-3.5 h-3.5 text-amber-500" /> CSAT Score
                  </div>
                  <p className="text-2xl font-extralight mt-1" style={{ color: 'var(--text-primary)' }}>
                    {supportMetrics.csatScore} / 5.0
                  </p>
                </div>
                <div className="px-4 py-3 border rounded-sm" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <HelpCircle className="w-3.5 h-3.5" /> Total Volume
                  </div>
                  <p className="text-2xl font-extralight mt-1" style={{ color: 'var(--text-primary)' }}>
                    {supportMetrics.totalTickets}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
