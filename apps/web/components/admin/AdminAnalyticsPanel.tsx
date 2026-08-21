'use client';

import { useState } from 'react';
import {
  AdminPageShell,
  AdminStateBlock,
  StatusPill,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';

interface AnalyticsPayload {
  userGrowth: { thisMonth: number; lastMonth: number; wow: string };
  revenueSnapshot: { mrr: number; growth: string };
  retention: { d30: number; d90: number; d180: number };
  platformActivity: { projectsCreated: number; dealsPublished: number; messages: number };
  featureAdoption: Array<{ name: string; pct: number }>;
  accountTypes: Array<{ name: string; count: number }>;
  plaid: {
    connected: number;
    needsReauth: number;
    healthyPct: number;
    connections: Array<{ id: string; user: string; institution: string; status: string }>;
  };
  support: { frtHours: number; fcrPct: number; csat: number; volume: number };
}

export default function AdminAnalyticsPanel() {
  const { data, loading, error, reload } = useAdminOpsSection<AnalyticsPayload>('analytics');
  const [tab, setTab] = useState<'platform' | 'plaid'>('platform');

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Analytics" subtitle="Platform + Plaid/support KPIs (seed).">
        <AdminStateBlock loading={loading} error={error} onRetry={reload} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Analytics"
      subtitle="Seed port of v0 /admin/analytics."
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
      <div className="flex gap-2">
        {(
          [
            { id: 'platform' as const, label: 'Platform usage' },
            { id: 'plaid' as const, label: 'Plaid & support' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === item.id ? 'bg-black text-white' : 'border border-black/10 bg-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'platform' ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">User growth</p>
              <p className="mt-2 text-2xl font-semibold">{data.userGrowth.thisMonth}</p>
              <p className="text-xs text-black/55">
                vs {data.userGrowth.lastMonth} last mo · {data.userGrowth.wow}
              </p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">Revenue</p>
              <p className="mt-2 text-2xl font-semibold">${data.revenueSnapshot.mrr.toLocaleString()}</p>
              <p className="text-xs text-black/55">{data.revenueSnapshot.growth} MoM</p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">Retention</p>
              <p className="mt-2 text-sm font-semibold">
                D30 {data.retention.d30}% · D90 {data.retention.d90}% · D180 {data.retention.d180}%
              </p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">Activity</p>
              <p className="mt-2 text-sm">
                {data.platformActivity.projectsCreated} projects ·{' '}
                {data.platformActivity.dealsPublished} deals · {data.platformActivity.messages} msgs
              </p>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-black/45">
                Feature adoption
              </p>
              <ul className="space-y-3">
                {data.featureAdoption.map((feat) => (
                  <li key={feat.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{feat.name}</span>
                      <span className="font-semibold">{feat.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-black/5">
                      <div className="h-full rounded-full bg-black" style={{ width: `${feat.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-black/45">
                Account types
              </p>
              <ul className="space-y-2 text-sm">
                {data.accountTypes.map((type) => (
                  <li key={type.name} className="flex justify-between">
                    <span>{type.name}</span>
                    <span className="font-semibold">{type.count}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        </>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">Connected</p>
              <p className="mt-2 text-2xl font-semibold">{data.plaid.connected}</p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">Needs reauth</p>
              <p className="mt-2 text-2xl font-semibold">{data.plaid.needsReauth}</p>
            </article>
            <article className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">Healthy</p>
              <p className="mt-2 text-2xl font-semibold">{data.plaid.healthyPct}%</p>
            </article>
          </section>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {data.plaid.needsReauth} institutions need reauthentication.
          </div>

          <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-black/45">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Institution</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.plaid.connections.map((row) => (
                  <tr key={row.id} className="border-t border-black/5">
                    <td className="px-4 py-3 font-semibold">{row.user}</td>
                    <td className="px-4 py-3">{row.institution}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="grid gap-4 sm:grid-cols-4">
            {[
              { label: 'FRT (hrs)', value: data.support.frtHours },
              { label: 'FCR %', value: data.support.fcrPct },
              { label: 'CSAT', value: data.support.csat },
              { label: 'Volume', value: data.support.volume },
            ].map((card) => (
              <article key={card.label} className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold">{card.value}</p>
              </article>
            ))}
          </section>
        </>
      )}
    </AdminPageShell>
  );
}
