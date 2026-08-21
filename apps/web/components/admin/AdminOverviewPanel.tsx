'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  AdminPageShell,
  AdminStateBlock,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';

interface OverviewData {
  mrr: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  activeUsers: number;
  churnRate: number;
  trialUsers: number;
  totalUsers: number;
  totalProjects: number;
  plans: Array<{ name: string; count: number; color: string }>;
  activity: Array<{ id: string; title: string; detail: string; at: string }>;
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
        const [rentcastRes, agentsRes, ratesRes, checklistsRes] = await Promise.all([
          fetch('/api/admin/rentcast-usage', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/admin/agent-crew', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/admin/lender-rates', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/admin/lender-checklists', { credentials: 'include', cache: 'no-store' }),
        ]);
        const rentcast = (await rentcastRes.json()) as { count?: number; limit?: number };
        const agents = (await agentsRes.json()) as { count?: number };
        const rates = (await ratesRes.json()) as { rates?: unknown[] };
        const checklists = (await checklistsRes.json()) as { checklists?: Record<string, unknown> };
        if (cancelled) return;
        setInfra({
          rentcast: rentcastRes.ok ? `${rentcast.count ?? 0}/${rentcast.limit ?? 0}` : '—',
          agents: agentsRes.ok ? String(agents.count ?? 0) : '—',
          rates: ratesRes.ok ? String(rates.rates?.length ?? 0) : '—',
          checklists: checklistsRes.ok
            ? String(Object.keys(checklists.checklists ?? {}).length)
            : '—',
        });
      } catch {
        // keep empty infra cards
      }
    }
    loadInfra();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Command center" subtitle="Platform admin overview from v0 ops seed.">
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
      title="Command center"
      subtitle="KPI grid + revenue + plan mix + activity — seed-backed port of v0 /admin."
      actions={
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
        >
          Refresh
        </button>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          { label: 'MRR', value: money(data.mrr) },
          { label: 'Active users', value: String(data.activeUsers) },
          { label: 'Churn', value: `${data.churnRate}%` },
          { label: 'Trials', value: String(data.trialUsers) },
          { label: 'Total users', value: String(data.totalUsers) },
          { label: 'Total projects', value: String(data.totalProjects) },
        ].map((kpi) => (
          <article key={kpi.label} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">{kpi.label}</p>
            <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-black/45">Revenue overview</p>
          <div className="mt-4 flex h-44 items-end gap-3">
            {bars.map((bar) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold">{money(bar.value)}</span>
                <div
                  className="w-full rounded-t bg-black"
                  style={{ height: `${Math.max(8, (bar.value / maxBar) * 100)}%` }}
                />
                <span className="text-xs text-black/50">{bar.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-black/45">Plan distribution</p>
          <div className="mt-4 flex h-3 overflow-hidden rounded">
            {data.plans.map((plan) => (
              <div
                key={plan.name}
                style={{ width: `${(plan.count / planTotal) * 100}%`, background: plan.color }}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-2">
            {data.plans.map((plan) => (
              <li key={plan.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm" style={{ background: plan.color }} />
                  {plan.name}
                </span>
                <span className="font-semibold">{plan.count}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-black/45">
            Recent activity
          </p>
          <ul className="space-y-3">
            {data.activity.map((item) => (
              <li key={item.id} className="border-b border-black/5 pb-3 last:border-0">
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-black/55">{item.detail}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-black/45">
            Infra adapters
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-black/45">RentCast</p>
              <p className="font-semibold">{infra.rentcast ?? '…'}</p>
            </div>
            <div>
              <p className="text-black/45">Agents</p>
              <p className="font-semibold">{infra.agents ?? '…'}</p>
            </div>
            <div>
              <p className="text-black/45">Lender rates</p>
              <p className="font-semibold">{infra.rates ?? '…'}</p>
            </div>
            <div>
              <p className="text-black/45">Checklists</p>
              <p className="font-semibold">{infra.checklists ?? '…'}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/admin/users" className="rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white">
              Manage users
            </Link>
            <Link
              href="/admin/agent-crew"
              className="rounded-lg border border-black/10 px-3 py-2 text-xs font-semibold"
            >
              Agent crew
            </Link>
          </div>
        </article>
      </section>
    </AdminPageShell>
  );
}
