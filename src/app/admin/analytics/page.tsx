'use client';

import React from 'react';
import { revenueChartData, planDistribution, adminUsers } from '@/lib/admin/mockData';

/* ═══════════════════════════════════════════════════════
   Admin Analytics — Platform-wide usage metrics

   Charts: User Growth, Revenue Trend, Feature Adoption,
           Retention Funnel, Geographic Distribution
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

function UserGrowthChart() {
  const maxUsers = Math.max(...revenueChartData.map((d) => d.users));
  return (
    <ChartCard title="User Growth">
      <div className="flex items-end gap-3" style={{ height: 180 }}>
        {revenueChartData.map((d) => {
          const pct = (d.users / maxUsers) * 100;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {d.users}
              </span>
              <div
                className="w-full transition-all duration-500"
                style={{
                  height: `${pct}%`,
                  background: '#595959',
                  borderRadius: '4px 4px 0 0',
                  minHeight: 8,
                }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.month}</span>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

function RetentionFunnel() {
  const stages = [
    { label: 'Signed Up', value: 1247, pct: 100 },
    { label: 'Activated (1+ project)', value: 891, pct: 71 },
    { label: 'Retained (30d)', value: 734, pct: 59 },
    { label: 'Paid Subscriber', value: 547, pct: 44 },
    { label: 'Power User (10+ deals)', value: 182, pct: 15 },
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

function AccountTypeBreakdown() {
  const investors = adminUsers.filter((u) => u.accountType === 'investor').length;
  const vendors = adminUsers.filter((u) => u.accountType === 'vendor').length;
  const total = adminUsers.length;

  return (
    <ChartCard title="Account Types">
      <div className="flex items-center gap-6">
        {/* Donut placeholder */}
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
            <span className="text-lg font-light" style={{ color: 'var(--text-primary)' }}>{total}</span>
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
  const regions = [
    { name: 'Florida', users: 312, deals: 845 },
    { name: 'Texas', users: 287, deals: 720 },
    { name: 'Georgia', users: 198, deals: 510 },
    { name: 'North Carolina', users: 156, deals: 390 },
    { name: 'Ohio', users: 124, deals: 315 },
  ];

  return (
    <ChartCard title="Top Regions by Activity">
      <div
        className="overflow-hidden border border-white/5 rounded-xl glass-card"
      >
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

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extralight tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Platform Analytics
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Usage patterns, retention, and feature adoption metrics
        </p>
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        <UserGrowthChart />
        <RetentionFunnel />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FeatureAdoption />
        <div className="space-y-4">
          <AccountTypeBreakdown />
          <TopRegions />
        </div>
      </div>
    </div>
  );
}
