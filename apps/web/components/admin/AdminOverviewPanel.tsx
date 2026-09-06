'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import ActivityFeed, { type AdminActivityItem } from '@/components/admin/ActivityFeed';
import KPICard from '@/components/admin/KPICard';
import {
  AdminPageShell,
  AdminStateBlock,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';
import {
  getAdminAgentCrewFromBff,
  getAdminLenderChecklistsFromBff,
  getAdminLenderRatesFromBff,
  getAdminRentcastUsageFromBff,
} from '@/lib/admin/admin-api';

interface OverviewData {
  mrr: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  kpis: Array<{
    label: string;
    value: string;
    change: number;
    changeLabel: string;
    sparkline?: number[];
  }>;
  plans: Array<{ name: string; count: number; color: string }>;
  activity: AdminActivityItem[];
}

interface InfraState {
  rentcast?: string;
  agents?: string;
  rates?: string;
  checklists?: string;
}

function money(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

export default function AdminOverviewPanel() {
  const { data, loading, error, reload } = useAdminOpsSection<OverviewData>('overview');
  const [infra, setInfra] = useState<InfraState>({});

  useEffect(() => {
    let cancelled = false;
    async function loadInfra() {
      try {
        const [rentcast, agents, rates, checklists] = await Promise.all([
          getAdminRentcastUsageFromBff(),
          getAdminAgentCrewFromBff(),
          getAdminLenderRatesFromBff(),
          getAdminLenderChecklistsFromBff(),
        ]);
        if (cancelled) return;
        setInfra({
          rentcast: `${rentcast.count ?? 0}/${rentcast.limit ?? 0}`,
          agents: String(agents.count ?? 0),
          rates: String(rates.rates?.length ?? 0),
          checklists: String(Object.keys(checklists.checklists ?? {}).length),
        });
      } catch {
        // keep empty
      }
    }
    loadInfra();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Admin Overview" subtitle="Platform command center (main-parity shell + seed).">
        <AdminStateBlock loading={loading} error={error} onRetry={reload} />
      </AdminPageShell>
    );
  }

  const bars = [
    { label: 'Last Mo', value: data.revenueLastMonth },
    { label: 'This Mo', value: data.revenueThisMonth },
    { label: 'MRR', value: data.mrr },
  ];
  const maxBar = Math.max(...bars.map((b) => b.value), 1);
  const planTotal = data.plans.reduce((s, p) => s + p.count, 0) || 1;

  return (
    <AdminPageShell
      title="Admin Overview"
      subtitle="KPI grid + revenue + plan mix + activity — ported from PaperWorking main /admin."
      actions={
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1.5 border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh
        </button>
      }
    >
      <section className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {data.kpis.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            changeLabel={kpi.changeLabel}
            sparkline={kpi.sparkline}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <article
            className="p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
          >
            <p
              className="mb-4 text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Revenue Overview
            </p>
            <div className="flex h-44 items-end gap-3">
              {bars.map((bar) => (
                <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold">{money(bar.value)}</span>
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${Math.max(8, (bar.value / maxBar) * 100)}%`,
                      background: 'var(--text-primary)',
                    }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article
            className="p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
          >
            <p
              className="mb-4 text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Plan Distribution
            </p>
            <div className="mb-5 flex h-3 overflow-hidden rounded">
              {data.plans.map((plan) => (
                <div
                  key={plan.name}
                  style={{ width: `${(plan.count / planTotal) * 100}%`, background: plan.color }}
                />
              ))}
            </div>
            <ul className="space-y-3">
              {data.plans.map((plan) => (
                <li key={plan.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: plan.color }} />
                    {plan.name}
                  </span>
                  <span className="font-semibold">{plan.count}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="space-y-4">
          <article
            className="p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
          >
            <p
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Quick Actions
            </p>
            <div className="flex flex-col gap-2">
              {[
                { href: '/admin/users', label: 'Manage users', icon: 'group' },
                { href: '/admin/projects', label: 'Browse projects', icon: 'folder_open' },
                { href: '/admin/organizations', label: 'Organizations', icon: 'corporate_fare' },
                { href: '/admin/subscriptions', label: 'Billing queue', icon: 'credit_card' },
                { href: '/admin/integrations', label: 'Integrations', icon: 'hub' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-2 border border-black/10 px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition hover:bg-black/[0.03]"
                >
                  <span className="material-symbols-outlined text-[16px]">{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>
          </article>

          <ActivityFeed items={data.activity} />

          <article
            className="p-5"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}
          >
            <p
              className="mb-3 text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Integrations
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p style={{ color: 'var(--text-secondary)' }}>RentCast</p>
                <p className="font-semibold">{infra.rentcast ?? '…'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)' }}>Agents</p>
                <p className="font-semibold">{infra.agents ?? '…'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)' }}>Lender rates</p>
                <p className="font-semibold">{infra.rates ?? '…'}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-secondary)' }}>Checklists</p>
                <p className="font-semibold">{infra.checklists ?? '…'}</p>
              </div>
            </div>
            <Link
              href="/admin/integrations"
              className="mt-4 inline-block text-xs font-semibold underline"
            >
              View all integrations
            </Link>
          </article>
        </div>
      </section>
    </AdminPageShell>
  );
}
