'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { getAdminUserStats, getAdminRevenueStats, getAdminActivityStats } from '@/actions/admin';
import type { AdminUserStats, AdminRevenueStats, AdminActivityStats } from '@/actions/admin';

/* ═══════════════════════════════════════════════════════
   Admin Analytics — Platform-wide usage metrics

   Charts: User Summary, Revenue Snapshot, Retention Funnel,
           Feature Adoption, Account Types, Top Regions
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
  /* Feature adoption data would come from a dedicated analytics service.
     Kept static until an analytics pipeline is integrated. */
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
        {/* Donut */}
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

function TopRegions() {
  /* Geographic data would come from an analytics service.
     Kept static until a geo pipeline is integrated. */
  const regions = [
    { name: 'Florida', users: 312, deals: 845 },
    { name: 'Texas', users: 287, deals: 720 },
    { name: 'Georgia', users: 198, deals: 510 },
    { name: 'North Carolina', users: 156, deals: 390 },
    { name: 'Ohio', users: 124, deals: 315 },
  ];

  return (
    <ChartCard title="Top Regions by Activity">
      <div className="overflow-hidden border border-white/5 rounded-xl glass-card">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-surface-container-highest/50 backdrop-blur-md border-b border-white/5">
            <tr>
              <th className="text-left px-4 py-2.5 font-label-md text-label-md text-outline uppercase tracking-wider">Region</th>
              <th className="text-right px-4 py-2.5 font-label-md text-label-md text-outline uppercase tracking-wider">Users</th>
              <th className="text-right px-4 py-2.5 font-label-md text-label-md text-outline uppercase tracking-wider">Deals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {regions.map((r) => (
              <tr key={r.name} className="hover:bg-white/5 transition-colors duration-200 cursor-pointer">
                <td className="px-4 py-2.5 text-pw-black font-body-sm text-body-sm">{r.name}</td>
                <td className="px-4 py-2.5 text-right text-pw-black font-body-sm text-body-sm font-semibold">{r.users}</td>
                <td className="px-4 py-2.5 text-right text-pw-black font-body-sm text-body-sm font-semibold">{r.deals}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<AdminRevenueStats | null>(null);
  const [activityStats, setActivityStats] = useState<AdminActivityStats | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    try {
      const [users, revenue, activity] = await Promise.all([
        getAdminUserStats(),
        getAdminRevenueStats(),
        getAdminActivityStats(),
      ]);
      setUserStats(users);
      setRevenueStats(revenue);
      setActivityStats(activity);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Platform Analytics
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Usage patterns, retention, and feature adoption metrics
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

      {error && (
        <div className="p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)', borderRadius: 'var(--radius-lg)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Failed to load analytics data.</p>
          <button onClick={handleRefresh} className="mt-2 text-xs font-semibold underline" style={{ color: 'var(--text-primary)' }}>Retry</button>
        </div>
      )}

      {/* Charts grid */}
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
          <TopRegions />
        </div>
      </div>
    </div>
  );
}
