'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AdminOverviewState {
  rentcast?: { count: number; limit: number; year: number; month: number };
  agents?: { count: number };
  rates?: { count: number; updatedByEmail: string | null };
  checklists?: { productCount: number; updatedByEmail: string | null };
}

export default function AdminOverviewPanel() {
  const [data, setData] = useState<AdminOverviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rentcastRes, agentsRes, ratesRes, checklistsRes] = await Promise.all([
          fetch('/api/admin/rentcast-usage', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/admin/agent-crew', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/admin/lender-rates', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/admin/lender-checklists', { credentials: 'include', cache: 'no-store' }),
        ]);

        const rentcast = (await rentcastRes.json()) as AdminOverviewState['rentcast'] & {
          error?: string;
        };
        const agentsBody = (await agentsRes.json()) as { count?: number; error?: string };
        const ratesBody = (await ratesRes.json()) as {
          rates?: unknown[];
          updatedByEmail?: string | null;
          error?: string;
        };
        const checklistsBody = (await checklistsRes.json()) as {
          checklists?: Record<string, unknown>;
          updatedByEmail?: string | null;
          error?: string;
        };

        if (!rentcastRes.ok) throw new Error(rentcast.error ?? 'RentCast usage failed');
        if (!agentsRes.ok) throw new Error(agentsBody.error ?? 'Agent crew failed');
        if (!ratesRes.ok) throw new Error(ratesBody.error ?? 'Lender rates failed');
        if (!checklistsRes.ok) throw new Error(checklistsBody.error ?? 'Checklists failed');

        if (!cancelled) {
          setData({
            rentcast: rentcast as AdminOverviewState['rentcast'],
            agents: { count: agentsBody.count ?? 0 },
            rates: {
              count: ratesBody.rates?.length ?? 0,
              updatedByEmail: ratesBody.updatedByEmail ?? null,
            },
            checklists: {
              productCount: Object.keys(checklistsBody.checklists ?? {}).length,
              updatedByEmail: checklistsBody.updatedByEmail ?? null,
            },
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load admin overview');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 text-sm text-black/55 md:px-8">
        Loading admin overview…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">
        <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-800">
          {error ?? 'Overview unavailable'}
        </div>
        <p className="mt-4 text-sm text-black/60">
          Sign in with{' '}
          <Link href="/login?accountType=admin&redirectTo=/admin" className="underline">
            admin dev session
          </Link>{' '}
          to access this panel.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-4 py-6 md:px-8 md:py-8">
      <section>
        <h2 className="text-3xl font-semibold tracking-[-0.02em]">Command center</h2>
        <p className="mt-2 max-w-[60ch] text-sm text-black/60">
          Read-only admin adapters for lender config, RentCast usage, and synthetic agent crew.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'RentCast calls',
            value: `${data.rentcast?.count ?? 0} / ${data.rentcast?.limit ?? 0}`,
            hint: `${data.rentcast?.month}/${data.rentcast?.year}`,
          },
          { label: 'Synthetic agents', value: String(data.agents?.count ?? 0), hint: 'Active roster' },
          { label: 'Lender rates', value: String(data.rates?.count ?? 0), hint: data.rates?.updatedByEmail ?? '—' },
          {
            label: 'Checklist products',
            value: String(data.checklists?.productCount ?? 0),
            hint: data.checklists?.updatedByEmail ?? '—',
          },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.08em] text-black/45">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold">{item.value}</p>
            <p className="mt-2 text-xs text-black/55">{item.hint}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/agent-crew"
          className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:border-black/20"
        >
          <h3 className="text-lg font-semibold">Agent crew</h3>
          <p className="mt-2 text-sm text-black/60">
            Inspect synthetic agents, impersonate for QA, and delete test personas.
          </p>
        </Link>
        <Link
          href="/admin/lender-config"
          className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:border-black/20"
        >
          <h3 className="text-lg font-semibold">Lender config</h3>
          <p className="mt-2 text-sm text-black/60">
            Review migrated lender rate sheets and checklist definitions.
          </p>
        </Link>
      </section>
    </div>
  );
}
