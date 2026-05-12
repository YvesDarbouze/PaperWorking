'use client';

import React from 'react';
import KPICard from '@/components/admin/KPICard';
import ActivityFeed from '@/components/admin/ActivityFeed';
import { kpiMetrics, revenueChartData, planDistribution, recentActivity } from '@/lib/admin/mockData';

/* ═══════════════════════════════════════════════════════
   Admin Overview — Command Center for Platform Admins

   KPI Grid + Revenue Chart + Plan Distribution + Activity
   ═══════════════════════════════════════════════════════ */

function RevenueChart() {
  const maxMrr = Math.max(...revenueChartData.map((d) => d.mrr));
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
        Revenue Growth (MRR)
      </p>
      <div className="flex items-end gap-3" style={{ height: 180 }}>
        {revenueChartData.map((d) => {
          const pct = (d.mrr / maxMrr) * 100;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                ${(d.mrr / 1000).toFixed(1)}k
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

function PlanDistribution() {
  const total = planDistribution.reduce((s, p) => s + p.count, 0);
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
        {planDistribution.map((plan) => (
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
        {planDistribution.map((plan) => (
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

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Admin Overview
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Platform health and key performance indicators
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiMetrics.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts + Activity row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <RevenueChart />
          <PlanDistribution />
        </div>
        <div className="space-y-4">
          <QuickActions />
          <ActivityFeed items={recentActivity} />
        </div>
      </div>
    </div>
  );
}
