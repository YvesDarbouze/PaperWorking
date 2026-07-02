'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import KPICard from '@/components/admin/KPICard';
import ActivityFeed from '@/components/admin/ActivityFeed';
import { getAdminUserStats, getAdminRevenueStats, getAdminActivityStats } from '@/actions/admin';
import type { AdminUserStats, AdminRevenueStats, AdminActivityStats, ActivityItem } from '@/actions/admin';

/* ═══════════════════════════════════════════════════════
   Admin Overview — Command Center for Platform Admins

   KPI Grid + Revenue Chart + Plan Distribution + Activity
   All data from live Firestore + Stripe queries.
   ═══════════════════════════════════════════════════════ */

// ── Shimmer Skeleton ─────────────────────────────────

function KPICardSkeleton() {
  return (
    <div
      className="flex flex-col justify-between p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
        minHeight: 140,
      }}
    >
      <div className="h-3 w-24 animate-shimmer rounded" />
      <div className="h-8 w-20 animate-shimmer rounded mt-3" />
      <div className="h-3 w-32 animate-shimmer rounded mt-3" />
    </div>
  );
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      className="p-5"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <div className="h-3 w-36 animate-shimmer rounded mb-4" />
      <div className="animate-shimmer rounded" style={{ height }} />
    </div>
  );
}

// ── Revenue Chart ────────────────────────────────────

