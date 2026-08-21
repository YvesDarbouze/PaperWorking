'use client';

import { useState } from 'react';
import {
  AdminPageShell,
  AdminStateBlock,
  StatusPill,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';

interface SubsPayload {
  mrr: number;
  arr: number;
  active: number;
  atRisk: number;
  planBreakdown: Array<{ name: string; count: number; mrr: number }>;
  recent: Array<{
    id: string;
    customer: string;
    plan: string;
    status: string;
    mrr: number;
    renewsAt: string;
  }>;
  dunning: Array<{
    id: string;
    customer: string;
    amount: number;
    attempts: number;
    nextRetryAt: string;
    reason: string;
  }>;
}

export default function AdminSubscriptionsPanel() {
  const { data, loading, error, reload } = useAdminOpsSection<SubsPayload>('subscriptions');
  const [tab, setTab] = useState<'overview' | 'dunning'>('overview');
  const [notice, setNotice] = useState<string | null>(null);

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Billing" subtitle="Subscriptions & dunning queue (seed).">
        <AdminStateBlock loading={loading} error={error} onRetry={reload} />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Billing"
      subtitle="MRR overview + dunning actions — seed port of v0 /admin/subscriptions."
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
        {(['overview', 'dunning'] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
              tab === id ? 'bg-black text-white' : 'border border-black/10 bg-white'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      {tab === 'overview' ? (
        <>
          <section className="grid gap-3 sm:grid-cols-4">
            {[
              { label: 'MRR', value: `$${data.mrr.toLocaleString()}` },
              { label: 'ARR', value: `$${data.arr.toLocaleString()}` },
              { label: 'Active', value: String(data.active) },
              { label: 'At risk', value: String(data.atRisk) },
            ].map((card) => (
              <article key={card.label} className="rounded-2xl border border-black/10 bg-white p-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="flex flex-wrap gap-2">
            {data.planBreakdown.map((plan) => (
              <span
                key={plan.name}
                className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold"
              >
                {plan.name}: {plan.count} · ${plan.mrr.toLocaleString()} MRR
              </span>
            ))}
          </section>

          <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-black/45">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">MRR</th>
                  <th className="px-4 py-3">Renews</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row) => (
                  <tr key={row.id} className="border-t border-black/5">
                    <td className="px-4 py-3 font-semibold">{row.customer}</td>
                    <td className="px-4 py-3">{row.plan}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-3">${row.mrr}</td>
                    <td className="px-4 py-3">{row.renewsAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            Dunning policy: retry failed invoices up to 3 times, then cancel. Actions are stubbed in
            seed mode.
          </div>
          <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-black/45">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Next retry</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.dunning.map((row) => (
                  <tr key={row.id} className="border-t border-black/5">
                    <td className="px-4 py-3 font-semibold">{row.customer}</td>
                    <td className="px-4 py-3">${row.amount}</td>
                    <td className="px-4 py-3">{row.attempts}</td>
                    <td className="px-4 py-3">{row.nextRetryAt}</td>
                    <td className="px-4 py-3">{row.reason}</td>
                    <td className="space-x-2 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setNotice(`Retry queued for ${row.customer} (stub).`)}
                        className="text-xs font-semibold underline"
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotice(`Cancel requested for ${row.customer} (stub).`)}
                        className="text-xs font-semibold text-rose-700 underline"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
