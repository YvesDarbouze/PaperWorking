'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminPageShell } from '@/components/admin/admin-ui';
import {
  getAdminAgentCrewFromBff,
  getAdminLenderChecklistsFromBff,
  getAdminLenderRatesFromBff,
  getAdminRentcastUsageFromBff,
} from '@/lib/admin/admin-api';

interface IntegrationCard {
  id: string;
  name: string;
  description: string;
  status: string;
  detail: string;
  href?: string;
}

export default function AdminIntegrationsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<IntegrationCard[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rentcast, agents, rates, checklists] = await Promise.all([
          getAdminRentcastUsageFromBff(),
          getAdminAgentCrewFromBff(),
          getAdminLenderRatesFromBff(),
          getAdminLenderChecklistsFromBff(),
        ]);
        if (cancelled) return;
        setCards([
          {
            id: 'rentcast',
            name: 'RentCast',
            description: 'Property data API usage telemetry (monthly quota).',
            status: 'live',
            detail: `${rentcast.count ?? 0} / ${rentcast.limit ?? 500} requests this month`,
          },
          {
            id: 'agents',
            name: 'Synthetic agents',
            description: 'QA agent crew for marketplace and impersonation flows.',
            status: 'live',
            detail: `${agents.count ?? 0} agents configured`,
            href: '/admin/agent-crew',
          },
          {
            id: 'lender-rates',
            name: 'Lender rates',
            description: 'Platform-wide lender rate sheet in systemConfig.',
            status: 'live',
            detail: `${rates.rates?.length ?? 0} rate profiles`,
            href: '/admin/lender-config',
          },
          {
            id: 'lender-checklists',
            name: 'Lender checklists',
            description: 'Underwriting checklist templates by loan program.',
            status: 'live',
            detail: `${Object.keys(checklists.checklists ?? {}).length} programs`,
            href: '/admin/lender-config',
          },
        ]);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load integrations');
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

  return (
    <AdminPageShell
      title="Integrations"
      subtitle="External adapters and platform config services."
      actions={
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold"
        >
          Refresh
        </button>
      }
    >
      {loading ? (
        <p className="text-sm text-black/55">Loading integration status…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <article
              key={card.id}
              className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold">{card.name}</h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                  {card.status}
                </span>
              </div>
              <p className="text-sm text-black/60">{card.description}</p>
              <p className="mt-3 text-sm font-semibold">{card.detail}</p>
              {card.href ? (
                <Link
                  href={card.href}
                  className="mt-4 inline-block text-xs font-semibold underline"
                >
                  Open config
                </Link>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </AdminPageShell>
  );
}