function RevenueChart({ mrr, revenueThisMonth, revenueLastMonth }: { mrr: number; revenueThisMonth: number; revenueLastMonth: number }) {
  // Build a simple bar chart from available data points
  const data = [
    { month: 'Last Mo', mrr: revenueLastMonth },
    { month: 'This Mo', mrr: revenueThisMonth },
    { month: 'MRR', mrr },
  ];
  const maxMrr = Math.max(...data.map((d) => d.mrr), 1);

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
        Revenue Overview
      </p>
      <div className="flex items-end gap-3" style={{ height: 180 }}>
        {data.map((d) => {
          const pct = (d.mrr / maxMrr) * 100;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                ${d.mrr > 1000 ? `${(d.mrr / 1000).toFixed(1)}k` : d.mrr}
              </span>
              <div
                className="w-full transition-all duration-500"
                style={{
                  height: `${pct}%`,
                  background: '#0d0d0d',
                  borderRadius: '4px 4px 0 0',
                  minHeight: 8,
                }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {d.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Plan Distribution ────────────────────────────────

function PlanDistribution({ plans }: { plans: { name: string; count: number; color: string }[] }) {
  const total = plans.reduce((s, p) => s + p.count, 0) || 1;

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
        Plan Distribution
      </p>

      {/* Stacked bar */}
      <div className="flex w-full h-3 overflow-hidden mb-5" style={{ borderRadius: 4 }}>
        {plans.map((plan) => (
          <div
            key={plan.name}
            style={{
              width: `${(plan.count / total) * 100}%`,
              background: plan.color,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {plans.map((plan) => (
          <div key={plan.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ background: plan.color }}
                aria-hidden="true"
              />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {plan.name}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {plan.count}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {((plan.count / total) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Quick Actions ────────────────────────────────────

function QuickActions() {
  const actions = [
    { label: 'Add New User', emoji: '👤' },
    { label: 'Create Report', emoji: '📊' },
    { label: 'Send Announcement', emoji: '📢' },
    { label: 'Export Data', emoji: '📁' },
  ];

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
        Quick Actions
      </p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <button
            key={a.label}
            className="flex items-center gap-2 px-3 py-3 text-xs font-semibold transition-colors text-left"
            style={{
              border: '1px solid var(--border-ui)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="text-base">{a.emoji}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Inline Error ─────────────────────────────────────

function InlineError({ section, onRetry }: { section: string; onRetry: () => void }) {
  return (
    <div
      className="p-5 text-center"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-ui)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Failed to load {section}.
      </p>
      <button
        onClick={onRetry}
        className="mt-2 text-xs font-semibold underline"
        style={{ color: 'var(--text-primary)' }}
      >
        Retry
      </button>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────

export default function AdminOverviewPage() {
  const [userStats, setUserStats] = useState<AdminUserStats | null>(null);
  const [revenueStats, setRevenueStats] = useState<AdminRevenueStats | null>(null);
  const [activityStats, setActivityStats] = useState<AdminActivityStats | null>(null);

  const [userError, setUserError] = useState(false);
  const [revenueError, setRevenueError] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserStats = useCallback(async () => {
    setUserError(false);
    try {
      const stats = await getAdminUserStats();
      setUserStats(stats);
    } catch {
      setUserError(true);
    }
  }, []);

  const fetchRevenueStats = useCallback(async () => {
    setRevenueError(false);
    try {
      const stats = await getAdminRevenueStats();
      setRevenueStats(stats);
    } catch {
      setRevenueError(true);
    }
  }, []);

  const fetchActivityStats = useCallback(async () => {
    setActivityError(false);
    try {
      const stats = await getAdminActivityStats();
      setActivityStats(stats);
    } catch {
      setActivityError(true);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUserStats(), fetchRevenueStats(), fetchActivityStats()]);
    setRefreshing(false);
  }, [fetchUserStats, fetchRevenueStats, fetchActivityStats]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Build KPI cards from live data
  const kpiMetrics = userStats && revenueStats && activityStats
    ? [
        {
          label: 'Monthly Recurring Revenue',
          value: `$${revenueStats.mrr.toLocaleString()}`,
          change: revenueStats.monthOverMonthGrowth,
          changeLabel: 'vs last month',
        },
        {
          label: 'Active Users',
          value: userStats.activeSubscriptions.toLocaleString(),
          change: userStats.totalUsers > 0
            ? Math.round((userStats.newUsersLast30Days / userStats.totalUsers) * 100 * 10) / 10
            : 0,
          changeLabel: 'new last 30d',
        },
        {
          label: 'Churn Rate',
          value: userStats.totalUsers > 0
            ? `${((userStats.churnedLast30Days / userStats.totalUsers) * 100).toFixed(1)}%`
            : '0%',
          change: userStats.churnedLast30Days > 0 ? -userStats.churnedLast30Days : 0,
          changeLabel: 'last 30 days',
        },
        {
          label: 'Trial Users',
          value: userStats.trialUsers.toLocaleString(),
          change: 0,
          changeLabel: 'current',
        },
        {
          label: 'Total Users',
          value: userStats.totalUsers.toLocaleString(),
          change: userStats.totalUsers > 0
            ? Math.round((userStats.newUsersLast30Days / userStats.totalUsers) * 100 * 10) / 10
            : 0,
          changeLabel: 'growth',
        },
        {
          label: 'Total Projects',
          value: activityStats.totalProjects.toLocaleString(),
          change: activityStats.totalProjects > 0
            ? Math.round((activityStats.projectsCreatedLast30Days / activityStats.totalProjects) * 100 * 10) / 10
            : 0,
          changeLabel: 'new last 30d',
        },
      ]
    : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Admin Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Platform health and key performance indicators
          </p>
        </div>
        <button
          onClick={fetchAll}
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

      {/* KPI Grid */}
      {userError ? (
        <InlineError section="user stats" onRetry={fetchUserStats} />
      ) : !kpiMetrics ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kpiMetrics.map((kpi) => (
            <KPICard key={kpi.label} {...kpi} />
          ))}
        </div>
      )}

      {/* Charts + Activity row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {revenueError ? (
            <InlineError section="revenue data" onRetry={fetchRevenueStats} />
          ) : !revenueStats ? (
            <>
              <ChartSkeleton height={180} />
              <ChartSkeleton height={120} />
            </>
          ) : (
            <>
              <RevenueChart
                mrr={revenueStats.mrr}
                revenueThisMonth={revenueStats.revenueThisMonth}
                revenueLastMonth={revenueStats.revenueLastMonth}
              />
              {userStats && <PlanDistribution plans={userStats.planDistribution} />}
            </>
          )}
        </div>
        <div className="space-y-4">
          <QuickActions />
          {activityError ? (
            <InlineError section="activity feed" onRetry={fetchActivityStats} />
          ) : !activityStats ? (
            <ChartSkeleton height={200} />
          ) : (
            <ActivityFeed items={activityStats.recentActivity as ActivityItem[]} />
          )}
        </div>
      </div>
    </div>
  );
}
