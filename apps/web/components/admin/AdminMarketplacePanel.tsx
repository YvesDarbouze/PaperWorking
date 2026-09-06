'use client';

import Link from 'next/link';
import {
  AdminPageShell,
  AdminStateBlock,
  useAdminOpsSection,
} from '@/components/admin/admin-ui';

interface MarketplacePayload {
  liveVendors: number;
  monthlyVolume: number;
  openPipeline: number;
  matchRate: number;
  avgLatencyHours: number;
  jurisdictionVariance: Array<{ name: string; variance: number }>;
  funnel: Array<{ step: string; count: number }>;
}

export default function AdminMarketplacePanel() {
  const { data, loading, error, reload } = useAdminOpsSection<MarketplacePayload>('marketplace');

  if (loading || error || !data) {
    return (
      <AdminPageShell title="Marketplace" subtitle="Liquidity & jurisdiction variance (seed).">
        <AdminStateBlock loading={loading} error={error} onRetry={reload} />
      </AdminPageShell>
    );
  }

  const maxFunnel = Math.max(...(data.funnel ?? []).map((f) => f.count), 1);

  return (
    <AdminPageShell
      title="Marketplace ops"
      subtitle="Live listing and vendor counts from Firestore."
      actions={
        <>
          <Link
            href="/admin/audit"
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
          >
            Open audit
          </Link>
          <button
            type="button"
            onClick={reload}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
          >
            Refresh
          </button>
        </>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Live vendors', value: String(data.liveVendors) },
          { label: 'Monthly volume', value: `$${(data.monthlyVolume / 1_000_000).toFixed(2)}M` },
          { label: 'Open pipeline', value: String(data.openPipeline) },
          { label: 'Match rate', value: `${data.matchRate}%` },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-black/10 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-black/45">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-white p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-black/45">
            Jurisdiction variance
          </p>
          <ul className="space-y-2 text-sm">
            {(data.jurisdictionVariance ?? []).length === 0 ? (
              <li className="text-black/55">No jurisdiction variance data yet.</li>
            ) : (
              data.jurisdictionVariance.map((row) => (
                <li key={row.name} className="flex justify-between border-b border-black/5 pb-2">
                  <span className="font-semibold">{row.name}</span>
                  <span>{row.variance.toFixed(1)}%</span>
                </li>
              ))
            )}
          </ul>
          <p className="mt-4 rounded-xl bg-black/5 p-3 text-xs text-black/60">
            Avg quote latency {data.avgLatencyHours}h · sample metrics marked for diligence.
          </p>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white p-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-black/45">
            Liquidity funnel
          </p>
          <ul className="space-y-3">
            {(data.funnel ?? []).map((step) => (
              <li key={step.step}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{step.step}</span>
                  <span className="font-semibold">{step.count.toLocaleString()}</span>
                </div>
                <div className="h-2.5 rounded-full bg-black/5">
                  <div
                    className="h-full rounded-full bg-black"
                    style={{ width: `${(step.count / maxFunnel) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </AdminPageShell>
  );
}
